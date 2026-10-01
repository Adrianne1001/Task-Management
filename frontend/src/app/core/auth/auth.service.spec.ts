import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';

import { User } from '../../models/api';
import { authGuard, guestGuard } from './auth.guards';
import { AuthService } from './auth.service';

const USER: User = { id: 1, name: 'Demo User', email: 'demo@example.com' };

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('fetches the CSRF cookie before logging in', () => {
    let user: User | undefined;
    auth.login({ email: USER.email, password: 'password' }).subscribe((u) => (user = u));

    http.expectOne({ method: 'GET', url: '/sanctum/csrf-cookie' }).flush(null);
    const login = http.expectOne({ method: 'POST', url: '/api/auth/login' });
    expect(login.request.body).toEqual({ email: USER.email, password: 'password' });
    login.flush({ data: USER });

    expect(user).toEqual(USER);
    expect(auth.user()).toEqual(USER);
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('restores the session once and reuses the answer', () => {
    auth.restoreSession().subscribe();
    auth.restoreSession().subscribe();

    http.expectOne('/api/auth/me').flush({ data: USER });

    expect(auth.user()).toEqual(USER);
  });

  it('treats a 401 from /me as signed out', () => {
    let result: User | null | undefined;
    auth.restoreSession().subscribe((user) => (result = user));

    http.expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(result).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('clears the user on logout, even when the request fails', () => {
    auth.restoreSession().subscribe();
    http.expectOne('/api/auth/me').flush({ data: USER });

    auth.logout().subscribe({ error: () => undefined });
    http
      .expectOne({ method: 'POST', url: '/api/auth/logout' })
      .flush(null, { status: 500, statusText: 'Server Error' });

    expect(auth.user()).toBeNull();
  });

  describe('guards', () => {
    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/projects/3/edit' } as RouterStateSnapshot;

    function run(guard: typeof authGuard): Promise<boolean | UrlTree> {
      const result = TestBed.runInInjectionContext(() => guard(route, state));

      return firstValueFrom(result as Observable<boolean | UrlTree>);
    }

    it('authGuard sends signed-out users to /login with a return URL', async () => {
      const result = run(authGuard);
      http.expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });

      expect(String(await result)).toBe('/login?returnUrl=%2Fprojects%2F3%2Fedit');
    });

    it('authGuard lets signed-in users through', async () => {
      const result = run(authGuard);
      http.expectOne('/api/auth/me').flush({ data: USER });

      expect(await result).toBe(true);
    });

    it('guestGuard sends signed-in users to the project list', async () => {
      const result = run(guestGuard);
      http.expectOne('/api/auth/me').flush({ data: USER });

      expect(String(await result)).toBe('/projects');
    });
  });
});
