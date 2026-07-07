import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormGroup,
  Validators, AbstractControl, ValidationErrors,
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { finalize } from 'rxjs/operators';
import { ProjectService } from '../../core/services/project.service';
import { ApiResponse } from '../../core/models/api-response.model';
import { Product } from '../../core/models/product.model';
import { API_URL } from '../../core/services/api-config';
import {
  Project, ProjectRequest, ProjectDialogData, ProjectDocument, ProjectServiceType,
  CATEGORY_OPTIONS, STATUS_OPTIONS, SERVICE_OPTIONS,
} from '../../core/models/project.model';
import {
  fileToBase64, formatBase64Image, filesToProjectDocuments,
} from '../../shared/utils/file-base64.util';

function endDateAfterStartValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startDate')?.value;
  const end   = group.get('endDate')?.value;
  if (start && end && new Date(end) <= new Date(start)) {
    return { endBeforeStart: true };
  }
  return null;
}

function urlValidator(ctrl: AbstractControl): ValidationErrors | null {
  if (!ctrl.value) return null;
  try { new URL(ctrl.value); return null; } catch { return { invalidUrl: true }; }
}

@Component({
  selector: 'app-project-dialog',
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
    MatCheckboxModule,
    MatDividerModule,
  ],
  templateUrl: './project-dialog.component.html',
  styleUrls: ['./project-dialog.component.scss'],
})
export class ProjectDialogComponent implements OnInit {
  private readonly projectService    = inject(ProjectService);
  private readonly http              = inject(HttpClient);

  form!: FormGroup;

  readonly loading           = signal(false);
  readonly logoPreview       = signal<string | null>(null);
  readonly imagePreviews     = signal<string[]>([]);
  readonly documents         = signal<ProjectDocument[]>([]);
  readonly availableProducts = signal<Product[]>([]);

  readonly categoryOptions = CATEGORY_OPTIONS;
  readonly statusOptions   = STATUS_OPTIONS;
  readonly serviceOptions  = SERVICE_OPTIONS;
  readonly formatImage     = formatBase64Image;

  constructor(
    private readonly fb:       FormBuilder,
    public  readonly dialogRef: MatDialogRef<ProjectDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: ProjectDialogData,
  ) {}

  get isAdd():  boolean { return this.data.mode === 'add'; }
  get isEdit(): boolean { return this.data.mode === 'edit'; }

  ngOnInit(): void {
    this.loadProducts();
    this.buildForm();
    if (this.isEdit && this.data.project) {
      this.patchForm(this.data.project);
    }
  }

  private loadProducts(): void {
    this.http.get<ApiResponse<Product[]>>(`${API_URL}/products/all`)
      .pipe(map(r => r.data))
      .subscribe({ next: p => this.availableProducts.set(p), error: () => {} });
  }

  private buildForm(): void {
    this.form = this.fb.group({
      projectTitle:        ['', Validators.required],
      projectCode:         ['', Validators.required],
      clientName:          ['', Validators.required],
      projectLocation:     [''],
      country:             ['', Validators.required],
      city:                ['', Validators.required],
      category:            ['', Validators.required],
      status:              ['ONGOING', Validators.required],
      startDate:           [null, Validators.required],
      endDate:             [null],
      shortSummary:        ['', Validators.required],
      detailedDescription: [''],
      scopeOfWork:         [''],
      productIds:          [[]],
      servicesProvided:    [[]],
      videoUrl:            ['', urlValidator],
      featured:            [false],
      archived:            [false],
      sortOrder:           [0],
    }, { validators: endDateAfterStartValidator });
  }

  private patchForm(p: Project): void {
    this.form.patchValue({
      projectTitle:        p.projectTitle,
      projectCode:         p.projectCode,
      clientName:          p.clientName,
      projectLocation:     p.projectLocation  ?? '',
      country:             p.country,
      city:                p.city,
      category:            p.category,
      status:              p.status,
      startDate:           p.startDate ? new Date(p.startDate) : null,
      endDate:             p.endDate   ? new Date(p.endDate)   : null,
      shortSummary:        p.shortSummary,
      detailedDescription: p.detailedDescription ?? '',
      scopeOfWork:         p.scopeOfWork ?? '',
      productIds:          p.productsUsed?.map(pr => pr.id) ?? [],
      servicesProvided:    p.servicesProvided ?? [],
      videoUrl:            p.videoUrl ?? '',
      featured:            p.featured ?? false,
      archived:            p.archived ?? false,
      sortOrder:           p.sortOrder ?? 0,
    });
    if (p.clientLogoBase64) {
      this.logoPreview.set(formatBase64Image(p.clientLogoBase64));
    }
    if (p.projectImages?.length) {
      this.imagePreviews.set(p.projectImages.map(i => formatBase64Image(i.imageBase64)));
    }
    if (p.projectDocuments?.length) {
      this.documents.set([...p.projectDocuments]);
    }
  }

  // ─── Services checkboxes ─────────────────────────────────────────────────

  isServiceSelected(svc: ProjectServiceType): boolean {
    return ((this.form.get('servicesProvided')?.value ?? []) as ProjectServiceType[]).includes(svc);
  }

  onServiceChange(svc: ProjectServiceType, checked: boolean): void {
    const current: ProjectServiceType[] = this.form.get('servicesProvided')?.value ?? [];
    this.form.get('servicesProvided')!.setValue(
      checked ? [...current, svc] : current.filter(s => s !== svc),
    );
  }

  // ─── Client Logo ─────────────────────────────────────────────────────────

  async onLogoSelect(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.logoPreview.set(await fileToBase64(file));
    (event.target as HTMLInputElement).value = '';
  }

  removeLogo(): void { this.logoPreview.set(null); }

  // ─── Project Images ───────────────────────────────────────────────────────

  async onImagesSelect(event: Event): Promise<void> {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    if (!files.length) return;
    const dataUrls = await Promise.all(files.map(f => fileToBase64(f)));
    this.imagePreviews.update(p => [...p, ...dataUrls]);
    (event.target as HTMLInputElement).value = '';
  }

  removeImage(index: number): void {
    this.imagePreviews.update(p => p.filter((_, i) => i !== index));
  }

  // ─── Project Documents ────────────────────────────────────────────────────

  async onDocumentsSelect(event: Event): Promise<void> {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    if (!files.length) return;
    const docs = await filesToProjectDocuments(files);
    this.documents.update(d => [...d, ...docs]);
    (event.target as HTMLInputElement).value = '';
  }

  removeDocument(index: number): void {
    this.documents.update(d => d.filter((_, i) => i !== index));
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);

    const v = this.form.value;
    const payload: ProjectRequest = {
      projectTitle:        v.projectTitle,
      projectCode:         v.projectCode,
      clientName:          v.clientName,
      projectLocation:     v.projectLocation || null,
      country:             v.country,
      city:                v.city,
      category:            v.category,
      status:              v.status,
      startDate:           this.fmtDate(v.startDate),
      endDate:             v.endDate ? this.fmtDate(v.endDate) : null,
      shortSummary:        v.shortSummary,
      detailedDescription: v.detailedDescription || null,
      scopeOfWork:         v.scopeOfWork || null,
      productIds:          v.productIds ?? [],
      servicesProvided:    v.servicesProvided ?? [],
      projectImagesBase64: this.imagePreviews(),
      projectDocuments:    this.documents(),
      videoUrl:            v.videoUrl || null,
      clientLogoBase64:    this.logoPreview() ?? null,
      featured:            v.featured  ?? false,
      archived:            v.archived  ?? false,
      sortOrder:           Number(v.sortOrder) || 0,
    };

    const req$ = this.isAdd
      ? this.projectService.createProject(payload)
      : this.projectService.updateProject(this.data.project!.id, payload);

    req$.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: project => this.dialogRef.close(project),
      error: () => this.loading.set(false),
    });
  }

  onCancel(): void { this.dialogRef.close(null); }

  private fmtDate(date: Date | string | null): string {
    if (!date) return '';
    if (typeof date === 'string') return date;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
