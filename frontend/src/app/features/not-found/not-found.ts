import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [MatButtonModule, RouterLink],
  template: `
    <section class="not-found">
      <h1>Page not found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <a mat-flat-button routerLink="/projects">Go to projects</a>
    </section>
  `,
  styles: `
    .not-found {
      padding: 48px 16px;
      text-align: center;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFound {}
