import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

const ADMIN_ONLY_PATHS = new Set(['dashboard', 'news', 'products', 'projects']);

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  const user   = auth.currentUser();
  if (!user) return router.createUrlTree(['/login']);
  if (user.role === 'MEMBER' && ADMIN_ONLY_PATHS.has(route.routeConfig?.path ?? '')) {
    return router.createUrlTree(['/profile']);
  }
  return true;
};
