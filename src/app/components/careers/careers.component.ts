import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, EMPTY, Subject, merge } from 'rxjs';
import { catchError, distinctUntilChanged, filter, finalize, map, switchMap } from 'rxjs/operators';
import { CareerService } from '../../core/services/career.service';
import { CareerJob, CareerQueryParams } from '../../core/models/career.model';
import { CareerDialogComponent } from '../career-dialog/career-dialog.component';
import { DeleteConfirmDialogComponent } from '../delete-confirm-dialog/delete-confirm-dialog.component';
import { FilterBarComponent } from '../../shared/components/filter-bar/filter-bar.component';
import { FilterState } from '../../shared/models/filter.model';

const SNACKBAR = { duration: 3000, panelClass: ['success-snackbar'], horizontalPosition: 'right' as const, verticalPosition: 'top' as const };
const ERR      = { duration: 4000, panelClass: ['error-snackbar'],   horizontalPosition: 'right' as const, verticalPosition: 'top' as const };

@Component({
  selector: 'app-careers',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressBarModule,
    MatPaginatorModule,
    MatMenuModule,
    MatTooltipModule,
    FilterBarComponent,
  ],
  templateUrl: './careers.component.html',
  styleUrls: ['./careers.component.scss'],
})
export class CareersComponent implements OnInit {
  private readonly careerService = inject(CareerService);
  private readonly dialog        = inject(MatDialog);
  private readonly snackBar      = inject(MatSnackBar);
  private readonly destroyRef    = inject(DestroyRef);
  private readonly router        = inject(Router);

  readonly careers       = signal<CareerJob[]>([]);
  readonly loading       = signal(false);
  readonly totalElements = signal(0);
  readonly pageSize      = signal(10);
  readonly pageIndex     = signal(0);

  readonly displayedColumns = [
    'index', 'title', 'location', 'employmentType', 'published', 'active', 'deadline', 'createdAt', 'actions',
  ];

  private readonly query$  = new BehaviorSubject<CareerQueryParams>({
    page: 0, size: 10, sortBy: 'createdAt', sortDir: 'desc',
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
        return this.careerService.getAdminCareers(params).pipe(
          finalize(() => this.loading.set(false)),
          catchError((err: HttpErrorResponse) => {
            this.snackBar.open(err?.error?.message || 'Unable to load data. Please try again.', '✕', ERR);
            return EMPTY;
          }),
        );
      }),
    ).subscribe(page => {
      this.careers.set(page.content);
      this.totalElements.set(page.totalElements);
    });
  }

  // ─── Filters / Pagination ─────────────────────────────────────────────────

  onFiltersChange(f: FilterState): void {
    this.pageIndex.set(0);
    this.query$.next({ ...this.query$.value, page: 0, search: f.search || undefined });
  }

  onPageChange(e: PageEvent): void {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
    this.query$.next({ ...this.query$.value, page: e.pageIndex, size: e.pageSize });
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────

  openAddDialog(): void {
    this.dialog.open(CareerDialogComponent, { width: '720px', data: { mode: 'add' } })
      .afterClosed().subscribe(career => {
        if (career) {
          this.snackBar.open(`"${career.title}" created!`, '✕', SNACKBAR);
          this.reload();
        }
      });
  }

  openEditDialog(career: CareerJob): void {
    // The admin list endpoint returns a summary DTO (no aboutRole/responsibilities/
    // requirements/benefits) — fetch the full record before opening the form.
    this.careerService.getCareerById(career.id).subscribe({
      next: full => {
        this.dialog.open(CareerDialogComponent, {
          width: '720px',
          data: { mode: 'edit', career: full },
        }).afterClosed().subscribe(updated => {
          if (updated) {
            this.snackBar.open(`"${updated.title}" updated!`, '✕', SNACKBAR);
            this.reload();
          }
        });
      },
      error: (err: HttpErrorResponse) =>
        this.snackBar.open(err?.error?.message || 'Failed to load career details', '✕', ERR),
    });
  }

  viewApplications(career: CareerJob): void {
    this.router.navigate(['/career-applications'], {
      queryParams: { careerId: career.id, careerTitle: career.title },
    });
  }

  onDelete(career: CareerJob): void {
    this.dialog.open(DeleteConfirmDialogComponent, {
      width: '420px',
      data: { name: career.title },
    }).afterClosed().pipe(
      filter(Boolean),
      switchMap(() => this.careerService.deleteCareer(career.id)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.snackBar.open(`"${career.title}" deleted!`, '✕', SNACKBAR);
        this.reloadAfterRemoval();
      },
      error: (err: HttpErrorResponse) =>
        this.snackBar.open(err?.error?.message || 'Failed to delete career', '✕', ERR),
    });
  }

  // ─── Quick actions ───────────────────────────────────────────────────────

  onActivate(career: CareerJob): void {
    this.careerService.activateCareer(career.id).subscribe({
      next: updated => {
        this.snackBar.open(`"${updated.title}" activated!`, '✕', SNACKBAR);
        this.updateCareer(updated);
      },
      error: (err: HttpErrorResponse) =>
        this.snackBar.open(err?.error?.message || 'Failed to activate career', '✕', ERR),
    });
  }

  onDeactivate(career: CareerJob): void {
    this.dialog.open(DeleteConfirmDialogComponent, {
      width: '420px',
      data: {
        name: career.title,
        message: 'Are you sure you want to deactivate this career?',
        confirmLabel: 'Deactivate',
      },
    }).afterClosed().pipe(
      filter(Boolean),
      switchMap(() => this.careerService.deactivateCareer(career.id)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: updated => {
        this.snackBar.open(`"${updated.title}" deactivated.`, '✕', SNACKBAR);
        this.updateCareer(updated);
      },
      error: (err: HttpErrorResponse) =>
        this.snackBar.open(err?.error?.message || 'Failed to deactivate career', '✕', ERR),
    });
  }

  onPublish(career: CareerJob): void {
    this.careerService.publishCareer(career.id).subscribe({
      next: updated => {
        this.snackBar.open(`"${updated.title}" published!`, '✕', SNACKBAR);
        this.updateCareer(updated);
      },
      error: (err: HttpErrorResponse) =>
        this.snackBar.open(err?.error?.message || 'Failed to publish career', '✕', ERR),
    });
  }

  onUnpublish(career: CareerJob): void {
    this.dialog.open(DeleteConfirmDialogComponent, {
      width: '420px',
      data: {
        name: career.title,
        message: 'Are you sure you want to unpublish this career?',
        confirmLabel: 'Unpublish',
      },
    }).afterClosed().pipe(
      filter(Boolean),
      switchMap(() => this.careerService.unpublishCareer(career.id)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: updated => {
        this.snackBar.open(`"${updated.title}" unpublished.`, '✕', SNACKBAR);
        this.updateCareer(updated);
      },
      error: (err: HttpErrorResponse) =>
        this.snackBar.open(err?.error?.message || 'Failed to unpublish career', '✕', ERR),
    });
  }

  // ─── Display helpers ─────────────────────────────────────────────────────

  rowIndex(i: number): number {
    return this.pageIndex() * this.pageSize() + i + 1;
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private reload(): void { this.reload$.next(); }

  private reloadAfterRemoval(): void {
    if (this.careers().length === 1 && this.pageIndex() > 0) {
      const newIndex = this.pageIndex() - 1;
      this.pageIndex.set(newIndex);
      this.query$.next({ ...this.query$.value, page: newIndex });
    } else {
      this.reload();
    }
  }

  private updateCareer(updated: CareerJob): void {
    this.careers.update(list => list.map(c => c.id === updated.id ? updated : c));
  }
}
