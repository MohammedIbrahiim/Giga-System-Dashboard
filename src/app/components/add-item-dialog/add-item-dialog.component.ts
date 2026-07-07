import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { DialogConfig } from '../../models/models';
import { fileToBase64, filesToBase64 } from '../../shared/utils/file-base64.util';

@Component({
  selector: 'app-add-item-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './add-item-dialog.component.html',
  styleUrls: ['./add-item-dialog.component.scss'],
})
export class AddItemDialogComponent implements OnInit {
  form!: FormGroup;
  imagePreviews: Record<string, string> = {};

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<AddItemDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public config: DialogConfig
  ) {}

  ngOnInit(): void {
    const controls: Record<string, any> = {};
    this.config.fields.forEach(field => {
      const initial = this.config.initialData?.[field.key];
      if (field.type === 'image') {
        controls[field.key] = [initial ?? ''];
        if (initial) this.imagePreviews[field.key] = initial;
      } else if (field.type === 'gallery') {
        controls[field.key] = [Array.isArray(initial) ? [...initial] : []];
      } else if (field.type === 'date') {
        const dateVal = initial ? new Date(initial) : new Date();
        controls[field.key] = [
          dateVal,
          field.required !== false ? [Validators.required] : [],
        ];
      } else {
        controls[field.key] = [
          initial ?? (field.type === 'number' ? null : ''),
          field.required !== false ? [Validators.required] : [],
        ];
      }
    });
    this.form = this.fb.group(controls);
  }

  onImageSelect(event: Event, key: string): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    fileToBase64(file).then(dataUrl => {
      this.imagePreviews[key] = dataUrl;
      this.form.get(key)?.setValue(dataUrl);
    });
  }

  removeImage(key: string): void {
    delete this.imagePreviews[key];
    this.form.get(key)?.setValue('');
  }

  async onGallerySelect(event: Event, key: string): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const newImages = await filesToBase64(input.files);
    const existing: string[] = this.form.get(key)?.value ?? [];
    this.form.get(key)?.setValue([...existing, ...newImages]);
    input.value = '';
  }

  removeGalleryImage(key: string, index: number): void {
    const current: string[] = this.form.get(key)?.value ?? [];
    this.form.get(key)?.setValue(current.filter((_, i) => i !== index));
  }

  galleryImages(key: string): string[] {
    return this.form.get(key)?.value ?? [];
  }

  onSubmit(): void {
    if (this.form.valid) {
      const value = { ...this.form.value };
      this.config.fields.forEach(field => {
        if (field.type === 'date' && value[field.key] instanceof Date) {
          value[field.key] = (value[field.key] as Date).toISOString().split('T')[0];
        }
      });
      this.dialogRef.close(value);
    } else {
      this.form.markAllAsTouched();
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
