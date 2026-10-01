import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { AuthService } from './core/auth/auth.service';

describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  it('hides the account menu until someone signs in', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Client Project Tracker');
    expect(fixture.nativeElement.textContent).not.toContain('Sign out');
  });

  it("shows the signed-in user's name and a sign-out button", async () => {
    const auth = TestBed.inject(AuthService);
    auth.restoreSession().subscribe();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/auth/me')
      .flush({ data: { id: 1, name: 'Demo User', email: 'demo@example.com' } });

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Demo User');
    expect(fixture.nativeElement.textContent).toContain('Sign out');
  });
});
