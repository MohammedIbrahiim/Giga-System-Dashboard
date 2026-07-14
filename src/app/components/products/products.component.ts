import {
  Component, DestroyRef, OnInit, computed, inject, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  BehaviorSubject, EMPTY, Subject, merge,
} from 'rxjs';
import {
  catchError, debounceTime, distinctUntilChanged,
  filter, finalize, map, switchMap,
} from 'rxjs/operators';
import { ProductService } from '../../core/services/product.service';
import { PartnerService } from '../../core/services/partner.service';
import {
  FilterChip, FilterMetaOption, ProductFilterMetadata,
} from '../../core/models/product-filter-metadata.model';
import { ProductFilterValue } from '../../core/models/product-filter.model';
import {
  Product, ProductQueryParams,
  STOCK_STATUS_OPTIONS, STOCK_LABEL_MAP,
} from '../../core/models/product.model';
import { ProductDialogComponent } from '../product-dialog/product-dialog.component';
import { DeleteConfirmDialogComponent } from '../delete-confirm-dialog/delete-confirm-dialog.component';
import { formatBase64Image } from '../../shared/utils/file-base64.util';

const SNACKBAR = { duration: 3000, panelClass: ['success-snackbar'], horizontalPosition: 'right' as const, verticalPosition: 'top' as const };
const ERR      = { duration: 4000, panelClass: ['error-snackbar'],   horizontalPosition: 'right' as const, verticalPosition: 'top' as const };

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatProgressBarModule,
    MatPaginatorModule,
    MatSortModule,
    MatMenuModule,
    MatTooltipModule,
  ],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss'],
})
export class ProductsComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly partnerService = inject(PartnerService);
  private readonly dialog         = inject(MatDialog);
  private readonly snackBar       = inject(MatSnackBar);
  private readonly destroyRef     = inject(DestroyRef);

  // ─── Table state ─────────────────────────────────────────────────────────

  readonly products      = signal<Product[]>([]);
  readonly loading       = signal(false);
  readonly totalElements = signal(0);
  readonly pageSize      = signal(10);
  readonly pageIndex     = signal(0);

  readonly displayedColumns = [
    'index', 'mainImage', 'productName', 'brand',
    'category', 'subcategory', 'stockStatus', 'rank',
    'gallery', 'datasheet', 'manual', 'actions',
  ];

  // ─── Filter controls (search / brand / stock) ─────────────────────────────

  readonly searchCtrl = new FormControl('', { nonNullable: true });
  readonly brandCtrl  = new FormControl('', { nonNullable: true });
  readonly stockCtrl  = new FormControl('', { nonNullable: true });

  readonly brandOptions    = signal<string[]>([]);
  readonly stockStatusOptions = STOCK_STATUS_OPTIONS;
  readonly formatImage        = formatBase64Image;

  // ─── Dynamic filter metadata ──────────────────────────────────────────────

  readonly filterMetadata        = signal<ProductFilterMetadata | null>(null);
  readonly tableFilterType       = signal<string>('');
  readonly tableFilterSelections = signal<Record<string, string[]>>({});
  readonly tableSubCategoryId    = signal<number | null>(null);

  // Filter Type dropdown: Main Category first, then all other metadata groups
  readonly tableFilterTypeOpts = computed(() => {
    const meta = this.filterMetadata();
    if (!meta) return [];
    const result: { key: string; title: string }[] = [];
    if (meta.mainCategoryGroup) {
      result.push({ key: meta.mainCategoryGroup.key, title: meta.mainCategoryGroup.title });
    }
    for (const g of meta.groups) result.push({ key: g.key, title: g.title });
    return result;
  });

  readonly tableCurrentFilterOpts = computed(() => {
    const type = this.tableFilterType();
    if (!type) return [];
    if (type === 'mainCategory') return this.filterMetadata()?.mainCategoryGroup?.options ?? [];
    return this.filterMetadata()?.groups.find(g => g.key === type)?.options ?? [];
  });

  readonly tableCurrentValues = computed(() =>
    this.tableFilterSelections()[this.tableFilterType()] ?? []
  );

  readonly tableCurrentFilterTitle = computed(() => {
    const type = this.tableFilterType();
    if (!type) return 'Filter Values';
    if (type === 'mainCategory') return this.filterMetadata()?.mainCategoryGroup?.title ?? 'Main Category';
    return this.filterMetadata()?.groups.find(g => g.key === type)?.title ?? 'Filter Values';
  });

  // Numeric IDs of the currently selected main categories — used to look up subcategories
  private readonly tableMainCategoryIds = computed(() => {
    const meta = this.filterMetadata();
    if (!meta?.mainCategoryGroup) return [];
    const selectedVals = this.tableFilterSelections()['mainCategory'] ?? [];
    return meta.mainCategoryGroup.options
      .filter(o => selectedVals.includes(o.value))
      .map(o => o.id)
      .filter((id): id is number => id != null);
  });

  // Subcategory options available for the currently selected main category(ies)
  readonly tableAvailableSubOpts = computed((): FilterMetaOption[] => {
    const meta = this.filterMetadata();
    const ids = this.tableMainCategoryIds();
    if (!meta || !ids.length) return [];
    const byId = new Map<number, FilterMetaOption>();
    for (const id of ids) {
      for (const opt of meta.subcategories[String(id)] ?? []) {
        if (opt.id != null) byId.set(opt.id, opt);
      }
    }
    return [...byId.values()];
  });

  readonly tableFilterChips = computed((): FilterChip[] => {
    const metadata = this.filterMetadata();
    if (!metadata) return [];
    const selections = this.tableFilterSelections();
    const chips: FilterChip[] = [];

    if (metadata.mainCategoryGroup) {
      const vals = selections[metadata.mainCategoryGroup.key] ?? [];
      for (const val of vals) {
        chips.push({
          groupKey:   metadata.mainCategoryGroup.key,
          groupTitle: metadata.mainCategoryGroup.title,
          value:      val,
          label:      metadata.mainCategoryGroup.options.find(o => o.value === val)?.label ?? val,
        });
      }
    }

    for (const group of metadata.groups) {
      const vals = selections[group.key] ?? [];
      for (const val of vals) {
        chips.push({
          groupKey:   group.key,
          groupTitle: group.title,
          value:      val,
          label:      group.options.find(o => o.value === val)?.label ?? val,
        });
      }
    }

    const subId = this.tableSubCategoryId();
    if (subId != null) {
      const opt = this.tableAvailableSubOpts().find(o => o.id === subId);
      chips.push({
        groupKey:   'subCategory',
        groupTitle: 'Subcategory',
        value:      String(subId),
        label:      opt?.label ?? String(subId),
      });
    }

    return chips;
  });

  // ─── Query stream ─────────────────────────────────────────────────────────

  private readonly query$  = new BehaviorSubject<ProductQueryParams>({
    page: 0, size: 10, sortBy: 'productName', sortDir: 'asc',
  });
  private readonly reload$ = new Subject<void>();

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Load partner names for brand filter
    this.partnerService.getPartners({ size: 100, active: true }).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: page => {
        const names = page.content.filter(p => p.active).map(p => p.name).sort();
        this.brandOptions.set(names);
      },
      error: () => {},
    });

    // Load filter metadata for dynamic filter type selector
    this.productService.getProductFilterMetadata().pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: meta => this.filterMetadata.set(meta),
      error: () => {},
    });

    // Debounce search; react immediately to brand/stock changes
    merge(
      this.searchCtrl.valueChanges.pipe(debounceTime(350), distinctUntilChanged()),
      this.brandCtrl.valueChanges.pipe(distinctUntilChanged()),
      this.stockCtrl.valueChanges.pipe(distinctUntilChanged()),
    ).pipe(takeUntilDestroyed(this.destroyRef))
     .subscribe(() => { this.pageIndex.set(0); this.pushQuery(); });

    // Drive the table from the query stream
    merge(
      this.query$.pipe(distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))),
      this.reload$.pipe(map(() => this.query$.value)),
    ).pipe(
      takeUntilDestroyed(this.destroyRef),
      switchMap(params => {
        this.loading.set(true);
        return this.productService.getProducts(params).pipe(
          finalize(() => this.loading.set(false)),
          catchError(() => {
            this.snackBar.open('Failed to load products', '✕', ERR);
            return EMPTY;
          }),
        );
      }),
    ).subscribe(page => {
      const sorted = [...page.content].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
      this.products.set(sorted);
      this.totalElements.set(page.totalElements);
    });
  }

  // ─── Dynamic filter actions ───────────────────────────────────────────────

  onTableFilterTypeChange(type: string): void {
    this.tableFilterType.set(type);
  }

  onTableFilterValuesChange(values: string[]): void {
    const type = this.tableFilterType();
    if (!type) return;
    this.pageIndex.set(0);
    const next = { ...this.tableFilterSelections() };
    if (values.length === 0) delete next[type];
    else next[type] = values;
    this.tableFilterSelections.set(next);
    // Main category changed — the available subcategory list shifts, so drop the current pick
    if (type === 'mainCategory') this.tableSubCategoryId.set(null);
    this.pushQuery();
  }

  onTableSubCategoryChange(id: number | null): void {
    this.tableSubCategoryId.set(id);
    this.pageIndex.set(0);
    this.pushQuery();
  }

  removeTableFilterChip(chip: FilterChip): void {
    this.pageIndex.set(0);
    if (chip.groupKey === 'subCategory') {
      this.tableSubCategoryId.set(null);
      this.pushQuery();
      return;
    }
    const next = { ...this.tableFilterSelections() };
    const vals = (next[chip.groupKey] ?? []).filter(v => v !== chip.value);
    if (vals.length === 0) delete next[chip.groupKey];
    else next[chip.groupKey] = vals;
    this.tableFilterSelections.set(next);
    if (chip.groupKey === 'mainCategory') this.tableSubCategoryId.set(null);
    this.pushQuery();
  }

  clearTableFilters(): void {
    this.tableFilterSelections.set({});
    this.tableFilterType.set('');
    this.tableSubCategoryId.set(null);
    this.searchCtrl.setValue('');
    this.brandCtrl.setValue('');
    this.stockCtrl.setValue('');
    this.pageIndex.set(0);
    this.pushQuery();
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.searchCtrl.value ||
      this.brandCtrl.value  ||
      this.stockCtrl.value  ||
      this.tableSubCategoryId() != null ||
      Object.keys(this.tableFilterSelections()).length > 0
    );
  }

  // ─── Pagination / Sort ────────────────────────────────────────────────────

  onPageChange(e: PageEvent): void {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
    this.query$.next({ ...this.query$.value, page: e.pageIndex, size: e.pageSize });
  }

  onSortChange(e: Sort): void {
    if (!e.direction) return;
    this.query$.next({
      ...this.query$.value, page: 0,
      sortBy: e.active, sortDir: e.direction as 'asc' | 'desc',
    });
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  openAddDialog(): void {
    this.dialog.open(ProductDialogComponent, { width: '720px', data: { mode: 'add' } })
      .afterClosed().subscribe(product => {
        if (product) {
          this.snackBar.open(`"${product.productName}" created!`, '✕', SNACKBAR);
          this.reload();
        }
      });
  }

  openEditDialog(product: Product): void {
    this.dialog.open(ProductDialogComponent, {
      width: '720px',
      data: { mode: 'edit', product },
    }).afterClosed().subscribe(updated => {
      if (updated) {
        this.snackBar.open(`"${updated.productName}" updated!`, '✕', SNACKBAR);
        this.reload();
      }
    });
  }

  onDelete(product: Product): void {
    this.dialog.open(DeleteConfirmDialogComponent, {
      width: '420px',
      data: { name: product.productName },
    }).afterClosed().pipe(
      filter(Boolean),
      switchMap(() => this.productService.deleteProduct(product.id)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.snackBar.open(`"${product.productName}" deleted!`, '✕', SNACKBAR);
        this.reload();
      },
      error: () => this.snackBar.open('Failed to delete product', '✕', ERR),
    });
  }

  // ─── Display helpers ──────────────────────────────────────────────────────

  getCategoryClass(category: ProductFilterValue | null | undefined): string {
    if (!category) return '';
    const classes = [
      'badge-sensors', 'badge-flow', 'badge-water',
      'badge-loggers', 'badge-weather', 'badge-telemetry',
    ];
    return classes[(category.id - 1) % classes.length] ?? '';
  }

  getStockLabel(status: string): string {
    return STOCK_LABEL_MAP[status as keyof typeof STOCK_LABEL_MAP] ?? status;
  }

  getStockClass(status: string): string {
    const map: Record<string, string> = {
      IN_STOCK:     'badge-in-stock',
      ON_REQUEST:   'badge-on-request',
      OUT_OF_STOCK: 'badge-out-of-stock',
    };
    return map[status] ?? '';
  }

  rowIndex(i: number): number {
    return this.pageIndex() * this.pageSize() + i + 1;
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private pushQuery(): void {
    const s = this.tableFilterSelections();
    this.query$.next({
      ...this.query$.value,
      page:          0,
      search:        this.searchCtrl.value || undefined,
      brand:         this.brandCtrl.value  || undefined,
      stockStatus:   this.stockCtrl.value  || undefined,
      mainCategory:  this.joinVals(s['mainCategory']),
      subCategoryId: this.tableSubCategoryId() ?? undefined,
      application:   this.joinVals(s['application']),
      parameter:     this.joinVals(s['parameter']),
      communication: this.joinVals(s['communication']),
      installation:  this.joinVals(s['installation']),
      power:         this.joinVals(s['power']),
      environment:   this.joinVals(s['environment']),
      outputSignal:  this.joinVals(s['outputSignal']),
      compliance:    this.joinVals(s['compliance']),
    });
  }

  private joinVals(vals: string[] | undefined): string | undefined {
    return vals?.length ? vals.join(',') : undefined;
  }

  private reload(): void { this.reload$.next(); }
}
