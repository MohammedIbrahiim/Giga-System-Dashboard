import { Component, HostListener, inject, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AppStateService } from './services/app-state.service';
import { AuthService } from './services/auth.service';
import { UserDialogComponent } from './components/user-dialog/user-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    NgIf,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    MatBadgeModule,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  private readonly router   = inject(Router);
  protected readonly appState  = inject(AppStateService);
  protected readonly auth      = inject(AuthService);
  private readonly dialog   = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly isDesktop  = signal(window.innerWidth >= 960);
  readonly isLoginPage = signal(window.location.pathname === '/login');

  constructor() {
    if (window.innerWidth < 960) {
      this.appState.setSidebar(false);
    }
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e) => {
        const url = (e as NavigationEnd).urlAfterRedirects;
        this.isLoginPage.set(url === '/login');
        if (!this.isDesktop()) {
          this.appState.setSidebar(false);
        }
      });
  }

  @HostListener('window:resize')
  onResize(): void {
    const desktop = window.innerWidth >= 960;
    this.isDesktop.set(desktop);
    if (desktop) this.appState.setSidebar(true);
  }

  get sidebarMode(): 'side' | 'over' {
    return this.isDesktop() ? 'side' : 'over';
  }

  get isSuperAdmin(): boolean {
    return this.auth.currentUser()?.role === 'SUPER_ADMIN';
  }

  openAddUserDialog(): void {
    this.dialog.open(UserDialogComponent, {
      width: '520px',
      data: { mode: 'add' },
    }).afterClosed().subscribe(user => {
      if (user) {
        this.snackBar.open(`User "${user.name}" created successfully!`, '✕', {
          duration: 3000,
          panelClass: ['success-snackbar'],
          horizontalPosition: 'right',
          verticalPosition: 'top',
        });
      }
    });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
