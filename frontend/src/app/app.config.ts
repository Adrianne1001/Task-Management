import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import {
  ApplicationConfig,
  Injectable,
  inject,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { MAT_ICON_DEFAULT_OPTIONS } from '@angular/material/icon';
import { Title } from '@angular/platform-browser';
import {
  RouterStateSnapshot,
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
} from '@angular/router';

import { routes } from './app.routes';
import { apiErrorInterceptor } from './core/http/api-error.interceptor';

const APP_NAME = 'Client Project Tracker';

/** "Projects · Client Project Tracker" in the browser tab. */
@Injectable({ providedIn: 'root' })
class AppTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const page = this.buildTitle(snapshot);

    this.title.setTitle(page ? `${page} · ${APP_NAME}` : APP_NAME);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    // Rounded Material Icons (font loaded in index.html).
    { provide: MAT_ICON_DEFAULT_OPTIONS, useValue: { fontSet: 'material-icons-round' } },
    provideHttpClient(
      // Sanctum's names, spelled out: Laravel sets the XSRF-TOKEN cookie and
      // expects it back in X-XSRF-TOKEN on every state-changing request.
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
      withInterceptors([apiErrorInterceptor]),
    ),
  ],
};
