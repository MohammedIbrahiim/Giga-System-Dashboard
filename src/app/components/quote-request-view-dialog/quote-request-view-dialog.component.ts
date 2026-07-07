import { Component, Inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { inject } from '@angular/core';
import { QuoteRequestService } from '../../core/services/quote-request.service';
import {
  QuoteRequest, QuoteStatus, QUOTE_STATUS_OPTIONS, CATEGORY_LABEL,
} from '../../core/models/quote-request.model';

export interface QuoteRequestViewDialogData {
  quote: QuoteRequest;
}

const SNACKBAR = { duration: 3000, panelClass: ['success-snackbar'], horizontalPosition: 'right' as const, verticalPosition: 'top' as const };
const ERR      = { duration: 4000, panelClass: ['error-snackbar'],   horizontalPosition: 'right' as const, verticalPosition: 'top' as const };

@Component({
  selector: 'app-quote-request-view-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatSelectModule,
    MatFormFieldModule,
    MatMenuModule,
  ],
  templateUrl: './quote-request-view-dialog.component.html',
  styleUrls: ['./quote-request-view-dialog.component.scss'],
})
export class QuoteRequestViewDialogComponent {
  private readonly service  = inject(QuoteRequestService);
  private readonly snackBar = inject(MatSnackBar);

  readonly statusOptions = QUOTE_STATUS_OPTIONS;
  readonly categoryLabel = CATEGORY_LABEL;

  readonly currentStatus: QuoteStatus;
  readonly updatingStatus = signal(false);
  private statusChanged   = false;

  constructor(
    public  readonly dialogRef: MatDialogRef<QuoteRequestViewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: QuoteRequestViewDialogData,
  ) {
    this.currentStatus = data.quote.status;
  }

  get quote(): QuoteRequest { return this.data.quote; }

  get selectedStatus(): QuoteStatus { return this.data.quote.status; }

  onStatusChange(newStatus: QuoteStatus): void {
    if (newStatus === this.data.quote.status) return;
    this.updatingStatus.set(true);
    this.service.updateStatus(this.data.quote.id, newStatus).subscribe({
      next: updated => {
        this.data.quote = updated;
        this.statusChanged = true;
        this.updatingStatus.set(false);
        this.snackBar.open('Quote request status updated successfully', '✕', SNACKBAR);
      },
      error: () => {
        this.updatingStatus.set(false);
        this.snackBar.open('Failed to update status', '✕', ERR);
      },
    });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      NEW:       'badge-new',
      REVIEWED:  'badge-reviewed',
      CONTACTED: 'badge-contacted',
      CLOSED:    'badge-closed',
    };
    return map[status] ?? '';
  }

  onClose(): void {
    this.dialogRef.close(this.statusChanged ? true : null);
  }
}
