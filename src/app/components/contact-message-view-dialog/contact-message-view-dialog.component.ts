import { Component, Inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { inject } from '@angular/core';
import { ContactMessageService } from '../../core/services/contact-message.service';
import {
  ContactMessage, ContactMessageStatus, CONTACT_STATUS_OPTIONS,
} from '../../core/models/contact-message.model';

export interface ContactMessageViewDialogData {
  message: ContactMessage;
}

const SNACKBAR = { duration: 3000, panelClass: ['success-snackbar'], horizontalPosition: 'right' as const, verticalPosition: 'top' as const };
const ERR      = { duration: 4000, panelClass: ['error-snackbar'],   horizontalPosition: 'right' as const, verticalPosition: 'top' as const };

@Component({
  selector: 'app-contact-message-view-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatMenuModule,
  ],
  templateUrl: './contact-message-view-dialog.component.html',
  styleUrls: ['./contact-message-view-dialog.component.scss'],
})
export class ContactMessageViewDialogComponent {
  private readonly service  = inject(ContactMessageService);
  private readonly snackBar = inject(MatSnackBar);

  readonly statusOptions  = CONTACT_STATUS_OPTIONS;
  readonly updatingStatus = signal(false);
  private statusChanged   = false;

  constructor(
    public  readonly dialogRef: MatDialogRef<ContactMessageViewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: ContactMessageViewDialogData,
  ) {}

  get msg(): ContactMessage { return this.data.message; }

  get fullName(): string {
    return `${this.msg.firstName} ${this.msg.lastName}`.trim();
  }

  onStatusChange(newStatus: ContactMessageStatus): void {
    if (newStatus === this.msg.status) return;
    this.updatingStatus.set(true);
    this.service.updateStatus(this.msg.id, newStatus).subscribe({
      next: updated => {
        this.data.message = updated;
        this.statusChanged = true;
        this.updatingStatus.set(false);
        this.snackBar.open('Contact message status updated successfully', '✕', SNACKBAR);
      },
      error: () => {
        this.updatingStatus.set(false);
        this.snackBar.open('Failed to update status', '✕', ERR);
      },
    });
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

  onClose(): void {
    this.dialogRef.close(this.statusChanged ? true : null);
  }
}
