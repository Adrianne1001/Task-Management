import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatInputHarness } from '@angular/material/input/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { MatSortHarness } from '@angular/material/sort/testing';
import { MatTableHarness } from '@angular/material/table/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { ApiError } from '../../../core/http/api-error';
import { NotificationService } from '../../../core/notification.service';
import { Project, ProjectPriority, ProjectStatus } from '../../../models/project';
import { ProjectService } from '../project.service';
import { ProjectList } from './project-list';

const PROJECTS: Project[] = [
  {
    id: 1,
    clientName: 'Acme Corp',
    projectName: 'Website Redesign',
    description: 'New site',
    status: ProjectStatus.InProgress,
    priority: ProjectPriority.High,
    startDate: '2026-03-01',
    dueDate: '2026-05-15',
  },
  {
    id: 2,
    clientName: 'Globex',
    projectName: 'Mobile App',
    description: null,
    status: ProjectStatus.Planning,
    priority: ProjectPriority.Low,
    startDate: null,
    dueDate: null,
  },
];

describe('ProjectList', () => {
  let harness: RouterTestingHarness;
  let loader: HarnessLoader;
  let projects: { list: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
  let notifications: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let confirmed: boolean;

  async function render(url = '/projects'): Promise<HTMLElement> {
    harness = await RouterTestingHarness.create(url);
    loader = TestbedHarnessEnvironment.loader(harness.fixture);
    await harness.fixture.whenStable();

    return harness.routeNativeElement!;
  }

  function currentUrl(): string {
    return TestBed.inject(Router).url;
  }

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  beforeEach(() => {
    projects = { list: vi.fn(() => of(PROJECTS)), delete: vi.fn(() => of(undefined)) };
    notifications = { success: vi.fn(), error: vi.fn() };
    confirmed = true;

    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'projects', component: ProjectList }]),
        { provide: ProjectService, useValue: projects },
        { provide: NotificationService, useValue: notifications },
        {
          provide: MatDialog,
          useValue: { open: () => ({ afterClosed: () => of(confirmed) }) },
        },
      ],
    });
  });

  it('shows each project with its badges', async () => {
    await render();

    const table = await loader.getHarness(MatTableHarness);
    const rows = await table.getCellTextByColumnName();

    expect(rows['clientName'].text).toEqual(['Acme Corp', 'Globex']);
    expect(rows['status'].text).toEqual(['In Progress', 'Planning']);
    expect(rows['priority'].text).toEqual(['High', 'Low']);
    expect(rows['dueDate'].text).toEqual(['May 15, 2026', '—']);
  });

  it('loads filters from the URL, ignoring values outside the whitelists', async () => {
    await render('/projects?status=On%20Hold&priority=Urgent&sort=dueDate&direction=desc');

    expect(projects.list).toHaveBeenCalledWith({
      search: undefined,
      status: ProjectStatus.OnHold,
      priority: undefined,
      sort: 'dueDate',
      direction: 'desc',
    });
  });

  it('applies a status filter through the URL', async () => {
    await render();

    const status = await loader.getHarness(
      MatSelectHarness.with({ selector: '[formControlName="status"]' }),
    );
    await status.clickOptions({ text: 'On Hold' });
    await wait(350);
    await harness.fixture.whenStable();

    expect(currentUrl()).toBe('/projects?status=On%20Hold');
    expect(projects.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: ProjectStatus.OnHold }),
    );
  });

  it('debounces the search box', async () => {
    await render();

    const search = await loader.getHarness(MatInputHarness.with({ selector: '[type="search"]' }));
    await search.setValue('acme');
    expect(currentUrl()).toBe('/projects');

    await wait(350);
    await harness.fixture.whenStable();
    expect(currentUrl()).toBe('/projects?search=acme');
  });

  it('sorts on the server when a column header is clicked', async () => {
    await render();

    const sort = await loader.getHarness(MatSortHarness);
    const [, projectHeader] = await sort.getSortHeaders();
    await projectHeader.click();
    await harness.fixture.whenStable();

    expect(currentUrl()).toBe('/projects?sort=projectName&direction=asc');
  });

  it('shows an empty state with a create link', async () => {
    projects.list.mockReturnValue(of([]));
    const element = await render();

    expect(element.textContent).toContain('No projects yet.');
    expect(element.querySelector('a[href="/projects/new"]')).not.toBeNull();
  });

  it('shows a filtered empty state', async () => {
    projects.list.mockReturnValue(of([]));
    const element = await render('/projects?search=zzz');

    expect(element.textContent).toContain('No projects match these filters.');
  });

  it('shows an error with a retry button', async () => {
    projects.list.mockReturnValueOnce(throwError(() => new ApiError(500, 'Server is down.')));
    const element = await render();

    expect(element.querySelector('[role="alert"]')!.textContent).toContain('Server is down.');

    element.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    await harness.fixture.whenStable();

    expect(projects.list).toHaveBeenCalledTimes(2);
    expect(element.querySelector('[role="alert"]')).toBeNull();
  });

  it('deletes a project after confirmation and reloads the list', async () => {
    const element = await render();

    element.querySelector<HTMLButtonElement>('button[aria-label="Delete Mobile App"]')!.click();
    await harness.fixture.whenStable();

    expect(projects.delete).toHaveBeenCalledWith(2);
    expect(notifications.success).toHaveBeenCalledWith('Deleted "Mobile App".');
    expect(projects.list).toHaveBeenCalledTimes(2);
  });

  describe('at a fixed date', () => {
    beforeEach(() => {
      // Only Date is faked, so debounce timers elsewhere keep working.
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 5, 1)); // 1 Jun 2026: Acme's 15 May due date has passed
    });

    afterEach(() => vi.useRealTimers());

    it('summarises the listed projects', async () => {
      const element = await render();
      const stats = Array.from(element.querySelectorAll('.stat__text'), (stat) => [
        stat.querySelector('.stat__value')!.textContent!.trim(),
        stat.querySelector('.stat__label')!.textContent!.trim(),
      ]);

      expect(stats).toEqual([
        ['2', 'Projects'],
        ['1', 'In progress'],
        ['1', 'Overdue'],
        ['0', 'Completed'],
      ]);
    });

    it('tags overdue projects without changing the date text', async () => {
      const element = await render();
      const rows = element.querySelectorAll('tr.project-row');

      expect(rows[0].querySelector('.due-tag')!.textContent).toContain('Overdue');
      expect(rows[0].querySelector('.date-cell--overdue')!.textContent!.trim()).toBe(
        'May 15, 2026',
      );
      expect(rows[1].querySelector('.due-tag')).toBeNull();
    });
  });

  it('opens a project when its row is clicked, but not from its buttons', async () => {
    const element = await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    element.querySelectorAll<HTMLElement>('tr.project-row td.mat-column-projectName')[1].click();
    expect(navigate).toHaveBeenCalledWith(['/projects', 2, 'edit']);

    navigate.mockClear();
    confirmed = false;
    element.querySelector<HTMLButtonElement>('button[aria-label="Delete Mobile App"]')!.click();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('focuses the search box when "/" is pressed outside a field', async () => {
    const element = await render();
    const search = element.querySelector<HTMLInputElement>('input[type="search"]')!;

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));
    expect(document.activeElement).toBe(search);

    // Typing "/" inside a field is left alone.
    search.blur();
    const event = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true });
    search.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('does nothing when the deletion is cancelled', async () => {
    confirmed = false;
    const element = await render();

    element.querySelector<HTMLButtonElement>('button[aria-label="Delete Mobile App"]')!.click();
    await harness.fixture.whenStable();

    expect(projects.delete).not.toHaveBeenCalled();
  });
});
