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

  it('does nothing when the deletion is cancelled', async () => {
    confirmed = false;
    const element = await render();

    element.querySelector<HTMLButtonElement>('button[aria-label="Delete Mobile App"]')!.click();
    await harness.fixture.whenStable();

    expect(projects.delete).not.toHaveBeenCalled();
  });
});
