import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { ProfileUpdateRequest } from '../../core/models/profile.model';
import { fileToBase64 } from '../../shared/utils/file-base64.util';

const SNACKBAR = { duration: 3000, panelClass: ['success-snackbar'], horizontalPosition: 'right' as const, verticalPosition: 'top' as const };
const ERR      = { duration: 4000, panelClass: ['error-snackbar'],   horizontalPosition: 'right' as const, verticalPosition: 'top' as const };

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading   = signal(false);
  readonly loadingPw = signal(false);
  readonly imagePreview = signal<string | null>(null);
  readonly showCurrentPw  = signal(false);
  readonly showNewPw      = signal(false);
  readonly showConfirmPw  = signal(false);

  readonly form = this.fb.group({
    name:               ['', Validators.required],
    email:              ['', [Validators.required, Validators.email]],
    profileImageBase64: [''],
  });

  readonly changePwForm = this.fb.group(
    {
      currentPassword: ['', Validators.required],
      newPassword:     ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: this.passwordsMatchValidator },
  );

  ngOnInit(): void {
    const cached = this.auth.currentUser();
    if (cached) {
      this.form.patchValue({ name: cached.name, email: cached.email, profileImageBase64: cached.profileImageBase64 ?? '' });
      if (cached.profileImageBase64) this.imagePreview.set(cached.profileImageBase64);
    }

    this.profileService.getProfile().subscribe({
      next: profile => {
        this.form.patchValue({
          name:               profile.name,
          email:              profile.email,
          profileImageBase64: profile.profileImageBase64 ?? '',
        });
        if (profile.profileImageBase64) {
          this.imagePreview.set(profile.profileImageBase64);
        }
      },
    });
  }

  get userRole(): string  { return this.auth.currentUser()?.role ?? ''; }
  get initials(): string  { return this.auth.initials(); }

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

  onSave(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const request: ProfileUpdateRequest = {
      name:               this.form.value.name!,
      email:              this.form.value.email!,
      profileImageBase64: this.form.value.profileImageBase64 || null,
    };

    this.loading.set(true);
    this.profileService.updateProfile(request).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: () => this.snackBar.open('Profile updated successfully!', '✕', SNACKBAR),
      error: () => this.snackBar.open('Failed to update profile', '✕', ERR),
    });
  }

  onChangePassword(): void {
    if (this.changePwForm.invalid) { this.changePwForm.markAllAsTouched(); return; }

    this.loadingPw.set(true);
    this.profileService.changePassword({
      currentPassword: this.changePwForm.value.currentPassword!,
      newPassword:     this.changePwForm.value.newPassword!,
      confirmPassword: this.changePwForm.value.confirmPassword!,
    }).pipe(
      finalize(() => this.loadingPw.set(false)),
    ).subscribe({
      next: () => {
        this.changePwForm.reset();
        this.snackBar.open('Password changed successfully', '✕', SNACKBAR);
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Failed to change password';
        this.snackBar.open(msg, '✕', ERR);
      },
    });
  }

  private passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
    const newPw  = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return (newPw && confirm && newPw !== confirm) ? { passwordsMismatch: true } : null;
  }
}
