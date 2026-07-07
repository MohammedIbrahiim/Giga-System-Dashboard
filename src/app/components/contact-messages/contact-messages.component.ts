import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, EMPTY, Subject, merge } from 'rxjs';
import { catchError, distinctUntilChanged, filter, finalize, map, switchMap } from 'rxjs/operators';
import { ContactMessageService } from '../../core/services/contact-message.service';
import {
  ContactMessage, ContactMessageQueryParams, ContactMessageStats, ContactMessageStatus,
  CONTACT_STATUS_OPTIONS,
} from '../../core/models/contact-message.model';
import { ContactMessageViewDialogComponent } from '../contact-message-view-dialog/contact-message-view-dialog.component';
import { DeleteConfirmDialogComponent } from '../delete-confirm-dialog/delete-confirm-dialog.component';
import { FilterBarComponent } from '../../shared/components/filter-bar/filter-bar.component';
import { FilterState, SelectOption } from '../../shared/models/filter.model';

const SNACKBAR = { duration: 3000, panelClass: ['success-snackbar'], horizontalPosition: 'right' as const, verticalPosition: 'top' as const };
const ERR      = { duration: 4000, panelClass: ['error-snackbar'],   horizontalPosition: 'right' as const, verticalPosition: 'top' as const };

@Component({
  selector: 'app-contact-messages',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressBarModule,
    MatPaginatorModule,
    MatSortModule,
    MatMenuModule,
    MatTooltipModule,
    FilterBarComponent,
  ],
  templateUrl: './contact-messages.component.html',
  styleUrls: ['./contact-messages.component.scss'],
})
export class ContactMessagesComponent implements OnInit {
  private readonly service    = inject(ContactMessageService);
  private readonly dialog     = inject(MatDialog);
  private readonly snackBar   = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly messages      = signal<ContactMessage[]>([]);
  readonly loading       = signal(false);
  readonly totalElements = signal(0);
  readonly pageSize      = signal(10);
  readonly pageIndex     = signal(0);
  readonly stats         = signal<ContactMessageStats | null>(null);

  readonly displayedColumns = [
    'index', 'fullName', 'email', 'phone', 'status', 'createdAt', 'actions',
  ];

  readonly statusSelectOptions: SelectOption[] = CONTACT_STATUS_OPTIONS;
  readonly allStatusOptions = CONTACT_STATUS_OPTIONS;

  private readonly query$  = new BehaviorSubject<ContactMessageQueryParams>({
    page: 0, size: 10, sortBy: 'createdAt', sortDir: 'desc',
  });
  private readonly reload$ = new Subject<void>();

  ngOnInit(): void {
    this.loadStats();

    merge(
      this.query$.pipe(distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))),
      this.reload$.pipe(map(() => this.query$.value)),
    ).pipe(
      takeUntilDestroyed(this.destroyRef),
      switchMap(params => {
        this.loading.set(true);
        return this.service.getMessages(params).pipe(
          finalize(() => this.loading.set(false)),
          catchError(() => {
            this.snackBar.open('Failed to load messages', '✕', ERR);
            return EMPTY;
          }),
        );
      }),
    ).subscribe(page => {
      this.messages.set(page.content);
      this.totalElements.set(page.totalElements);
    });
  }

  private loadStats(): void {
    this.service.getStats().pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(() => EMPTY),
    ).subscribe(s => this.stats.set(s));
  }

  // ─── Filters / Pagination / Sort ─────────────────────────────────────────

  onFiltersChange(f: FilterState): void {
    this.pageIndex.set(0);
    this.query$.next({
      ...this.query$.value,
      page:   0,
      search: f.search || undefined,
      status: f.status || undefined,
    });
  }

  onPageChange(e: PageEvent): void {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
    this.query$.next({ ...this.query$.value, page: e.pageIndex, size: e.pageSize });
  }

  onSortChange(e: Sort): void {
    if (!e.direction) return;
    this.query$.next({
      ...this.query$.value, page: 0,
      sortBy: e.active, sortDir: e.direction as 'asc' | 'desc',
    });
  }

  // ─── Actions ────────────────────────────────────────────────────────────

  openViewDialog(msg: ContactMessage): void {
    this.dialog.open(ContactMessageViewDialogComponent, {
      width: '620px',
      maxHeight: '90vh',
      data: { message: msg },
    }).afterClosed().subscribe(changed => {
      if (changed) {
        this.reload();
        this.loadStats();
      }
    });
  }

  onStatusChange(msg: ContactMessage, newStatus: ContactMessageStatus): void {
    if (msg.status === newStatus) return;
    this.service.updateStatus(msg.id, newStatus).subscribe({
      next: () => {
        this.snackBar.open('Contact message status updated successfully', '✕', SNACKBAR);
        this.reload();
        this.loadStats();
      },
      error: () => this.snackBar.open('Failed to update status', '✕', ERR),
    });
  }

  onDelete(msg: ContactMessage): void {
    const fullName = `${msg.firstName} ${msg.lastName}`.trim();
    this.dialog.open(DeleteConfirmDialogComponent, {
      width: '420px',
      data: { name: fullName },
    }).afterClosed().pipe(
      filter(Boolean),
      switchMap(() => this.service.deleteMessage(msg.id)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.snackBar.open('Contact message deleted successfully', '✕', SNACKBAR);
        this.reload();
        this.loadStats();
      },
      error: () => this.snackBar.open('Failed to delete message', '✕', ERR),
    });
  }

  // ─── Display helpers ─────────────────────────────────────────────────────

  fullName(msg: ContactMessage): string {
    return `${msg.firstName} ${msg.lastName}`.trim();
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      NEW:      'badge-new',
      READ:     'badge-read',
      REPLIED:  'badge-replied',
      ARCHIVED: 'badge-archived',
    };
    return map[status] ?? '';
  }

  rowIndex(i: number): number {
    return this.pageIndex() * this.pageSize() + i + 1;
  }

  private reload(): void { this.reload$.next(); }
}
