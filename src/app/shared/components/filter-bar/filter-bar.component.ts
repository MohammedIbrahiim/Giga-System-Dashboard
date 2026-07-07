import {
  Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith } from 'rxjs/operators';
import { FilterState, SelectOption } from '../../models/filter.model';

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './filter-bar.component.html',
  styleUrls: ['./filter-bar.component.scss'],
})
export class FilterBarComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  @Input() searchPlaceholder = 'Search…';

  // Category select — enum-based SelectOption[]
  @Input() showCategory = false;
  @Input() categoryLabel = 'Category';
  @Input() categoryOptions: string[] = [];
  @Input() categorySelectOptions: SelectOption[] = [];

  // Status select
  @Input() showStatus = false;
  @Input() statusOptions: SelectOption[] = [];

  // Team select
  @Input() showTeam = false;
  @Input() teamOptions: string[] = [];

  // Country select
  @Input() showCountry = false;
  @Input() countryOptions: string[] = [];

  // Year select
  @Input() showYear = false;
  @Input() yearOptions: SelectOption[] = [];

  // Brand select
  @Input() showBrand = false;
  @Input() brandOptions: string[] = [];

  // Subcategory select
  @Input() showSubcategory = false;
  @Input() subcategoryOptions: string[] = [];
  @Input() subcategorySelectOptions: SelectOption[] = [];

  // Stock status select
  @Input() showStockStatus = false;
  @Input() stockStatusOptions: SelectOption[] = [];

  // Featured / Pinned / Archived dropdowns
  @Input() showFeatured  = false;
  @Input() showPinned    = false;
  @Input() showArchived  = false;

  // Date range
  @Input() showDateRange = false;

  // Number ranges
  @Input() showPriceRange    = false;
  @Input() showStockRange    = false;
  @Input() showProgressRange = false;

  @Output() filtersChange = new EventEmitter<FilterState>();

  // ─── Controls ────────────────────────────────────────────────────────────

  readonly searchCtrl   = new FormControl('');
  readonly categoryCtrl = new FormControl('');
  readonly statusCtrl   = new FormControl('');
  readonly teamCtrl     = new FormControl('');
  readonly featuredCtrl = new FormControl('');
  readonly pinnedCtrl   = new FormControl('');
  readonly countryCtrl      = new FormControl('');
  readonly yearCtrl         = new FormControl('');
  readonly archivedCtrl     = new FormControl('');
  readonly brandCtrl        = new FormControl('');
  readonly subcategoryCtrl  = new FormControl('');
  readonly stockStatusCtrl  = new FormControl('');

  readonly dateRangeGroup: FormGroup = this.fb.group({
    start: this.fb.control<Date | null>(null),
    end:   this.fb.control<Date | null>(null),
  });

  readonly minPriceCtrl    = new FormControl<number | null>(null);
  readonly maxPriceCtrl    = new FormControl<number | null>(null);
  readonly minStockCtrl    = new FormControl<number | null>(null);
  readonly maxStockCtrl    = new FormControl<number | null>(null);
  readonly minProgressCtrl = new FormControl<number | null>(null);
  readonly maxProgressCtrl = new FormControl<number | null>(null);

  ngOnInit(): void {
    combineLatest([
      this.searchCtrl.valueChanges.pipe(startWith(''), debounceTime(350), distinctUntilChanged()),
      this.categoryCtrl.valueChanges.pipe(startWith('')),
      this.statusCtrl.valueChanges.pipe(startWith('')),
      this.teamCtrl.valueChanges.pipe(startWith('')),
      this.featuredCtrl.valueChanges.pipe(startWith('')),
      this.pinnedCtrl.valueChanges.pipe(startWith('')),
      this.countryCtrl.valueChanges.pipe(startWith('')),
      this.yearCtrl.valueChanges.pipe(startWith('')),
      this.archivedCtrl.valueChanges.pipe(startWith('')),
      this.brandCtrl.valueChanges.pipe(startWith('')),
      this.subcategoryCtrl.valueChanges.pipe(startWith('')),
      this.stockStatusCtrl.valueChanges.pipe(startWith('')),
      this.dateRangeGroup.valueChanges.pipe(startWith(this.dateRangeGroup.value)),
      this.minPriceCtrl.valueChanges.pipe(startWith(null), debounceTime(400)),
      this.maxPriceCtrl.valueChanges.pipe(startWith(null), debounceTime(400)),
      this.minStockCtrl.valueChanges.pipe(startWith(null), debounceTime(400)),
      this.maxStockCtrl.valueChanges.pipe(startWith(null), debounceTime(400)),
      this.minProgressCtrl.valueChanges.pipe(startWith(null), debounceTime(400)),
      this.maxProgressCtrl.valueChanges.pipe(startWith(null), debounceTime(400)),
    ]).pipe(
      takeUntilDestroyed(this.destroyRef),
      map(([search, category, status, team, featured, pinned, country, year, archived,
            brand, subcategory, stockStatus,
            dateRange, minPrice, maxPrice, minStock, maxStock, minProgress, maxProgress]) => ({
        search:      search      ?? '',
        category:    category    ?? '',
        status:      status      ?? '',
        team:        team        ?? '',
        featured:    featured    ?? '',
        pinned:      pinned      ?? '',
        country:     country     ?? '',
        year:        year        ?? '',
        archived:    archived    ?? '',
        brand:       brand       ?? '',
        subcategory: subcategory ?? '',
        stockStatus: stockStatus ?? '',
        fromDate:    this.fmt(dateRange?.start ?? null),
        toDate:      this.fmt(dateRange?.end   ?? null),
        minPrice,    maxPrice,
        minStock,    maxStock,
        minProgress, maxProgress,
      } as FilterState)),
    ).subscribe(state => this.filtersChange.emit(state));
  }

  clear(): void {
    this.searchCtrl.setValue('',        { emitEvent: false });
    this.categoryCtrl.setValue('',      { emitEvent: false });
    this.statusCtrl.setValue('',        { emitEvent: false });
    this.teamCtrl.setValue('',          { emitEvent: false });
    this.featuredCtrl.setValue('',      { emitEvent: false });
    this.pinnedCtrl.setValue('',        { emitEvent: false });
    this.countryCtrl.setValue('',       { emitEvent: false });
    this.yearCtrl.setValue('',          { emitEvent: false });
    this.archivedCtrl.setValue('',      { emitEvent: false });
    this.brandCtrl.setValue('',         { emitEvent: false });
    this.subcategoryCtrl.setValue('',   { emitEvent: false });
    this.stockStatusCtrl.setValue('',   { emitEvent: false });
    this.dateRangeGroup.setValue({ start: null, end: null }, { emitEvent: false });
    this.minPriceCtrl.setValue(null,    { emitEvent: false });
    this.maxPriceCtrl.setValue(null,    { emitEvent: false });
    this.minStockCtrl.setValue(null,    { emitEvent: false });
    this.maxStockCtrl.setValue(null,    { emitEvent: false });
    this.minProgressCtrl.setValue(null, { emitEvent: false });
    this.maxProgressCtrl.setValue(null, { emitEvent: false });
    this.filtersChange.emit({
      search: '', category: '', status: '', team: '',
      featured: '', pinned: '', country: '', year: '', archived: '',
      brand: '', subcategory: '', stockStatus: '',
      fromDate: '', toDate: '',
      minPrice: null, maxPrice: null, minStock: null, maxStock: null,
      minProgress: null, maxProgress: null,
    });
  }

  private fmt(date: Date | null): string {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
