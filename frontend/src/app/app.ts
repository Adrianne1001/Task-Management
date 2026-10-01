import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

import { AuthService } from './core/auth/auth.service';
import { ThemeService } from './core/theme.service';
import { initials } from './shared/project-display';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);

  protected readonly themeLabel = computed(() =>
    this.theme.mode() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
  );

  protected readonly initials = computed(() => initials(this.auth.user()?.name ?? ''));

  protected logout(): void {
    // The local session is cleared even if the request fails.
    this.auth.logout().subscribe({
      complete: () => void this.router.navigate(['/login']),
      error: () => void this.router.navigate(['/login']),
    });
  }
}
