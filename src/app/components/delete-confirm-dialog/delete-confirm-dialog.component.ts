import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-delete-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './delete-confirm-dialog.component.html',
  styleUrls: ['./delete-confirm-dialog.component.scss'],
})
export class DeleteConfirmDialogComponent {
  readonly dialogRef = inject(MatDialogRef<DeleteConfirmDialogComponent>);
  readonly data = inject<{ name: string }>(MAT_DIALOG_DATA);

  onConfirm(): void { this.dialogRef.close(true); }
  onCancel(): void { this.dialogRef.close(false); }
}
