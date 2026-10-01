import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Router, provideRouter } from '@angular/router';
import { Observable, firstValueFrom, of, throwError } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { ApiError } from '../../../core/http/api-error';
import { NotificationService } from '../../../core/notification.service';
import { Project, ProjectPriority, ProjectStatus } from '../../../models/project';
import { ProjectService } from '../project.service';
import { ProjectForm } from './project-form';

const PROJECT: Project = {
  id: 7,
  clientName: 'Acme Corp',
  projectName: 'Website Redesign',
  description: null,
  status: ProjectStatus.OnHold,
  priority: ProjectPriority.High,
  startDate: '2026-03-01',
  dueDate: '2026-05-15',
};

describe('ProjectForm', () => {
  let fixture: ComponentFixture<ProjectForm>;
  let element: HTMLElement;
  let projects: {
    get: ReturnType<typeof vi.fn<(id: number) => Observable<Project>>>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let notifications: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let router: Router;
  let dialog: { open: ReturnType<typeof vi.fn> };
  let dialogAnswer: boolean;
  let signedIn: boolean;

  async function render(id?: string): Promise<void> {
    fixture = TestBed.createComponent(ProjectForm);
    if (id !== undefined) {
      fixture.componentRef.setInput('id', id);
    }
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  function input(name: string): HTMLInputElement {
    return element.querySelector<HTMLInputElement>(`[formControlName="${name}"]`)!;
  }

  async function type(name: string, value: string): Promise<void> {
    const field = input(name);
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  async function submit(): Promise<void> {
    element.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  function errors(): string[] {
    return Array.from(element.querySelectorAll('mat-error'), (e) => e.textContent!.trim());
  }

  beforeEach(() => {
    projects = {
      get: vi.fn(() => of(PROJECT)),
      create: vi.fn(() => of({ ...PROJECT, id: 13 })),
      update: vi.fn(() => of(PROJECT)),
    };
    notifications = { success: vi.fn(), error: vi.fn() };
    dialogAnswer = false;
    signedIn = true;
    dialog = { open: vi.fn(() => ({ afterClosed: () => of(dialogAnswer) })) };

    TestBed.configureTestingModule({
      imports: [ProjectForm],
      providers: [
        provideRouter([]),
        { provide: ProjectService, useValue: projects },
        { provide: NotificationService, useValue: notifications },
        { provide: MatDialog, useValue: dialog },
        { provide: AuthService, useValue: { isAuthenticated: () => signedIn } },
      ],
    });
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  describe('create mode', () => {
    beforeEach(() => render());

    it('requires client and project names', async () => {
      await submit();

      expect(errors()).toEqual(['Client name is required.', 'Project name is required.']);
      expect(projects.create).not.toHaveBeenCalled();
    });

    it('treats whitespace-only names as missing', async () => {
      await type('clientName', '   ');
      await type('projectName', '\t');
      await submit();

      expect(errors()).toEqual(['Client name is required.', 'Project name is required.']);
    });

    it('focuses the first invalid field on submit', async () => {
      await type('projectName', 'Website');
      await submit();

      expect(document.activeElement).toBe(input('clientName'));
    });

    it('rejects a due date before the start date', async () => {
      await type('clientName', 'Acme');
      await type('projectName', 'Website');
      await type('startDate', '5/10/2026');
      await type('dueDate', '5/9/2026');
      await submit();

      expect(errors()).toEqual(['Due date cannot be earlier than the start date.']);
      expect(projects.create).not.toHaveBeenCalled();
    });

    it('creates the project with a clean API payload', async () => {
      await type('clientName', '  Acme Corp ');
      await type('projectName', 'Website Redesign');
      await type('description', '   ');
      await type('startDate', '3/1/2026');
      await type('dueDate', '3/1/2026');
      await submit();

      expect(projects.create).toHaveBeenCalledWith({
        clientName: 'Acme Corp',
        projectName: 'Website Redesign',
        description: null,
        status: ProjectStatus.Planning,
        priority: ProjectPriority.Medium,
        startDate: '2026-03-01',
        dueDate: '2026-03-01',
      });
      expect(notifications.success).toHaveBeenCalledWith('Created "Website Redesign".');
      expect(router.navigate).toHaveBeenCalledWith(['/projects']);
    });

    it('reports unsaved changes until the project is saved', async () => {
      expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);

      await type('clientName', 'Acme');
      await type('projectName', 'Website');
      expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);

      await submit();
      expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
    });

    it('keeps reporting unsaved changes when saving fails', async () => {
      projects.create.mockReturnValue(throwError(() => new ApiError(500, 'Something went wrong.')));
      await type('clientName', 'Acme');
      await type('projectName', 'Website');
      await submit();

      expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
    });

    it('asks before leaving with unsaved changes', async () => {
      await type('clientName', 'Acme');

      dialogAnswer = false;
      expect(
        await firstValueFrom(fixture.componentInstance.canDeactivate() as Observable<boolean>),
      ).toBe(false);
      dialogAnswer = true;
      expect(
        await firstValueFrom(fixture.componentInstance.canDeactivate() as Observable<boolean>),
      ).toBe(true);
      expect(dialog.open).toHaveBeenCalledTimes(2);
    });

    it('leaves without asking when nothing changed or the session has ended', async () => {
      expect(fixture.componentInstance.canDeactivate()).toBe(true);

      await type('clientName', 'Acme');
      signedIn = false;
      expect(fixture.componentInstance.canDeactivate()).toBe(true);
      expect(dialog.open).not.toHaveBeenCalled();
    });

    it('allows both dates to be empty', async () => {
      await type('clientName', 'Acme');
      await type('projectName', 'Website');
      await submit();

      expect(projects.create).toHaveBeenCalledWith(
        expect.objectContaining({ startDate: null, dueDate: null }),
      );
    });

    it('shows API validation errors on the matching fields', async () => {
      projects.create.mockReturnValue(
        throwError(
          () =>
            new ApiError(422, 'The due date field must be a date after or equal to start date.', {
              dueDate: ['The due date field must be a date after or equal to start date.'],
            }),
        ),
      );
      await type('clientName', 'Acme');
      await type('projectName', 'Website');
      await submit();

      expect(errors()).toEqual(['The due date field must be a date after or equal to start date.']);
      expect(router.navigate).not.toHaveBeenCalled();
      expect(element.querySelector('button[type="submit"]')!.hasAttribute('disabled')).toBe(false);
    });

    it('shows other API failures above the form', async () => {
      projects.create.mockReturnValue(throwError(() => new ApiError(500, 'Something went wrong.')));
      await type('clientName', 'Acme');
      await type('projectName', 'Website');
      await submit();

      expect(element.querySelector('.form-error')!.textContent).toContain('Something went wrong.');
    });
  });

  describe('edit mode', () => {
    it('loads the project into the form and saves with PUT', async () => {
      await render('7');

      expect(projects.get).toHaveBeenCalledWith(7);
      expect(input('clientName').value).toBe('Acme Corp');
      expect(element.querySelector('h1')!.textContent).toContain('Edit project');
      // Loading the project doesn't count as an edit.
      expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);

      await type('projectName', 'Website Relaunch');
      await submit();

      expect(projects.update).toHaveBeenCalledWith(
        7,
        expect.objectContaining({
          projectName: 'Website Relaunch',
          status: ProjectStatus.OnHold,
          startDate: '2026-03-01',
          dueDate: '2026-05-15',
        }),
      );
      expect(notifications.success).toHaveBeenCalledWith('Updated "Website Redesign".');
    });

    it('shows a not-found state for a missing project', async () => {
      projects.get.mockReturnValue(throwError(() => new ApiError(404, 'Project not found.')));
      await render('99');

      expect(element.querySelector('[role="alert"]')!.textContent).toContain('Project not found.');
      expect(element.querySelector('form')).toBeNull();
    });

    it('does not call the API for a non-numeric id', async () => {
      await render('abc');

      expect(projects.get).not.toHaveBeenCalled();
      expect(element.querySelector('[role="alert"]')!.textContent).toContain('Project not found.');
    });
  });
});
