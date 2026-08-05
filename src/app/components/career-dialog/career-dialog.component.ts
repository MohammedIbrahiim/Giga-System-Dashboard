import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormGroup, FormArray, FormControl, Validators,
} from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { CareerService } from '../../core/services/career.service';
import {
  CareerJob, CreateCareerJobRequest, CareerDialogData, EMPLOYMENT_TYPE_OPTIONS,
} from '../../core/models/career.model';

@Component({
  selector: 'app-career-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatDividerModule,
    MatTooltipModule,
  ],
  templateUrl: './career-dialog.component.html',
  styleUrls: ['./career-dialog.component.scss'],
})
export class CareerDialogComponent implements OnInit {
  private readonly careerService = inject(CareerService);

  form!: FormGroup;

  readonly loading = signal(false);
  readonly employmentTypeOptions = EMPLOYMENT_TYPE_OPTIONS;

  constructor(
    private readonly fb:        FormBuilder,
    public  readonly dialogRef: MatDialogRef<CareerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: CareerDialogData,
  ) {}

  get isAdd():  boolean { return this.data.mode === 'add'; }
  get isEdit(): boolean { return this.data.mode === 'edit'; }

  get responsibilities(): FormArray { return this.form.get('responsibilities') as FormArray; }
  get requirements():     FormArray { return this.form.get('requirements')     as FormArray; }
  get benefits():         FormArray { return this.form.get('benefits')         as FormArray; }

  ngOnInit(): void {
    this.buildForm();
    if (this.isEdit && this.data.career) {
      this.patchForm(this.data.career);
    }
  }

  private buildForm(): void {
    this.form = this.fb.group({
      title:               ['', [Validators.required, Validators.maxLength(200)]],
      aboutRole:           ['', Validators.required],
      location:            ['', [Validators.required, Validators.maxLength(150)]],
      employmentType:      ['FULL_TIME', Validators.required],
      applicationDeadline: [null as Date | null],
      active:              [true],
      published:           [true],
      responsibilities:    this.fb.array([this.createTextItem()]),
      requirements:        this.fb.array([this.createTextItem()]),
      benefits:            this.fb.array([this.createTextItem()]),
    });
  }

  private patchForm(c: CareerJob): void {
    this.form.patchValue({
      title:               c.title,
      aboutRole:           c.aboutRole,
      location:            c.location,
      employmentType:      c.employmentType,
      applicationDeadline: c.applicationDeadline ? new Date(c.applicationDeadline) : null,
      active:              c.active,
      published:           c.published,
    });

    this.responsibilities.clear();
    (c.responsibilities?.length ? c.responsibilities : ['']).forEach(item =>
      this.responsibilities.push(this.createTextItem(item)));

    this.requirements.clear();
    (c.requirements?.length ? c.requirements : ['']).forEach(item =>
      this.requirements.push(this.createTextItem(item)));

    this.benefits.clear();
    (c.benefits?.length ? c.benefits : ['']).forEach(item =>
      this.benefits.push(this.createTextItem(item)));
  }

  private createTextItem(value = ''): FormControl {
    return this.fb.control(value, Validators.required);
  }

  // ─── Dynamic list helpers ─────────────────────────────────────────────────

  addResponsibility(): void { this.responsibilities.push(this.createTextItem()); }
  removeResponsibility(i: number): void {
    if (this.responsibilities.length > 1) this.responsibilities.removeAt(i);
  }

  addRequirement(): void { this.requirements.push(this.createTextItem()); }
  removeRequirement(i: number): void {
    if (this.requirements.length > 1) this.requirements.removeAt(i);
  }

  addBenefit(): void { this.benefits.push(this.createTextItem()); }
  removeBenefit(i: number): void {
    if (this.benefits.length > 1) this.benefits.removeAt(i);
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);

    const raw = this.form.getRawValue();
    const payload: CreateCareerJobRequest = {
      title:               raw.title,
      aboutRole:           raw.aboutRole,
      location:            raw.location,
      employmentType:      raw.employmentType,
      applicationDeadline: this.fmtDate(raw.applicationDeadline),
      active:              raw.active ?? true,
      published:           raw.published ?? true,
      responsibilities:    (raw.responsibilities as string[]).map(s => s.trim()).filter(Boolean),
      requirements:        (raw.requirements     as string[]).map(s => s.trim()).filter(Boolean),
      benefits:            (raw.benefits         as string[]).map(s => s.trim()).filter(Boolean),
    };

    const req$ = this.isAdd
      ? this.careerService.createCareer(payload)
      : this.careerService.updateCareer(this.data.career!.id, payload);

    req$.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: career => this.dialogRef.close(career),
      error: () => this.loading.set(false),
    });
  }

  onCancel(): void { this.dialogRef.close(null); }

  private fmtDate(date: Date | string | null): string | null {
    if (!date) return null;
    if (typeof date === 'string') return date;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
