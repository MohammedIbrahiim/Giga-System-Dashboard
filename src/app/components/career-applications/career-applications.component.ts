import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
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
import {
  JobApplication, ApplicationQueryParams, ApplicationStatus, APPLICATION_STATUS_OPTIONS,
} from '../../core/models/career.model';
import { CareerApplicationViewDialogComponent } from '../career-application-view-dialog/career-application-view-dialog.component';
import { DeleteConfirmDialogComponent } from '../delete-confirm-dialog/delete-confirm-dialog.component';
import { FilterBarComponent } from '../../shared/components/filter-bar/filter-bar.component';
import { FilterState, SelectOption } from '../../shared/models/filter.model';

const SNACKBAR = { duration: 3000, panelClass: ['success-snackbar'], horizontalPosition: 'right' as const, verticalPosition: 'top' as const };
const ERR      = { duration: 4000, panelClass: ['error-snackbar'],   horizontalPosition: 'right' as const, verticalPosition: 'top' as const };

@Component({
  selector: 'app-career-applications',
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
  templateUrl: './career-applications.component.html',
  styleUrls: ['./career-applications.component.scss'],
})
export class CareerApplicationsComponent implements OnInit {
  private readonly careerService = inject(CareerService);
  private readonly dialog        = inject(MatDialog);
  private readonly snackBar      = inject(MatSnackBar);
  private readonly destroyRef    = inject(DestroyRef);
  private readonly route         = inject(ActivatedRoute);
  private readonly router        = inject(Router);

  readonly applications  = signal<JobApplication[]>([]);
  readonly loading       = signal(false);
  readonly totalElements = signal(0);
  readonly pageSize      = signal(10);
  readonly pageIndex     = signal(0);

  readonly careerFilterId    = signal<number | null>(null);
  readonly careerFilterTitle = signal<string | null>(null);

  readonly displayedColumns = [
    'index', 'applicant', 'career', 'phone', 'experience', 'status', 'createdAt', 'actions',
  ];

  readonly statusSelectOptions: SelectOption[] = APPLICATION_STATUS_OPTIONS;
  readonly allStatusOptions = APPLICATION_STATUS_OPTIONS;

  private readonly query$  = new BehaviorSubject<ApplicationQueryParams>({
    page: 0, size: 10, sortBy: 'createdAt', sortDir: 'desc',
  });
  private readonly reload$ = new Subject<void>();

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const careerId = params.get('careerId');
    if (careerId) {
      this.careerFilterId.set(Number(careerId));
      this.careerFilterTitle.set(params.get('careerTitle'));
      this.query$.next({ ...this.query$.value, careerId: Number(careerId) });
    }

    merge(
      this.query$.pipe(distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))),
      this.reload$.pipe(map(() => this.query$.value)),
    ).pipe(
      takeUntilDestroyed(this.destroyRef),
      switchMap(params => {
        this.loading.set(true);
        return this.careerService.getApplications(params).pipe(
          finalize(() => this.loading.set(false)),
          catchError((err: HttpErrorResponse) => {
            this.snackBar.open(err?.error?.message || 'Unable to load data. Please try again.', '✕', ERR);
            return EMPTY;
          }),
        );
      }),
    ).subscribe(page => {
      this.applications.set(page.content);
      this.totalElements.set(page.totalElements);
    });
  }

  // ─── Filters / Pagination ─────────────────────────────────────────────────

  onFiltersChange(f: FilterState): void {
    this.pageIndex.set(0);
    this.query$.next({
      ...this.query$.value,
      page:   0,
      search: f.search || undefined,
      status: (f.status as ApplicationStatus) || undefined,
    });
  }

  onPageChange(e: PageEvent): void {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
    this.query$.next({ ...this.query$.value, page: e.pageIndex, size: e.pageSize });
  }

  clearCareerFilter(): void {
    this.careerFilterId.set(null);
    this.careerFilterTitle.set(null);
    this.pageIndex.set(0);
    this.query$.next({ page: 0, size: this.pageSize(), sortBy: 'createdAt', sortDir: 'desc' });
    this.router.navigate(['/career-applications']);
  }

  // ─── Actions ────────────────────────────────────────────────────────────

  openViewDialog(application: JobApplication): void {
    this.dialog.open(CareerApplicationViewDialogComponent, {
      width: '760px',
      maxHeight: '90vh',
      data: { applicationId: application.id },
    }).afterClosed().subscribe(updated => {
      if (updated) this.reload();
    });
  }

  onStatusChange(application: JobApplication, newStatus: ApplicationStatus): void {
    if (application.status === newStatus) return;
    this.careerService.updateApplicationStatus(application.id, newStatus).subscribe({
      next: () => {
        this.snackBar.open('Application status updated successfully', '✕', SNACKBAR);
        this.reload();
      },
      error: (err: HttpErrorResponse) =>
        this.snackBar.open(err?.error?.message || 'Failed to update status', '✕', ERR),
    });
  }

  onDelete(application: JobApplication): void {
    this.dialog.open(DeleteConfirmDialogComponent, {
      width: '420px',
      data: { name: application.fullName },
    }).afterClosed().pipe(
      filter(Boolean),
      switchMap(() => this.careerService.deleteApplication(application.id)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.snackBar.open('Application deleted!', '✕', SNACKBAR);
        this.reloadAfterRemoval();
      },
      error: (err: HttpErrorResponse) =>
        this.snackBar.open(err?.error?.message || 'Failed to delete application', '✕', ERR),
    });
  }

  // ─── Display helpers ─────────────────────────────────────────────────────

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      PENDING:     'badge-pending',
      REVIEWED:    'badge-reviewed',
      SHORTLISTED: 'badge-shortlisted',
      INTERVIEW:   'badge-interview',
      REJECTED:    'badge-rejected',
      HIRED:       'badge-hired',
    };
    return map[status] ?? '';
  }

  rowIndex(i: number): number {
    return this.pageIndex() * this.pageSize() + i + 1;
  }

  private reload(): void { this.reload$.next(); }

  private reloadAfterRemoval(): void {
    if (this.applications().length === 1 && this.pageIndex() > 0) {
      const newIndex = this.pageIndex() - 1;
      this.pageIndex.set(newIndex);
      this.query$.next({ ...this.query$.value, page: newIndex });
    } else {
      this.reload();
    }
  }
}
