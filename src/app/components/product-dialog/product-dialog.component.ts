import {
  Component, DestroyRef, Inject, OnInit, computed, inject, signal, WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormControl, FormGroup, FormArray,
  Validators, AbstractControl, ValidationErrors,
} from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';
import { finalize } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { ProductService } from '../../core/services/product.service';
import { PartnerService } from '../../core/services/partner.service';
import { ApiResponse } from '../../core/models/api-response.model';
import {
  FilterChip, FilterMetaOption, ProductFilterGroupKey,
  ProductFilterMetadata, FILTER_KEY_TO_CONTROL,
} from '../../core/models/product-filter-metadata.model';
import {
  Product, ProductRequest, ProductDialogData, ProductSpecification,
  PartnerOption, STOCK_STATUS_OPTIONS,
} from '../../core/models/product.model';
import { API_URL } from '../../core/services/api-config';
import {
  filesToBase64, formatBase64Image, pdfToBase64,
} from '../../shared/utils/file-base64.util';

const ERR = { duration: 4000, panelClass: ['error-snackbar'], horizontalPosition: 'right' as const, verticalPosition: 'top' as const };

function integerValidator(control: AbstractControl): ValidationErrors | null {
  const v = control.value;
  if (v === null || v === undefined) return null;
  return Number.isInteger(Number(v)) ? null : { integer: true };
}

@Component({
  selector: 'app-product-dialog',
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
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule,
    MatProgressBarModule,
    DragDropModule,
  ],
  templateUrl: './product-dialog.component.html',
  styleUrls: ['./product-dialog.component.scss'],
})
export class ProductDialogComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly partnerService = inject(PartnerService);
  private readonly snackBar       = inject(MatSnackBar);
  private readonly destroyRef     = inject(DestroyRef);
  private readonly http           = inject(HttpClient);

  form!: FormGroup;

  readonly loading         = signal(false);
  readonly galleryPreviews = signal<string[]>([]);
  readonly datasheetFile   = signal<{ name: string; base64: string } | null>(null);
  readonly manualFile      = signal<{ name: string; base64: string } | null>(null);
  readonly allProducts     = signal<Product[]>([]);
  readonly partners        = signal<PartnerOption[]>([]);
  readonly partnersLoading = signal(false);

  // filter metadata
  readonly filterMetadata   = signal<ProductFilterMetadata | null>(null);
  readonly metadataLoading  = signal(false);
  readonly availableSubOpts = signal<FilterMetaOption[]>([]);

  // main category options come from dedicated mainCategoryGroup (separate from groups[])
  readonly mainCategoryOpts = computed(() =>
    this.filterMetadata()?.mainCategoryGroup?.options ?? []
  );

  // Filter Type dropdown: mainCategoryGroup first, then all other groups
  readonly filterTypeOpts = computed(() => {
    const meta = this.filterMetadata();
    if (!meta) return [];
    const result: { key: string; title: string }[] = [];
    if (meta.mainCategoryGroup) {
      result.push({ key: meta.mainCategoryGroup.key, title: meta.mainCategoryGroup.title });
    }
    for (const g of meta.groups) {
      result.push({ key: g.key, title: g.title });
    }
    return result;
  });

  // dynamic filter selector state
  readonly selectedFilterType  = signal<string | null>(null);
  readonly selectedFilterChips = signal<FilterChip[]>([]);

  // Options for the currently selected filter type (mainCategory uses mainCategoryGroup.options)
  readonly currentFilterOpts = computed(() => {
    const type = this.selectedFilterType();
    if (!type) return [];
    if (type === 'mainCategory') return this.mainCategoryOpts();
    return this.groupOpts(type);
  });

  // legacy chip signals (features / certifications / accessories round-trip)
  readonly features       = signal<string[]>([]);
  readonly certifications = signal<string[]>([]);
  readonly accessories    = signal<string[]>([]);

  readonly separatorKeysCodes = [ENTER, COMMA] as const;
  readonly stockStatusOptions = STOCK_STATUS_OPTIONS;
  readonly formatImage        = formatBase64Image;

  constructor(
    private readonly fb:        FormBuilder,
    public  readonly dialogRef: MatDialogRef<ProductDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: ProductDialogData,
  ) {}

  // ─── Getters ─────────────────────────────────────────────────────────────────

  get isAdd():  boolean { return this.data.mode === 'add'; }
  get isEdit(): boolean { return this.data.mode === 'edit'; }

  get technicalSpecifications(): FormArray {
    return this.form.get('technicalSpecifications') as FormArray;
  }

  get relatedProductOptions(): Product[] {
    if (this.isEdit && this.data.product) {
      return this.allProducts().filter(p => p.id !== this.data.product!.id);
    }
    return this.allProducts();
  }

  get showSubcategorySection(): boolean {
    return this.availableSubOpts().length > 0;
  }

  get currentFilterTitle(): string {
    const type = this.selectedFilterType();
    if (!type) return 'Filter Values';
    if (type === 'mainCategory') {
      return this.filterMetadata()?.mainCategoryGroup?.title ?? 'Main Category';
    }
    return this.filterMetadata()?.groups.find(g => g.key === type)?.title ?? 'Filter Values';
  }

  // Returns the number[] FormControl for the selected filter type (null for mainCategory — handled separately)
  get currentFilterControl(): FormControl<number[]> | null {
    const type = this.selectedFilterType();
    if (!type || type === 'mainCategory' || !this.form) return null;
    const name = FILTER_KEY_TO_CONTROL[type as ProductFilterGroupKey];
    return name ? (this.form.get(name) as FormControl<number[]>) : null;
  }

  get subCategoriesControl(): FormControl<number[]> {
    return this.form.get('subCategories') as FormControl<number[]>;
  }

  trackByIndex(index: number): number { return index; }

  // ─── Lifecycle ────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.buildForm();
    this.subscribeToCategoryChange();
    this.subscribeToFormForChips();
    this.loadAllProducts();
    this.loadPartners();
    this.loadFilterMetadata();
  }

  // ─── Data Loading ────────────────────────────────────────────────────────────

  private loadFilterMetadata(): void {
    this.metadataLoading.set(true);
    this.disableFilterControls();
    this.productService.getProductFilterMetadata()
      .pipe(finalize(() => { this.metadataLoading.set(false); this.enableFilterControls(); }))
      .subscribe({
        next: metadata => {
          this.filterMetadata.set(metadata);
          if (this.isEdit && this.data.product) {
            this.patchForm(this.data.product);
          }
          this.updateFilterChips();
        },
        error: () => {
          this.snackBar.open('Failed to load filter options', '✕', ERR);
          if (this.isEdit && this.data.product) {
            this.patchForm(this.data.product);
          }
        },
      });
  }

  private loadPartners(): void {
    this.partnersLoading.set(true);
    this.partnerService.getPartners({ size: 100, active: true })
      .pipe(finalize(() => this.partnersLoading.set(false)))
      .subscribe({
        next: page => this.partners.set(page.content.filter(p => p.active)),
        error: () => {
          this.snackBar.open('Failed to load brand options', '✕', ERR);
          this.form.get('brandId')?.disable();
        },
      });
  }

  private loadAllProducts(): void {
    this.http.get<ApiResponse<Product[]>>(`${API_URL}/products/all`)
      .pipe(map(r => r.data))
      .subscribe({ next: p => this.allProducts.set(p), error: () => {} });
  }

  // ─── Form ─────────────────────────────────────────────────────────────────────

  private buildForm(): void {
    const fb = this.fb.nonNullable;
    this.form = this.fb.group({
      // core fields
      productName:         ['', Validators.required],
      sku:                 ['', Validators.required],
      modelNumber:         [''],
      brandId:             [null as number | null, Validators.required],
      shortDescription:    ['', Validators.required],
      detailedDescription: [''],
      stockStatus:         ['IN_STOCK', Validators.required],
      relatedProductIds:   [[] as number[]],
      // Main Category: numeric ID (from mainCategoryGroup options), required
      categoryId:    fb.control<number | null>(null, Validators.required),
      // All filter controls hold numeric IDs
      subCategories: fb.control<number[]>([]),
      applications:    fb.control<number[]>([]),
      parameters:      fb.control<number[]>([]),
      communications:  fb.control<number[]>([]),
      installations:   fb.control<number[]>([]),
      powers:          fb.control<number[]>([]),
      environments:    fb.control<number[]>([]),
      outputSignals:   fb.control<number[]>([]),
      compliances:     fb.control<number[]>([]),
      rank:            [null as number | null, [Validators.min(1), Validators.max(8), integerValidator]],
      technicalSpecifications: this.fb.array([]),
    });
  }

  private patchForm(p: Product): void {
    const metadata = this.filterMetadata();

    // Convert string value/slug or numeric string from GET response → numeric ID via metadata
    const toIds = (vals: string[] | null | undefined, groupKey: ProductFilterGroupKey): number[] => {
      if (!vals?.length) return [];
      const opts = metadata?.groups.find(g => g.key === groupKey)?.options ?? [];
      return vals
        .map(v => {
          const asNum = Number(v);
          if (!isNaN(asNum)) return asNum;
          return opts.find(o => o.value === v)?.id;
        })
        .filter((id): id is number => id != null);
    };

    this.form.patchValue({
      productName:         p.productName,
      sku:                 p.sku,
      modelNumber:         p.modelNumber ?? '',
      brandId:             p.brandId ?? null,
      shortDescription:    p.shortDescription,
      detailedDescription: p.detailedDescription ?? '',
      stockStatus:         p.stockStatus,
      relatedProductIds:   p.relatedProducts?.map(r => r.id) ?? [],
      applications:   toIds(p.applications,   'application'),
      parameters:     toIds(p.parameters,     'parameter'),
      communications: toIds(p.communications, 'communication'),
      installations:  toIds(p.installations,  'installation'),
      powers:         toIds(p.powers,         'power'),
      environments:   toIds(p.environments,   'environment'),
      outputSignals:  toIds(p.outputSignals,  'outputSignal'),
      compliances:    toIds(p.compliances,    'compliance'),
      rank:           p.rank ?? null,
    });

    // Resolve categoryId: prefer product.category.id, fall back to slug lookup
    const existingId = p.category?.id ?? null;
    const slugId = (!existingId && p.mainCategories?.[0])
      ? (this.mainCategoryOpts().find(o => o.value === p.mainCategories![0])?.id ?? null)
      : null;
    const catId = existingId ?? slugId;
    this.form.get('categoryId')!.setValue(catId, { emitEvent: false });

    // updateSubcategoryOptions handles slug→id conversion for subCategories from GET response
    this.updateSubcategoryOptions(catId, p.subCategories ?? []);
    this.updateFilterChips();

    if (p.galleryImages?.length) {
      this.galleryPreviews.set(p.galleryImages.map(i => formatBase64Image(i.imageBase64)));
    }
    if (p.datasheetPdfBase64 && p.datasheetFileName) {
      this.datasheetFile.set({ name: p.datasheetFileName, base64: p.datasheetPdfBase64 });
    }
    if (p.manualPdfBase64 && p.manualFileName) {
      this.manualFile.set({ name: p.manualFileName, base64: p.manualPdfBase64 });
    }
    p.technicalSpecifications?.forEach(spec => {
      this.technicalSpecifications.push(this.createSpecGroup(spec));
    });
    this.features.set(this.splitChips(p.features));
    this.certifications.set(this.splitChips(p.certifications));
    this.accessories.set(this.splitChips(p.accessories));
  }

  // ─── Main category (categoryId) → subcategory reactive logic ─────────────────

  private subscribeToCategoryChange(): void {
    this.form.get('categoryId')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id: number | null) => {
        this.updateSubcategoryOptions(id);
      });
  }

  // subcategories are keyed by numeric ID string in the API response (e.g. "1")
  // preserveSubs may contain string slugs (from GET) or numeric IDs
  private updateSubcategoryOptions(id: number | null, preserveSubs?: string[]): void {
    const metadata = this.filterMetadata();
    if (!metadata) { this.availableSubOpts.set([]); return; }
    const opts = id !== null ? (metadata.subcategories[String(id)] ?? []) : [];
    this.availableSubOpts.set(opts);
    const availableIds = new Set(opts.map(o => o.id).filter((x): x is number => x != null));

    if (preserveSubs !== undefined) {
      // Convert slug or numeric string from GET response → numeric ID
      const ids = preserveSubs
        .map(v => {
          const asNum = Number(v);
          if (!isNaN(asNum) && availableIds.has(asNum)) return asNum;
          return opts.find(o => o.value === v)?.id;
        })
        .filter((n): n is number => n != null && availableIds.has(n));
      this.form.get('subCategories')!.setValue(ids, { emitEvent: false });
    } else {
      const cur = (this.form.get('subCategories')!.getRawValue() as number[]) ?? [];
      const valid = cur.filter(n => availableIds.has(n));
      this.form.get('subCategories')!.setValue(valid, { emitEvent: false });
    }

    this.updateFilterChips();
  }

  // ─── Chip subscriptions ───────────────────────────────────────────────────────

  private subscribeToFormForChips(): void {
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateFilterChips());
  }

  private updateFilterChips(): void {
    const metadata = this.filterMetadata();
    if (!metadata || !this.form) { this.selectedFilterChips.set([]); return; }

    const chips: FilterChip[] = [];

    // Main category chip
    const catId = this.form.get('categoryId')?.getRawValue() as number | null;
    if (catId !== null && catId !== undefined) {
      const opt = this.mainCategoryOpts().find(o => o.id === catId);
      chips.push({
        groupKey:   'mainCategory',
        groupTitle: metadata.mainCategoryGroup?.title ?? 'Main Category',
        value:      String(catId),
        label:      opt?.label ?? String(catId),
      });
    }

    // Filter group chips (multi-select, numeric IDs)
    for (const group of metadata.groups) {
      const name = FILTER_KEY_TO_CONTROL[group.key];
      if (!name) continue;
      const selected = (this.form.get(name)?.getRawValue() as number[]) ?? [];
      for (const id of selected) {
        const opt = group.options.find(o => o.id === id);
        chips.push({
          groupKey:   group.key,
          groupTitle: group.title,
          value:      String(id),
          label:      opt?.label ?? String(id),
        });
      }
    }

    // Subcategory chips
    const subOpts = this.availableSubOpts();
    const selectedSubs = (this.form.get('subCategories')?.getRawValue() as number[]) ?? [];
    for (const id of selectedSubs) {
      const opt = subOpts.find(o => o.id === id);
      chips.push({
        groupKey:   'subCategory',
        groupTitle: 'Subcategory',
        value:      String(id),
        label:      opt?.label ?? String(id),
      });
    }

    this.selectedFilterChips.set(chips);
  }

  // ─── Filter type UX ──────────────────────────────────────────────────────────

  onFilterTypeChange(key: string | null): void {
    this.selectedFilterType.set(key || null);
  }

  removeFilterChip(groupKey: string, value: string): void {
    const numId = Number(value);
    if (groupKey === 'mainCategory') {
      this.form.get('categoryId')?.setValue(null);
      return;
    }
    if (groupKey === 'subCategory') {
      const ctrl = this.form.get('subCategories') as FormControl<number[]>;
      ctrl.setValue(ctrl.value.filter(id => id !== numId));
      return;
    }
    const name = FILTER_KEY_TO_CONTROL[groupKey as ProductFilterGroupKey];
    if (!name) return;
    const ctrl = this.form.get(name) as FormControl<number[]>;
    ctrl.setValue(ctrl.value.filter(id => id !== numId));
  }

  clearAllFilters(): void {
    this.form.get('categoryId')?.setValue(null);
    this.form.get('subCategories')?.setValue([]);
    (['applications', 'parameters', 'communications', 'installations',
      'powers', 'environments', 'outputSignals', 'compliances'] as const)
      .forEach(n => (this.form.get(n) as FormControl<number[]>)?.setValue([]));
    this.selectedFilterType.set(null);
  }

  // ─── Filter control enable / disable during metadata loading ─────────────────

  private readonly filterControlNames = [
    'categoryId', 'subCategories', 'applications', 'parameters',
    'communications', 'installations', 'powers', 'environments',
    'outputSignals', 'compliances', 'rank',
  ] as const;

  private disableFilterControls(): void {
    this.filterControlNames.forEach(n => this.form?.get(n)?.disable());
  }

  private enableFilterControls(): void {
    this.filterControlNames.forEach(n => this.form?.get(n)?.enable());
  }

  // ─── Technical Specifications (FormArray) ────────────────────────────────────

  createSpecGroup(spec?: ProductSpecification): FormGroup {
    return this.fb.group({
      id:            [spec?.id ?? null],
      parameterName: [spec?.parameterName ?? ''],
      value:         [spec?.value ?? ''],
      unit:          [spec?.unit ?? ''],
      specOrder:     [spec?.specOrder ?? 0],
    });
  }

  addSpecification(): void { this.technicalSpecifications.push(this.createSpecGroup()); }
  removeSpecification(index: number): void { this.technicalSpecifications.removeAt(index); }

  // ─── Legacy chip inputs (features / certifications / accessories) ─────────────

  addChip(list: WritableSignal<string[]>, event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value) { list.update(arr => [...arr, value]); }
    event.chipInput!.clear();
  }

  removeChip(list: WritableSignal<string[]>, item: string): void {
    list.update(arr => arr.filter(a => a !== item));
  }

  // ─── Gallery Images ───────────────────────────────────────────────────────────

  async onGallerySelect(event: Event): Promise<void> {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    if (!files.length) return;
    const dataUrls = await filesToBase64(files);
    this.galleryPreviews.update(p => [...p, ...dataUrls]);
    (event.target as HTMLInputElement).value = '';
  }

  removeGalleryImage(index: number): void {
    this.galleryPreviews.update(p => p.filter((_, i) => i !== index));
  }

  onGalleryDrop(event: CdkDragDrop<string[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const arr = [...this.galleryPreviews()];
    moveItemInArray(arr, event.previousIndex, event.currentIndex);
    this.galleryPreviews.set(arr);
  }

  // ─── Datasheet / Manual PDF ───────────────────────────────────────────────────

  async onDatasheetSelect(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const pdf = await pdfToBase64(file);
    this.datasheetFile.set({ name: pdf.fileName, base64: pdf.fileBase64 });
    (event.target as HTMLInputElement).value = '';
  }

  removeDatasheet(): void { this.datasheetFile.set(null); }

  async onManualSelect(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const pdf = await pdfToBase64(file);
    this.manualFile.set({ name: pdf.fileName, base64: pdf.fileBase64 });
    (event.target as HTMLInputElement).value = '';
  }

  removeManual(): void { this.manualFile.set(null); }

  // ─── Submit ───────────────────────────────────────────────────────────────────

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const v = this.form.getRawValue();
    // Derive mainCategories string value from the selected category option
    const mainCatOpt = this.mainCategoryOpts().find(o => o.id === v.categoryId);

    this.loading.set(true);
    const payload: ProductRequest = {
      productName:         v.productName,
      sku:                 v.sku,
      modelNumber:         v.modelNumber || null,
      brandId:             v.brandId,
      categoryId:          v.categoryId ?? null,
      shortDescription:    v.shortDescription,
      detailedDescription: v.detailedDescription || null,
      mainImageBase64:     null,
      galleryImagesBase64: this.galleryPreviews(),
      datasheetPdfBase64:  this.datasheetFile()?.base64 ?? null,
      datasheetFileName:   this.datasheetFile()?.name ?? null,
      manualPdfBase64:     this.manualFile()?.base64 ?? null,
      manualFileName:      this.manualFile()?.name ?? null,
      technicalSpecifications: (this.technicalSpecifications.value as ProductSpecification[])
        .filter(s => s.parameterName?.trim())
        .map((s, i) => ({ ...s, specOrder: i + 1 })),
      mainCategories: mainCatOpt?.value ? [mainCatOpt.value] : [],
      subCategories:  v.subCategories  ?? [],
      applications:   v.applications   ?? [],
      parameters:     v.parameters     ?? [],
      communications: v.communications ?? [],
      installations:  v.installations  ?? [],
      powers:         v.powers         ?? [],
      environments:   v.environments   ?? [],
      outputSignals:  v.outputSignals  ?? [],
      compliances:    v.compliances    ?? [],
      rank:           v.rank ?? null,
      features:       this.joinChips(this.features()),
      certifications: this.joinChips(this.certifications()),
      accessories:    this.joinChips(this.accessories()),
      relatedProductIds: v.relatedProductIds ?? [],
      stockStatus:       v.stockStatus,
    };

    console.log('PRODUCT PAYLOAD', payload);

    const req$ = this.isAdd
      ? this.productService.createProduct(payload)
      : this.productService.updateProduct(this.data.product!.id, payload);

    req$.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: product => this.dialogRef.close(product),
      error: () => this.loading.set(false),
    });
  }

  onCancel(): void { this.dialogRef.close(null); }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  private groupOpts(key: string): FilterMetaOption[] {
    return this.filterMetadata()?.groups.find(g => g.key === key)?.options ?? [];
  }

  private splitChips(value: string | null | undefined): string[] {
    if (!value) return [];
    return value.split(',').map(s => s.trim()).filter(Boolean);
  }

  private joinChips(arr: string[]): string | null {
    return arr.length ? arr.join(',') : null;
  }
}
