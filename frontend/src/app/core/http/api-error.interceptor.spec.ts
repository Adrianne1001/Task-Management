import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AuthService } from '../auth/auth.service';
import { NotificationService } from '../notification.service';
import { ApiError } from './api-error';
import { apiErrorInterceptor } from './api-error.interceptor';

describe('apiErrorInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let router: Router;
  let auth: AuthService;
  let notifications: { error: ReturnType<typeof vi.fn>; success: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    notifications = { error: vi.fn(), success: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NotificationService, useValue: notifications },
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    auth = TestBed.inject(AuthService);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => http.verify());

  function request(url: string, status: number, body: object | null = null): unknown {
    let caught: unknown;
    client.get(url).subscribe({ error: (error: unknown) => (caught = error) });
    http.expectOne(url).flush(body, { status, statusText: 'Error' });

    return caught;
  }

  it('rethrows HTTP failures as ApiError', () => {
    const error = request('/api/projects/99', 404, { message: 'Project not found.' });

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe('Project not found.');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it.each([401, 419])('signs out and redirects to /login on %i', (status) => {
    const clearSession = vi.spyOn(auth, 'clearSession');

    request('/api/projects', status);

    expect(clearSession).toHaveBeenCalled();
    expect(notifications.error).toHaveBeenCalledWith(
      expect.stringContaining('session has expired'),
    );
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/' } });
  });

  it('does not redirect for the session check or a failed login', () => {
    request('/api/auth/me', 401);
    request('/api/auth/login', 401);

    expect(router.navigate).not.toHaveBeenCalled();
  });
});
