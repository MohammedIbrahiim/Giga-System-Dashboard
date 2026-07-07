import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EMPTY, switchMap } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { UserManagementService } from '../../core/services/user-management.service';
import { AppUser } from '../../core/models/user.model';
import { DeleteConfirmDialogComponent } from '../delete-confirm-dialog/delete-confirm-dialog.component';
import { UserDialogComponent } from '../user-dialog/user-dialog.component';
import { formatBase64Image } from '../../shared/utils/file-base64.util';

const SNACKBAR = { duration: 3000, panelClass: ['success-snackbar'], horizontalPosition: 'right' as const, verticalPosition: 'top' as const };
const ERR      = { duration: 4000, panelClass: ['error-snackbar'],   horizontalPosition: 'right' as const, verticalPosition: 'top' as const };

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressBarModule,
    MatCheckboxModule,
  ],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
})
export class UsersComponent implements OnInit {
  private readonly userService = inject(UserManagementService);
  private readonly dialog      = inject(MatDialog);
  private readonly snackBar    = inject(MatSnackBar);
  private readonly destroyRef  = inject(DestroyRef);

  readonly users   = signal<AppUser[]>([]);
  readonly loading = signal(false);

  readonly displayedColumns = ['index', 'avatar', 'name', 'email', 'role', 'admin', 'createdAt', 'actions'];
  readonly formatImage = formatBase64Image;

  ngOnInit(): void {
    this.userService.refresh$.pipe(
      takeUntilDestroyed(this.destroyRef),
      switchMap(() => {
        this.loading.set(true);
        return this.userService.getUsers().pipe(
          finalize(() => this.loading.set(false)),
          catchError(() => {
            this.snackBar.open('Failed to load users', '✕', ERR);
            return EMPTY;
          }),
        );
      }),
    ).subscribe(users => this.users.set(users));
  }

  getInitials(name: string): string {
    return name.trim().split(/\s+/).map(p => p.charAt(0).toUpperCase()).slice(0, 2).join('');
  }

  getRoleDisplay(role: string): string {
    return role.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  }

  getRoleBadgeClass(role: string): string {
    const map: Record<string, string> = {
      SUPER_ADMIN: 'badge-super-admin',
      ADMIN:       'badge-admin',
      MEMBER:      'badge-member',
    };
    return map[role] ?? '';
  }

  onRoleToggle(user: AppUser, checked: boolean): void {
    this.userService.updateUserRole(user.id, { admin: checked }).subscribe({
      next: updated => {
        this.users.update(list => list.map(u => u.id === updated.id ? updated : u));
        this.snackBar.open(
          `${user.name} is now ${checked ? 'Admin' : 'Member'}`,
          '✕', SNACKBAR,
        );
      },
      error: () => this.snackBar.open('Failed to update role', '✕', ERR),
    });
  }

  openAddDialog(): void {
    this.dialog.open(UserDialogComponent, { width: '520px', data: { mode: 'add' } })
      .afterClosed().subscribe(user => {
        if (user) this.snackBar.open(`User "${user.name}" created!`, '✕', SNACKBAR);
      });
  }

  openEditDialog(user: AppUser): void {
    this.dialog.open(UserDialogComponent, {
      width: '520px',
      data: { mode: 'edit', user },
    }).afterClosed().subscribe(updated => {
      if (updated) this.snackBar.open(`"${updated.name}" updated!`, '✕', SNACKBAR);
    });
  }

  onDelete(user: AppUser): void {
    this.dialog.open(DeleteConfirmDialogComponent, {
      width: '420px',
      data: { name: user.name },
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.userService.deleteUser(user.id).subscribe({
        next: () => {
          this.snackBar.open(`"${user.name}" deleted!`, '✕', SNACKBAR);
          this.userService.triggerRefresh();
        },
        error: () => this.snackBar.open('Failed to delete user', '✕', ERR),
      });
    });
  }
}
