import { InjectionToken } from '@angular/core';

/**
 * Base path of the Laravel API. Relative on purpose: the dev server proxies
 * `/api` and `/sanctum` to Laravel (see `proxy.conf.json`), so the SPA and the
 * API share an origin. That is what Sanctum's cookie auth and Angular's XSRF
 * handling (which skips absolute URLs) expect.
 */
export const API_URL = new InjectionToken<string>('API_URL', {
  providedIn: 'root',
  factory: () => '/api',
});

/** Sanctum endpoint that sets the XSRF-TOKEN cookie before a login. */
export const CSRF_COOKIE_URL = '/sanctum/csrf-cookie';
