import { DOCUMENT, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule, Sort, SortDirection as MatSortDirection } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, ParamMap, Params, Router, RouterLink } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  catchError,
  combineLatest,
  debounceTime,
  filter,
  map,
  of,
  scan,
  startWith,
  switchMap,
} from 'rxjs';

import { errorMessage } from '../../../core/http/api-error';
import { NotificationService } from '../../../core/notification.service';
import {
  PROJECT_LIMITS,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  Project,
  ProjectQuery,
  ProjectStatus,
  ProjectSortField,
  SortDirection,
  toEnumValue,
} from '../../../models/project';
import { PriorityBadge, StatusBadge } from '../../../shared/badges/badges';
import { confirmAction } from '../../../shared/confirm-dialog/confirm-dialog';
import { DueState, avatarTone, dueState, initials } from '../../../shared/project-display';
import { ProjectService } from '../project.service';

type ListState =
  | { status: 'loading'; projects: Project[] }
  | { status: 'loaded'; projects: Project[] }
  | { status: 'error'; projects: Project[]; message: string };

const SORT_FIELDS = Object.values(ProjectSortField);
const SORT_DIRECTIONS = Object.values(SortDirection);
const SEARCH_DEBOUNCE_MS = 300;
const INITIAL_STATE: ListState = { status: 'loading', projects: [] };

/**
 * Lists projects with search, status/priority filters and sortable columns.
 * Filters live in the URL query string, so refresh, back/forward and links
 * keep the current view; the API does the filtering and sorting.
 */
@Component({
  selector: 'app-project-list',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
    PriorityBadge,
    StatusBadge,
  ],
  templateUrl: './project-list.html',
  styleUrl: './project-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onShortcut($event)' },
})
export class ProjectList {
  private readonly projectService = inject(ProjectService);
  private readonly notifications = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  protected readonly statuses = PROJECT_STATUSES;
  protected readonly priorities = PROJECT_PRIORITIES;
  protected readonly searchMaxLength = PROJECT_LIMITS.search;
  protected readonly skeletonRows = [1, 2, 3, 4, 5];
  protected readonly DueState = DueState;
  protected readonly dueState = dueState;
  protected readonly avatarTone = avatarTone;
  protected readonly initials = initials;

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  protected readonly columns = [
    'clientName',
    'projectName',
    'status',
    'priority',
    'startDate',
    'dueDate',
    'actions',
  ];

  protected readonly filters = inject(FormBuilder).nonNullable.group({
    search: '',
    status: '',
    priority: '',
  });

  private readonly reload$ = new BehaviorSubject<void>(undefined);
  private readonly query$ = this.route.queryParamMap.pipe(map(parseQuery));

  protected readonly deletingId = signal<number | null>(null);
  protected readonly query = toSignal(this.query$, { requireSync: true });
  protected readonly hasFilters = computed(() => {
    const { search, status, priority } = this.query();

    return Boolean(search || status || priority);
  });
  protected readonly sortDirection = computed<MatSortDirection>(() => {
    const { sort, direction } = this.query();

    return sort ? (direction ?? SortDirection.Asc) : '';
  });

  protected readonly state = toSignal(
    combineLatest([this.query$, this.reload$]).pipe(
      switchMap(([query]) => this.load(query)),
      // Keep the previous rows while reloading so the table doesn't flicker.
      scan((previous, next) =>
        next.status === 'loading' ? { ...next, projects: previous.projects } : next,
      ),
    ),
    { initialValue: INITIAL_STATE },
  );

  /** Counts for the summary cards, over the projects currently listed. */
  protected readonly summary = computed(() => {
    const { projects } = this.state();
    const today = new Date();

    return {
      total: projects.length,
      inProgress: projects.filter((p) => p.status === ProjectStatus.InProgress).length,
      overdue: projects.filter((p) => dueState(p, today) === DueState.Overdue).length,
      completed: projects.filter((p) => p.status === ProjectStatus.Completed).length,
    };
  });

  constructor() {
    // URL -> form (initial load and back/forward), without re-triggering navigation.
    // Skipped when only whitespace differs, so a trailing space mid-typing survives.
    this.query$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((query) => {
      const current = this.filters.getRawValue();
      const next = {
        search: query.search ?? '',
        status: query.status ?? '',
        priority: query.priority ?? '',
      };

      if (
        current.search.trim() !== next.search ||
        current.status !== next.status ||
        current.priority !== next.priority
      ) {
        this.filters.setValue(next, { emitEvent: false });
      }
    });

    // Form -> URL, debounced so typing in the search box doesn't fire a request per keystroke.
    this.filters.valueChanges
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const { search, status, priority } = this.filters.getRawValue();

        this.updateQuery({
          search: search.trim() || null,
          status: status || null,
          priority: priority || null,
        });
      });
  }

  protected onSortChange(sort: Sort): void {
    const active = sort.direction ? toEnumValue(SORT_FIELDS, sort.active) : undefined;

    this.updateQuery({
      sort: active ?? null,
      direction: active ? sort.direction : null,
    });
  }

  /** Clicking anywhere on a row (except its buttons/links) opens the project. */
  protected openFromRow(project: Project, event: MouseEvent): void {
    const target = event.target as Element | null;

    // Leave buttons and links alone, and don't hijack text selection.
    if (target?.closest('a, button') || this.document.getSelection()?.toString()) {
      return;
    }

    void this.router.navigate(['/projects', project.id, 'edit']);
  }

  /** "/" focuses the search box, unless the user is typing somewhere. */
  protected onShortcut(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const typing =
      target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '');

    if (event.key !== '/' || typing || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    const input = this.searchInput()?.nativeElement;

    if (input) {
      event.preventDefault();
      input.focus();
    }
  }

  protected clearFilters(): void {
    this.filters.setValue({ search: '', status: '', priority: '' });
  }

  protected retry(): void {
    this.reload$.next();
  }

  protected confirmDelete(project: Project): void {
    confirmAction(this.dialog, {
      title: 'Delete project?',
      message: `"${project.projectName}" for ${project.clientName} will be permanently deleted.`,
      confirmLabel: 'Delete',
    })
      .pipe(
        filter(Boolean),
        switchMap(() => {
          this.deletingId.set(project.id);

          return this.projectService.delete(project.id);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.deletingId.set(null);
          this.notifications.success(`Deleted "${project.projectName}".`);
          this.reload$.next();
        },
        error: (error: unknown) => {
          this.deletingId.set(null);
          this.notifications.error(errorMessage(error));
          this.reload$.next();
        },
      });
  }

  private load(query: ProjectQuery): Observable<ListState> {
    return this.projectService.list(query).pipe(
      map((projects): ListState => ({ status: 'loaded', projects })),
      catchError((error: unknown) =>
        of<ListState>({ status: 'error', projects: [], message: errorMessage(error) }),
      ),
      startWith<ListState>(INITIAL_STATE),
    );
  }

  private updateQuery(changes: Params): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: changes,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}

/** Reads the list query from the URL, ignoring anything outside the whitelists. */
function parseQuery(params: ParamMap): ProjectQuery {
  const sort = toEnumValue(SORT_FIELDS, params.get('sort'));
  const search = params.get('search')?.trim().slice(0, PROJECT_LIMITS.search);

  return {
    search: search || undefined,
    status: toEnumValue(PROJECT_STATUSES, params.get('status')),
    priority: toEnumValue(PROJECT_PRIORITIES, params.get('priority')),
    sort,
    direction: sort ? toEnumValue(SORT_DIRECTIONS, params.get('direction')) : undefined,
  };
}
