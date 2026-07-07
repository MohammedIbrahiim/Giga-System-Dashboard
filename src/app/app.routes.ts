import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { superAdminGuard } from './guards/super-admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./components/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'news',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/news/news.component').then(m => m.NewsComponent),
  },
  {
    path: 'products',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/products/products.component').then(m => m.ProductsComponent),
  },
  {
    path: 'projects',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/projects/projects.component').then(m => m.ProjectsComponent),
  },
  {
    path: 'partners',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/partners/partners.component').then(m => m.PartnersComponent),
  },
  {
    path: 'quote-requests',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/quote-requests/quote-requests.component').then(m => m.QuoteRequestsComponent),
  },
  {
    path: 'contact-messages',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/contact-messages/contact-messages.component').then(m => m.ContactMessagesComponent),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/profile/profile.component').then(m => m.ProfileComponent),
  },
  {
    path: 'users',
    canActivate: [superAdminGuard],
    loadComponent: () =>
      import('./components/users/users.component').then(m => m.UsersComponent),
  },
];
