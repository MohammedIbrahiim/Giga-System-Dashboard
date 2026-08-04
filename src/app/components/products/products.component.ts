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
  // Main Category: single-select by numeric ID (sent to the API as categoryId)
  readonly tableCategoryId       = signal<number | null>(null);
  readonly tableSubCategoryId    = signal<number | null>(null);
  // Any other metadata group (application, parameter, communication, installation,
  // power, environment, outputSignal, compliance): single-select, sent as filterValueId
  readonly tableFilterValueId    = signal<number | null>(null);

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

  readonly tableCurrentFilterTitle = computed(() => {
    const type = this.tableFilterType();
    if (!type) return 'Filter Values';
    if (type === 'mainCategory') return this.filterMetadata()?.mainCategoryGroup?.title ?? 'Main Category';
    return this.filterMetadata()?.groups.find(g => g.key === type)?.title ?? 'Filter Values';
  });

  // Subcategory options available for the currently selected main category
  readonly tableAvailableSubOpts = computed((): FilterMetaOption[] => {
    const meta = this.filterMetadata();
    const categoryId = this.tableCategoryId();
    if (!meta || categoryId == null) return [];
    return meta.subcategories[String(categoryId)] ?? [];
  });

  readonly tableFilterChips = computed((): FilterChip[] => {
    const metadata = this.filterMetadata();
    if (!metadata) return [];
    const chips: FilterChip[] = [];

    if (metadata.mainCategoryGroup) {
      const categoryId = this.tableCategoryId();
      if (categoryId != null) {
        const opt = metadata.mainCategoryGroup.options.find(o => o.id === categoryId);
        chips.push({
          groupKey:   metadata.mainCategoryGroup.key,
          groupTitle: metadata.mainCategoryGroup.title,
          value:      String(categoryId),
          label:      opt?.label ?? String(categoryId),
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

    const filterValueId = this.tableFilterValueId();
    const type = this.tableFilterType();
    if (filterValueId != null && type && type !== 'mainCategory') {
      const group = metadata.groups.find(g => g.key === type);
      const opt = group?.options.find(o => o.id === filterValueId);
      chips.push({
        groupKey:   type,
        groupTitle: group?.title ?? 'Filter',
        value:      String(filterValueId),
        label:      opt?.label ?? String(filterValueId),
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

  // Filter Type changed — clear the second dropdown's selection (and whatever ID it
  // was driving) so a stale filter from the previous type can't leak into the request.
  onTableFilterTypeChange(type: string): void {
    this.tableFilterType.set(type);
    this.tableCategoryId.set(null);
    this.tableSubCategoryId.set(null);
    this.tableFilterValueId.set(null);
  }

  // Main Category dropdown (single-select) — sends categoryId, never filterValueId.
  onTableCategoryChange(id: number | null): void {
    this.tableCategoryId.set(id);
    // Main category changed — the available subcategory list shifts, so drop the current pick
    this.tableSubCategoryId.set(null);
    this.pageIndex.set(0);
    this.pushQuery();
  }

  // Dependent Subcategory dropdown — sends subCategoryId.
  onTableSubCategoryChange(id: number | null): void {
    this.tableSubCategoryId.set(id);
    this.pageIndex.set(0);
    this.pushQuery();
  }

  // Generic filter groups (application, parameter, communication, installation, power,
  // environment, outputSignal, compliance) — sends filterValueId, never categoryId.
  onTableFilterValueChange(id: number | null): void {
    this.tableFilterValueId.set(id);
    this.pageIndex.set(0);
    this.pushQuery();
  }

  removeTableFilterChip(chip: FilterChip): void {
    this.pageIndex.set(0);
    if (chip.groupKey === 'subCategory') {
      this.tableSubCategoryId.set(null);
    } else if (chip.groupKey === 'mainCategory') {
      this.tableCategoryId.set(null);
      this.tableSubCategoryId.set(null);
    } else {
      this.tableFilterValueId.set(null);
    }
    this.pushQuery();
  }

  clearTableFilters(): void {
    this.tableFilterType.set('');
    this.tableCategoryId.set(null);
    this.tableSubCategoryId.set(null);
    this.tableFilterValueId.set(null);
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
      this.tableCategoryId() != null ||
      this.tableSubCategoryId() != null ||
      this.tableFilterValueId() != null
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
    this.query$.next({
      ...this.query$.value,
      page:          0,
      search:        this.searchCtrl.value || undefined,
      brand:         this.brandCtrl.value  || undefined,
      stockStatus:   this.stockCtrl.value  || undefined,
      categoryId:    this.tableCategoryId() ?? undefined,
      subCategoryId: this.tableSubCategoryId() ?? undefined,
      filterValueId: this.tableFilterValueId() ?? undefined,
    });
  }

  private reload(): void { this.reload$.next(); }
}
