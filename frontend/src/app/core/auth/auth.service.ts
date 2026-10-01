import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, switchMap, tap } from 'rxjs';

import { Credentials, DataResponse, User } from '../../models/api';
import { API_URL, CSRF_COOKIE_URL } from '../api-url';

/**
 * Sanctum SPA (session cookie) authentication. The browser holds the session
 * and XSRF cookies; this service only tracks who is signed in.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  private readonly currentUser = signal<User | null>(null);
  private sessionCheck$: Observable<User | null> | null = null;

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  /**
   * Resolves the signed-in user, asking the API once per page load. Later calls
   * reuse the result; login/logout keep it up to date.
   */
  restoreSession(): Observable<User | null> {
    this.sessionCheck$ ??= this.http.get<DataResponse<User>>(`${this.apiUrl}/auth/me`).pipe(
      map((response) => response.data),
      catchError(() => of(null)),
      tap((user) => this.currentUser.set(user)),
      shareReplay(1),
    );

    return this.sessionCheck$;
  }

  login(credentials: Credentials): Observable<User> {
    return this.http.get<void>(CSRF_COOKIE_URL).pipe(
      switchMap(() => this.http.post<DataResponse<User>>(`${this.apiUrl}/auth/login`, credentials)),
      map((response) => response.data),
      tap((user) => this.setUser(user)),
    );
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.apiUrl}/auth/logout`, null)
      .pipe(finalize(() => this.clearSession()));
  }

  /** Forgets the user locally, e.g. when the API reports the session expired. */
  clearSession(): void {
    this.setUser(null);
  }

  private setUser(user: User | null): void {
    this.currentUser.set(user);
    this.sessionCheck$ = of(user);
  }
}
