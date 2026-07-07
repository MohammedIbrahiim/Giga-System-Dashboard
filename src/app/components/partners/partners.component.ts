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
import { PartnerService } from '../../core/services/partner.service';
import { Partner, PartnerQueryParams } from '../../core/models/partner.model';
import { PartnerDialogComponent } from '../partner-dialog/partner-dialog.component';
import { PartnerViewDialogComponent } from '../partner-view-dialog/partner-view-dialog.component';
import { DeleteConfirmDialogComponent } from '../delete-confirm-dialog/delete-confirm-dialog.component';
import { FilterBarComponent } from '../../shared/components/filter-bar/filter-bar.component';
import { FilterState, SelectOption } from '../../shared/models/filter.model';
import { formatBase64Image } from '../../shared/utils/file-base64.util';

const SNACKBAR = { duration: 3000, panelClass: ['success-snackbar'], horizontalPosition: 'right' as const, verticalPosition: 'top' as const };
const ERR      = { duration: 4000, panelClass: ['error-snackbar'],   horizontalPosition: 'right' as const, verticalPosition: 'top' as const };

@Component({
  selector: 'app-partners',
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
  templateUrl: './partners.component.html',
  styleUrls: ['./partners.component.scss'],
})
export class PartnersComponent implements OnInit {
  private readonly partnerService = inject(PartnerService);
  private readonly dialog         = inject(MatDialog);
  private readonly snackBar       = inject(MatSnackBar);
  private readonly destroyRef     = inject(DestroyRef);

  readonly partners      = signal<Partner[]>([]);
  readonly loading       = signal(false);
  readonly totalElements = signal(0);
  readonly pageSize      = signal(10);
  readonly pageIndex     = signal(0);

  readonly displayedColumns = [
    'index', 'logo', 'name', 'slug', 'status', 'sortOrder', 'offers', 'actions',
  ];

  readonly statusSelectOptions: SelectOption[] = [
    { value: 'true',  label: 'Active' },
    { value: 'false', label: 'Inactive' },
  ];

  readonly formatImage = formatBase64Image;

  private readonly query$  = new BehaviorSubject<PartnerQueryParams>({
    page: 0, size: 10, sortBy: 'sortOrder', sortDir: 'asc',
  });
  private readonly reload$ = new Subject<void>();

  ngOnInit(): void {
    merge(
      this.query$.pipe(distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))),
      this.reload$.pipe(map(() => this.query$.value)),
    ).pipe(
      takeUntilDestroyed(this.destroyRef),
      switchMap(params => {
        this.loading.set(true);
        return this.partnerService.getPartners(params).pipe(
          finalize(() => this.loading.set(false)),
          catchError(() => {
            this.snackBar.open('Failed to load partners', '✕', ERR);
            return EMPTY;
          }),
        );
      }),
    ).subscribe(page => {
      this.partners.set(page.content);
      this.totalElements.set(page.totalElements);
    });
  }

  // ─── Filters / Pagination / Sort ─────────────────────────────────────────

  onFiltersChange(f: FilterState): void {
    this.pageIndex.set(0);
    this.query$.next({
      ...this.query$.value,
      page:   0,
      search: f.search || undefined,
      active: f.status !== '' ? f.status === 'true' : undefined,
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

  // ─── CRUD ────────────────────────────────────────────────────────────────

  openAddDialog(): void {
    this.dialog.open(PartnerDialogComponent, { width: '680px', data: { mode: 'add' } })
      .afterClosed().subscribe(partner => {
        if (partner) {
          this.snackBar.open(`"${partner.name}" created!`, '✕', SNACKBAR);
          this.reload();
        }
      });
  }

  openEditDialog(partner: Partner): void {
    this.dialog.open(PartnerDialogComponent, {
      width: '680px',
      data: { mode: 'edit', partner },
    }).afterClosed().subscribe(updated => {
      if (updated) {
        this.snackBar.open(`"${updated.name}" updated!`, '✕', SNACKBAR);
        this.reload();
      }
    });
  }

  openViewDialog(partner: Partner): void {
    this.dialog.open(PartnerViewDialogComponent, {
      width: '680px',
      data: { partner },
    });
  }

  onDelete(partner: Partner): void {
    this.dialog.open(DeleteConfirmDialogComponent, {
      width: '420px',
      data: { name: partner.name },
    }).afterClosed().pipe(
      filter(Boolean),
      switchMap(() => this.partnerService.deletePartner(partner.id)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.snackBar.open(`"${partner.name}" deleted!`, '✕', SNACKBAR);
        this.reload();
      },
      error: () => this.snackBar.open('Failed to delete partner', '✕', ERR),
    });
  }

  // ─── Display helpers ─────────────────────────────────────────────────────

  getStatusClass(active: boolean): string {
    return active ? 'badge-active' : 'badge-inactive';
  }

  getStatusLabel(active: boolean): string {
    return active ? 'Active' : 'Inactive';
  }

  rowIndex(i: number): number {
    return this.pageIndex() * this.pageSize() + i + 1;
  }

  private reload(): void { this.reload$.next(); }
}
