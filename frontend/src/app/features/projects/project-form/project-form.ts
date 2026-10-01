import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormGroupDirective,
  NgForm,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { ErrorStateMatcher, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { Observable, catchError, map, of, startWith, switchMap } from 'rxjs';

import { ApiError, errorMessage } from '../../../core/http/api-error';
import { NotificationService } from '../../../core/notification.service';
import {
  PROJECT_LIMITS,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  Project,
  ProjectInput,
  ProjectPriority,
  ProjectStatus,
} from '../../../models/project';
import { fromApiDate, toApiDate } from '../../../shared/dates';
import { dateRangeValidator, notBlank } from '../../../shared/validators/project-validators';
import { ProjectService } from '../project.service';

type LoadState =
  | { status: 'ready' }
  | { status: 'loading' }
  | { status: 'error'; message: string; notFound: boolean };

const FIELD_LABELS: Record<string, string> = {
  clientName: 'Client name',
  projectName: 'Project name',
  description: 'Description',
  status: 'Status',
  priority: 'Priority',
  startDate: 'Start date',
  dueDate: 'Due date',
};

const LOADING: LoadState = { status: 'loading' };

const DATE_RANGE_MESSAGE = 'Due date cannot be earlier than the start date.';

/** Shows the form-level date-range error on the Due date field. */
class DueDateErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: AbstractControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const touched = Boolean(control?.touched || form?.submitted);
    const invalid = Boolean(control?.invalid || form?.form.hasError('dateRange'));

    return touched && invalid;
  }
}

/**
 * Create and edit form (`/projects/new`, `/projects/:id/edit`). Client-side
 * validation mirrors the API rules for fast feedback; the API stays the
 * authority, and its 422 field errors are shown on the matching controls.
 */
@Component({
  selector: 'app-project-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './project-form.html',
  styleUrl: './project-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectForm {
  private readonly projectService = inject(ProjectService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  /** Route parameter `:id`, bound by `withComponentInputBinding()`; absent when creating. */
  readonly id = input<string>();

  protected readonly isEdit = computed(() => this.id() !== undefined);
  protected readonly statuses = PROJECT_STATUSES;
  protected readonly priorities = PROJECT_PRIORITIES;
  protected readonly limits = PROJECT_LIMITS;
  protected readonly dueDateMatcher = new DueDateErrorStateMatcher();
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group(
    {
      clientName: [
        '',
        [Validators.required, notBlank, Validators.maxLength(PROJECT_LIMITS.clientName)],
      ],
      projectName: [
        '',
        [Validators.required, notBlank, Validators.maxLength(PROJECT_LIMITS.projectName)],
      ],
      description: ['', Validators.maxLength(PROJECT_LIMITS.description)],
      status: [ProjectStatus.Planning, Validators.required],
      priority: [ProjectPriority.Medium, Validators.required],
      startDate: this.fb.control<Date | null>(null),
      dueDate: this.fb.control<Date | null>(null),
    },
    { validators: dateRangeValidator('startDate', 'dueDate') },
  );

  /**
   * The due date picker starts at the start date. The start picker is left
   * unbounded so a conflict is reported once, on the due date field.
   */
  protected readonly startDate = toSignal(this.form.controls.startDate.valueChanges, {
    initialValue: null,
  });
  protected readonly descriptionLength = toSignal(
    this.form.controls.description.valueChanges.pipe(map((value) => value.length)),
    { initialValue: 0 },
  );

  protected readonly loadState = toSignal(
    toObservable(this.id).pipe(switchMap((id) => this.load(id))),
    { initialValue: LOADING },
  );

  protected submit(): void {
    this.formError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();

      return;
    }

    const id = Number(this.id());
    const input = this.toInput();
    const request$ = this.isEdit()
      ? this.projectService.update(id, input)
      : this.projectService.create(input);

    this.saving.set(true);
    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (project) => {
        this.notifications.success(
          `${this.isEdit() ? 'Updated' : 'Created'} "${project.projectName}".`,
        );
        void this.router.navigate(['/projects']);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.handleSaveError(error);
      },
    });
  }

  /** The message to show under a field, or null when it is valid. */
  protected errorFor(field: keyof typeof this.form.controls): string | null {
    const errors = this.form.controls[field].errors;
    const label = FIELD_LABELS[field];

    if (errors?.['server']) {
      return errors['server'] as string;
    }

    if (errors?.['required']) {
      return `${label} is required.`;
    }

    if (errors?.['maxlength']) {
      return `${label} must not exceed ${errors['maxlength'].requiredLength} characters.`;
    }

    if (errors?.['matDatepickerParse']) {
      return `${label} must be a valid date.`;
    }

    // `matDatepickerMin` is the picker's own copy of the same rule.
    if (field === 'dueDate' && (errors?.['matDatepickerMin'] || this.form.hasError('dateRange'))) {
      return DATE_RANGE_MESSAGE;
    }

    return null;
  }

  private load(id: string | undefined): Observable<LoadState> {
    if (id === undefined) {
      return of({ status: 'ready' });
    }

    const projectId = Number(id);

    if (!Number.isInteger(projectId) || projectId < 1) {
      return of({ status: 'error', message: 'Project not found.', notFound: true });
    }

    return this.projectService.get(projectId).pipe(
      map((project): LoadState => {
        this.fillForm(project);

        return { status: 'ready' };
      }),
      catchError((error: unknown) =>
        of<LoadState>({
          status: 'error',
          message: errorMessage(error),
          notFound: error instanceof ApiError && error.isNotFound,
        }),
      ),
      startWith(LOADING),
    );
  }

  private fillForm(project: Project): void {
    this.form.reset({
      clientName: project.clientName,
      projectName: project.projectName,
      description: project.description ?? '',
      status: project.status,
      priority: project.priority,
      startDate: fromApiDate(project.startDate),
      dueDate: fromApiDate(project.dueDate),
    });
  }

  private toInput(): ProjectInput {
    const value = this.form.getRawValue();

    return {
      clientName: value.clientName.trim(),
      projectName: value.projectName.trim(),
      description: value.description.trim() || null,
      status: value.status,
      priority: value.priority,
      startDate: toApiDate(value.startDate),
      dueDate: toApiDate(value.dueDate),
    };
  }

  private handleSaveError(error: unknown): void {
    if (!(error instanceof ApiError)) {
      this.notifications.error(errorMessage(error));

      return;
    }

    if (!error.isValidation) {
      // Session expiry is handled (and announced) by the interceptor.
      if (error.status !== 401 && error.status !== 419) {
        this.formError.set(error.message);
      }

      return;
    }

    const unmatched: string[] = [];

    for (const [field, messages] of Object.entries(error.fieldErrors)) {
      const control = this.form.get(field);

      if (control) {
        control.setErrors({ ...control.errors, server: messages[0] });
        control.markAsTouched();
      } else {
        unmatched.push(...messages);
      }
    }

    this.formError.set(unmatched.length > 0 ? unmatched.join(' ') : error.message);
    this.focusFirstInvalid();
  }

  /** Moves focus to the first field with an error once the error state has rendered. */
  private focusFirstInvalid(): void {
    afterNextRender(
      () => {
        const root = this.host.nativeElement;
        const target =
          root.querySelector<HTMLElement>('.ng-invalid[formControlName]') ??
          (this.form.hasError('dateRange')
            ? root.querySelector<HTMLElement>('[formControlName="dueDate"]')
            : null);

        target?.focus();
      },
      { injector: this.injector },
    );
  }
}
