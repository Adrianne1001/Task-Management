import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { NotificationService } from '../notification.service';
import { ApiError } from './api-error';

/** Session-expired statuses: 401 (no session) and 419 (CSRF token mismatch). */
const SESSION_EXPIRED = new Set([401, 419]);

/** Auth calls report a missing session as a normal result, not an expiry. */
const AUTH_ENDPOINTS = /\/auth\/(me|login)$/;

/**
 * Turns every HTTP failure into an {@link ApiError} with a friendly message.
 * When the session expires mid-use, it signs the user out locally and sends
 * them to the login page, returning to the current page afterwards.
 */
export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notifications = inject(NotificationService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      const apiError = ApiError.fromResponse(error);

      if (SESSION_EXPIRED.has(error.status) && !AUTH_ENDPOINTS.test(request.url)) {
        auth.clearSession();
        notifications.error(apiError.message);
        void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
      }

      return throwError(() => apiError);
    }),
  );
};
