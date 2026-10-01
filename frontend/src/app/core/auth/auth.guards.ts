import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from './auth.service';

/** Lets signed-in users through; sends everyone else to /login and back afterwards. */
export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);

  return inject(AuthService)
    .restoreSession()
    .pipe(
      map((user) =>
        user ? true : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }),
      ),
    );
};

/** Keeps signed-in users off the login page. */
export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);

  return inject(AuthService)
    .restoreSession()
    .pipe(map((user) => (user ? router.createUrlTree(['/projects']) : true)));
};
