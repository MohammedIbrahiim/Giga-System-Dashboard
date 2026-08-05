import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import { CareerService } from '../../core/services/career.service';
import {
  JobApplication, ApplicationStatus, APPLICATION_STATUS_OPTIONS,
} from '../../core/models/career.model';

export interface CareerApplicationViewDialogData {
  applicationId: number;
}

const SNACKBAR = { duration: 3000, panelClass: ['success-snackbar'], horizontalPosition: 'right' as const, verticalPosition: 'top' as const };
const ERR      = { duration: 4000, panelClass: ['error-snackbar'],   horizontalPosition: 'right' as const, verticalPosition: 'top' as const };

@Component({
  selector: 'app-career-application-view-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatDividerModule,
    MatMenuModule,
  ],
  templateUrl: './career-application-view-dialog.component.html',
  styleUrls: ['./career-application-view-dialog.component.scss'],
})
export class CareerApplicationViewDialogComponent implements OnInit {
  private readonly careerService = inject(CareerService);
  private readonly snackBar      = inject(MatSnackBar);

  readonly statusOptions  = APPLICATION_STATUS_OPTIONS;
  readonly loading         = signal(false);
  readonly updatingStatus  = signal(false);
  readonly application     = signal<JobApplication | null>(null);
  private statusChanged    = false;

  constructor(
    public  readonly dialogRef: MatDialogRef<CareerApplicationViewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: CareerApplicationViewDialogData,
  ) {}

  ngOnInit(): void {
    this.loading.set(true);
    this.careerService.getApplicationById(this.data.applicationId).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: application => this.application.set(application),
      error: (err: HttpErrorResponse) => {
        this.snackBar.open(err?.error?.message || 'Unable to load application details.', '✕', ERR);
        this.dialogRef.close(null);
      },
    });
  }

  onStatusChange(newStatus: ApplicationStatus): void {
    const current = this.application();
    if (!current || newStatus === current.status) return;
    this.updatingStatus.set(true);
    this.careerService.updateApplicationStatus(current.id, newStatus).subscribe({
      next: updated => {
        this.application.set(updated);
        this.statusChanged = true;
        this.updatingStatus.set(false);
        this.snackBar.open('Application status updated successfully', '✕', SNACKBAR);
      },
      error: (err: HttpErrorResponse) => {
        this.updatingStatus.set(false);
        this.snackBar.open(err?.error?.message || 'Failed to update status', '✕', ERR);
      },
    });
  }

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

  onClose(): void {
    this.dialogRef.close(this.statusChanged ? true : null);
  }
}
