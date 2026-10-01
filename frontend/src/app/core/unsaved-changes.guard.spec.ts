import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { of } from 'rxjs';

import { HasUnsavedChanges, unsavedChangesGuard } from './unsaved-changes.guard';

describe('unsavedChangesGuard', () => {
  function run(component: HasUnsavedChanges | null) {
    return unsavedChangesGuard(
      component as HasUnsavedChanges,
      {} as ActivatedRouteSnapshot,
      {} as RouterStateSnapshot,
      {} as RouterStateSnapshot,
    );
  }

  it("returns the page's answer", () => {
    const answer = of(false);

    expect(run({ canDeactivate: () => true })).toBe(true);
    expect(run({ canDeactivate: () => answer })).toBe(answer);
  });

  it('allows leaving when there is no page instance', () => {
    expect(run(null)).toBe(true);
  });
});
