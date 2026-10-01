import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'cpt-theme';

/**
 * Light/dark theme. Follows the OS setting until the user picks one with the
 * toolbar toggle; that choice is remembered in localStorage and applied as
 * `data-theme` on <html> (see styles.scss).
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly window = this.document.defaultView;

  private readonly current = signal<ThemeMode>(this.initialMode());

  readonly mode = this.current.asReadonly();

  constructor() {
    const stored = this.readStored();

    if (stored) {
      this.apply(stored);
    }
  }

  toggle(): void {
    const next: ThemeMode = this.current() === 'dark' ? 'light' : 'dark';

    this.current.set(next);
    this.apply(next);

    try {
      this.window?.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be blocked (private mode); the choice then lasts for this page only.
    }
  }

  private apply(mode: ThemeMode): void {
    this.document.documentElement.setAttribute('data-theme', mode);
  }

  private initialMode(): ThemeMode {
    return (
      this.readStored() ??
      (this.window?.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    );
  }

  private readStored(): ThemeMode | null {
    try {
      const value = this.window?.localStorage.getItem(STORAGE_KEY);

      return value === 'light' || value === 'dark' ? value : null;
    } catch {
      return null;
    }
  }
}
