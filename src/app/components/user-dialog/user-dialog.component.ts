import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs/operators';
import { UserManagementService } from '../../core/services/user-management.service';
import { AppUser, UserDialogData } from '../../core/models/user.model';
import { fileToBase64, formatBase64Image } from '../../shared/utils/file-base64.util';

@Component({
  selector: 'app-user-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatIconModule,
  ],
  templateUrl: './user-dialog.component.html',
  styleUrls: ['./user-dialog.component.scss'],
})
export class UserDialogComponent implements OnInit {
  form!: FormGroup;

  readonly loading      = signal(false);
  readonly showPassword = signal(false);
  readonly imagePreview = signal<string | null>(null);

  constructor(
    private readonly fb:          FormBuilder,
    private readonly userService: UserManagementService,
    public  readonly dialogRef:   MatDialogRef<UserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: UserDialogData,
  ) {}

  get isAdd(): boolean        { return this.data.mode === 'add'; }
  get isEdit(): boolean       { return this.data.mode === 'edit'; }
  get isSuperAdmin(): boolean { return this.data.user?.role === 'SUPER_ADMIN'; }

  ngOnInit(): void {
    this.form = this.fb.group({
      name:               ['', Validators.required],
      email:              ['', [Validators.required, Validators.email]],
      password:           ['', this.isAdd ? [Validators.required, Validators.minLength(6)] : []],
      admin:              [false],
      profileImageBase64: [''],
    });

    if (this.isEdit && this.data.user) {
      const u: AppUser = this.data.user;
      this.form.patchValue({
        name:               u.name,
        email:              u.email,
        admin:              u.role === 'ADMIN' || u.role === 'SUPER_ADMIN',
        profileImageBase64: u.profileImageBase64 ?? '',
      });
      if (u.profileImageBase64) {
        this.imagePreview.set(formatBase64Image(u.profileImageBase64));
      }
      if (this.isSuperAdmin) {
        this.form.get('admin')!.disable();
      }
    }
  }

  async onImageSelect(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const dataUrl = await fileToBase64(file);
    this.imagePreview.set(dataUrl);
    this.form.patchValue({ profileImageBase64: dataUrl });
  }

  removeImage(): void {
    this.imagePreview.set(null);
    this.form.patchValue({ profileImageBase64: '' });
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);

    if (this.isAdd) {
      this.userService.createUser({
        name:     this.form.value.name!,
        email:    this.form.value.email!,
        password: this.form.value.password!,
        admin:    this.form.value.admin ?? false,
      }).pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: user => {
            this.userService.triggerRefresh();
            this.dialogRef.close(user);
          },
          error: () => this.loading.set(false),
        });
    } else {
      this.userService.updateUser(this.data.user!.id, {
        name:               this.form.value.name!,
        email:              this.form.value.email!,
        admin:              this.form.getRawValue().admin ?? false,
        profileImageBase64: this.form.value.profileImageBase64 || null,
      }).pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: user => {
            this.userService.triggerRefresh();
            this.dialogRef.close(user);
          },
          error: () => this.loading.set(false),
        });
    }
  }

  onCancel(): void { this.dialogRef.close(null); }
}
