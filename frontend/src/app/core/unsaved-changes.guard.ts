import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

/** Implemented by pages with a form the user could lose by navigating away. */
export interface HasUnsavedChanges {
  /** True to leave; otherwise asks the user (e.g. a confirm dialog) and emits the answer. */
  canDeactivate(): boolean | Observable<boolean>;
}

/**
 * Asks before leaving a page with unsaved edits. The page owns the question, so
 * this guard (loaded with the routes) stays free of dialog code, which lives in
 * the lazily loaded page instead.
 */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) =>
  component?.canDeactivate() ?? true;
