import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators,
} from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { PartnerService } from '../../core/services/partner.service';
import {
  Partner, PartnerRequest, PartnerDialogData,
} from '../../core/models/partner.model';
import { fileToBase64, formatBase64Image } from '../../shared/utils/file-base64.util';

@Component({
  selector: 'app-partner-dialog',
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
    MatDividerModule,
    MatTooltipModule,
  ],
  templateUrl: './partner-dialog.component.html',
  styleUrls: ['./partner-dialog.component.scss'],
})
export class PartnerDialogComponent implements OnInit {
  private readonly partnerService = inject(PartnerService);

  form!: FormGroup;

  readonly loading      = signal(false);
  readonly logoPreview  = signal<string | null>(null);
  readonly imagePreview = signal<string | null>(null);
  readonly logoRequired = signal(false);

  readonly activeOptions: { value: boolean; label: string }[] = [
    { value: true,  label: 'Active' },
    { value: false, label: 'Inactive' },
  ];
  readonly formatImage   = formatBase64Image;

  private slugManuallyEdited = false;

  constructor(
    private readonly fb:       FormBuilder,
    public  readonly dialogRef: MatDialogRef<PartnerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: PartnerDialogData,
  ) {}

  get isAdd():  boolean { return this.data.mode === 'add'; }
  get isEdit(): boolean { return this.data.mode === 'edit'; }

  get whatWeOffer(): FormArray {
    return this.form.get('whatWeOffer') as FormArray;
  }

  ngOnInit(): void {
    this.buildForm();
    if (this.isEdit && this.data.partner) {
      this.patchForm(this.data.partner);
    }
    this.watchNameForSlug();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      name:             ['', Validators.required],
      slug:             ['', Validators.required],
      sortOrder:        [0, [Validators.required, Validators.min(0)]],
      active:           [true, Validators.required],
      shortDescription: ['', Validators.required],
      fullDescription:  ['', Validators.required],
      whatWeOffer:      this.fb.array([]),
    });
  }

  private patchForm(p: Partner): void {
    this.slugManuallyEdited = true;
    this.form.patchValue({
      name:             p.name,
      slug:             p.slug,
      sortOrder:        p.sortOrder,
      active:           p.active,
      shortDescription: p.shortDescription,
      fullDescription:  p.fullDescription,
    });
    if (p.logoBase64) {
      this.logoPreview.set(formatBase64Image(p.logoBase64));
    }
    if (p.imageBase64) {
      this.imagePreview.set(formatBase64Image(p.imageBase64));
    }
    p.whatWeOffer?.forEach(item =>
      this.whatWeOffer.push(this.fb.control(item, Validators.required)),
    );
  }

  private watchNameForSlug(): void {
    this.form.get('name')!.valueChanges.subscribe((name: string) => {
      if (!this.slugManuallyEdited) {
        const slug = this.buildSlugFrom(name);
        this.form.get('slug')!.setValue(slug, { emitEvent: false });
      }
    });

    this.form.get('slug')!.valueChanges.subscribe((v: string) => {
      if (v !== this.buildSlugFrom(this.form.get('name')!.value ?? '')) {
        this.slugManuallyEdited = true;
      }
    });
  }

  private buildSlugFrom(name: string): string {
    return (name ?? '').toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }

  // ─── What We Offer (FormArray) ────────────────────────────────────────────

  addOffer(): void {
    this.whatWeOffer.push(this.fb.control('', Validators.required));
  }

  removeOffer(index: number): void {
    this.whatWeOffer.removeAt(index);
  }

  // ─── Logo upload ─────────────────────────────────────────────────────────

  async onLogoSelect(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    this.logoPreview.set(base64);
    this.logoRequired.set(false);
    (event.target as HTMLInputElement).value = '';
  }

  removeLogo(): void { this.logoPreview.set(null); }

  // ─── Partner image upload ─────────────────────────────────────────────────

  async onImageSelect(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    this.imagePreview.set(base64);
    (event.target as HTMLInputElement).value = '';
  }

  removeImage(): void { this.imagePreview.set(null); }

  // ─── Submit ───────────────────────────────────────────────────────────────

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (!this.logoPreview()) {
      this.logoRequired.set(true);
      return;
    }
    this.loading.set(true);

    const v = this.form.value;
    const payload: PartnerRequest = {
      name:             v.name,
      slug:             v.slug,
      sortOrder:        v.sortOrder ?? 0,
      active:           v.active,
      shortDescription: v.shortDescription,
      fullDescription:  v.fullDescription,
      logoBase64:       this.logoPreview() ?? null,
      imageBase64:      this.imagePreview() ?? null,
      whatWeOffer:      (this.whatWeOffer.value as string[]).filter((s: string) => s?.trim()),
    };

    const req$ = this.isAdd
      ? this.partnerService.createPartner(payload)
      : this.partnerService.updatePartner(this.data.partner!.id, payload);

    req$.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: partner => this.dialogRef.close(partner),
      error: () => this.loading.set(false),
    });
  }

  onCancel(): void { this.dialogRef.close(null); }
}
