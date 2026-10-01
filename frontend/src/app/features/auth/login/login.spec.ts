import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { ApiError } from '../../../core/http/api-error';
import { Login } from './login';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let element: HTMLElement;
  let auth: { login: ReturnType<typeof vi.fn> };
  let router: Router;

  async function render(returnUrl?: string): Promise<void> {
    fixture = TestBed.createComponent(Login);
    if (returnUrl !== undefined) {
      fixture.componentRef.setInput('returnUrl', returnUrl);
    }
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  function field(name: string): HTMLInputElement {
    return element.querySelector<HTMLInputElement>(`[formControlName="${name}"]`)!;
  }

  async function fill(email: string, password: string): Promise<void> {
    for (const [name, value] of [
      ['email', email],
      ['password', password],
    ]) {
      field(name).value = value;
      field(name).dispatchEvent(new Event('input'));
    }
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  beforeEach(() => {
    auth = { login: vi.fn(() => of({ id: 1, name: 'Demo User', email: 'demo@example.com' })) };
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  it('validates before calling the API', async () => {
    await render();
    await fill('', '');

    const errors = Array.from(element.querySelectorAll('mat-error'), (e) => e.textContent!.trim());
    expect(errors).toEqual(['Email is required.', 'Password is required.']);
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('signs in and goes to the projects page', async () => {
    await render();
    await fill('demo@example.com', 'password');

    expect(auth.login).toHaveBeenCalledWith({ email: 'demo@example.com', password: 'password' });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/projects');
  });

  it('returns to an in-app returnUrl, but never to another site', async () => {
    await render('/projects/3/edit');
    await fill('demo@example.com', 'password');
    expect(router.navigateByUrl).toHaveBeenLastCalledWith('/projects/3/edit');

    await render('//evil.example');
    await fill('demo@example.com', 'password');
    expect(router.navigateByUrl).toHaveBeenLastCalledWith('/projects');
  });

  it('shows the API message for wrong credentials', async () => {
    auth.login.mockReturnValue(
      throwError(
        () =>
          new ApiError(422, 'Invalid.', {
            email: ['These credentials do not match our records.'],
          }),
      ),
    );
    await render();
    await fill('demo@example.com', 'wrong');

    expect(element.querySelector('[role="alert"]')!.textContent).toContain(
      'These credentials do not match our records.',
    );
    expect(element.querySelector('button[type="submit"]')!.hasAttribute('disabled')).toBe(false);
  });

  it('shows and hides the password', async () => {
    await render();
    const toggle = element.querySelector<HTMLButtonElement>('button[aria-label="Show password"]')!;

    expect(field('password').type).toBe('password');
    toggle.click();
    await fixture.whenStable();

    expect(field('password').type).toBe('text');
    expect(toggle.getAttribute('aria-label')).toBe('Hide password');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });
});
