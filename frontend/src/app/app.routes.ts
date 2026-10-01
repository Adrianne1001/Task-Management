import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth/auth.guards';
import { unsavedChangesGuard } from './core/unsaved-changes.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'projects' },
  {
    path: 'login',
    title: 'Sign in',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'projects',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        title: 'Projects',
        loadComponent: () =>
          import('./features/projects/project-list/project-list').then((m) => m.ProjectList),
      },
      {
        path: 'new',
        title: 'New project',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./features/projects/project-form/project-form').then((m) => m.ProjectForm),
      },
      {
        path: ':id/edit',
        title: 'Edit project',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./features/projects/project-form/project-form').then((m) => m.ProjectForm),
      },
    ],
  },
  {
    path: '**',
    title: 'Page not found',
    loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound),
  },
];
