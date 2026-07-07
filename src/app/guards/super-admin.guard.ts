import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const superAdminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  const user   = auth.currentUser();
  if (!user) return router.createUrlTree(['/login']);
  if (user.role === 'SUPER_ADMIN') return true;
  return router.createUrlTree(['/dashboard']);
};
