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
import { QuoteRequestService } from '../../core/services/quote-request.service';
import {
  QuoteRequest, QuoteRequestQueryParams, QuoteRequestStats, QuoteStatus,
  QUOTE_STATUS_OPTIONS, QUOTE_CATEGORY_OPTIONS, CATEGORY_LABEL,
} from '../../core/models/quote-request.model';
import { QuoteRequestViewDialogComponent } from '../quote-request-view-dialog/quote-request-view-dialog.component';
import { DeleteConfirmDialogComponent } from '../delete-confirm-dialog/delete-confirm-dialog.component';
import { FilterBarComponent } from '../../shared/components/filter-bar/filter-bar.component';
import { FilterState, SelectOption } from '../../shared/models/filter.model';

const SNACKBAR = { duration: 3000, panelClass: ['success-snackbar'], horizontalPosition: 'right' as const, verticalPosition: 'top' as const };
const ERR      = { duration: 4000, panelClass: ['error-snackbar'],   horizontalPosition: 'right' as const, verticalPosition: 'top' as const };

@Component({
  selector: 'app-quote-requests',
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
  templateUrl: './quote-requests.component.html',
  styleUrls: ['./quote-requests.component.scss'],
})
export class QuoteRequestsComponent implements OnInit {
  private readonly service    = inject(QuoteRequestService);
  private readonly dialog     = inject(MatDialog);
  private readonly snackBar   = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly quotes        = signal<QuoteRequest[]>([]);
  readonly loading       = signal(false);
  readonly totalElements = signal(0);
  readonly pageSize      = signal(10);
  readonly pageIndex     = signal(0);
  readonly stats         = signal<QuoteRequestStats | null>(null);

  readonly displayedColumns = [
    'index', 'fullName', 'company', 'email', 'phone',
    'country', 'industry', 'category', 'status', 'createdAt', 'actions',
  ];

  readonly statusSelectOptions: SelectOption[] = QUOTE_STATUS_OPTIONS;
  readonly categorySelectOptions: SelectOption[] = QUOTE_CATEGORY_OPTIONS;
  readonly allStatusOptions = QUOTE_STATUS_OPTIONS;
  readonly categoryLabel = CATEGORY_LABEL;

  private readonly query$  = new BehaviorSubject<QuoteRequestQueryParams>({
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
        return this.service.getQuoteRequests(params).pipe(
          finalize(() => this.loading.set(false)),
          catchError(() => {
            this.snackBar.open('Failed to load quote requests', '✕', ERR);
            return EMPTY;
          }),
        );
      }),
    ).subscribe(page => {
      this.quotes.set(page.content);
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
      page:     0,
      search:   f.search   || undefined,
      status:   f.status   || undefined,
      category: f.category || undefined,
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

  openViewDialog(quote: QuoteRequest): void {
    this.dialog.open(QuoteRequestViewDialogComponent, {
      width: '760px',
      maxHeight: '90vh',
      data: { quote },
    }).afterClosed().subscribe(updatedStatus => {
      if (updatedStatus) {
        this.reload();
        this.loadStats();
      }
    });
  }

  onStatusChange(quote: QuoteRequest, newStatus: QuoteStatus): void {
    if (quote.status === newStatus) return;
    this.service.updateStatus(quote.id, newStatus).subscribe({
      next: () => {
        this.snackBar.open('Quote request status updated successfully', '✕', SNACKBAR);
        this.reload();
        this.loadStats();
      },
      error: () => this.snackBar.open('Failed to update status', '✕', ERR),
    });
  }

  onDelete(quote: QuoteRequest): void {
    this.dialog.open(DeleteConfirmDialogComponent, {
      width: '420px',
      data: { name: quote.fullName },
    }).afterClosed().pipe(
      filter(Boolean),
      switchMap(() => this.service.deleteQuoteRequest(quote.id)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.snackBar.open('Quote request deleted successfully', '✕', SNACKBAR);
        this.reload();
        this.loadStats();
      },
      error: () => this.snackBar.open('Failed to delete quote request', '✕', ERR),
    });
  }

  // ─── Display helpers ─────────────────────────────────────────────────────

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      NEW:       'badge-new',
      REVIEWED:  'badge-reviewed',
      CONTACTED: 'badge-contacted',
      CLOSED:    'badge-closed',
    };
    return map[status] ?? '';
  }

  getCategoryLabel(cat: string): string {
    return CATEGORY_LABEL[cat] ?? cat;
  }

  rowIndex(i: number): number {
    return this.pageIndex() * this.pageSize() + i + 1;
  }

  private reload(): void { this.reload$.next(); }
}
