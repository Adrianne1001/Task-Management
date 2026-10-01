import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  const root = document.documentElement;

  beforeEach(() => {
    localStorage.clear();
    root.removeAttribute('data-theme');
  });

  afterEach(() => {
    localStorage.clear();
    root.removeAttribute('data-theme');
  });

  it('follows the OS setting (no data-theme) until the user chooses', () => {
    const theme = TestBed.inject(ThemeService);

    expect(theme.mode()).toBe('light');
    expect(root.hasAttribute('data-theme')).toBe(false);
  });

  it('toggles, applies and remembers the choice', () => {
    const theme = TestBed.inject(ThemeService);

    theme.toggle();
    expect(theme.mode()).toBe('dark');
    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('cpt-theme')).toBe('dark');

    theme.toggle();
    expect(theme.mode()).toBe('light');
    expect(root.getAttribute('data-theme')).toBe('light');
  });

  it('restores a stored choice on start', () => {
    localStorage.setItem('cpt-theme', 'dark');

    const theme = TestBed.inject(ThemeService);

    expect(theme.mode()).toBe('dark');
    expect(root.getAttribute('data-theme')).toBe('dark');
  });

  it('ignores unknown stored values', () => {
    localStorage.setItem('cpt-theme', 'purple');

    expect(TestBed.inject(ThemeService).mode()).toBe('light');
  });
});
