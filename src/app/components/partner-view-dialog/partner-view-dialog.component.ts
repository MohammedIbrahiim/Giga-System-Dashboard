import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { Partner } from '../../core/models/partner.model';
import { formatBase64Image } from '../../shared/utils/file-base64.util';

export interface PartnerViewDialogData {
  partner: Partner;
}

@Component({
  selector: 'app-partner-view-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
  ],
  templateUrl: './partner-view-dialog.component.html',
  styleUrls: ['./partner-view-dialog.component.scss'],
})
export class PartnerViewDialogComponent {
  readonly formatImage = formatBase64Image;

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: PartnerViewDialogData,
  ) {}

  get partner(): Partner { return this.data.partner; }
}
