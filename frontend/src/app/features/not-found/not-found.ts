import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [MatButtonModule, MatIconModule, RouterLink],
  template: `
    <section class="not-found card state">
      <span class="state__icon" aria-hidden="true"><mat-icon>explore_off</mat-icon></span>
      <p class="code" aria-hidden="true">404</p>
      <h1>Page not found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <a mat-flat-button class="state__actions" routerLink="/projects">
        <mat-icon aria-hidden="true">arrow_back</mat-icon>
        Go to projects
      </a>
    </section>
  `,
  styles: `
    .not-found {
      max-width: 520px;
      margin: 32px auto 0;
      padding: 56px 24px;
    }

    .code {
      color: var(--mat-sys-primary);
      font: var(--mat-sys-display-small);
      font-weight: 700;
      letter-spacing: -0.04em;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFound {}
