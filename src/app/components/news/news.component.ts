import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, EMPTY, Subject, merge } from 'rxjs';
import { catchError, distinctUntilChanged, filter, finalize, map, switchMap } from 'rxjs/operators';
import { NewsService } from '../../core/services/news.service';
import {
  NewsArticle, NewsQueryParams,
  CATEGORY_OPTIONS, STATUS_OPTIONS, CATEGORY_LABEL_MAP, STATUS_LABEL_MAP,
} from '../../core/models/news.model';
import { NewsDialogComponent } from '../news-dialog/news-dialog.component';
import { DeleteConfirmDialogComponent } from '../delete-confirm-dialog/delete-confirm-dialog.component';
import { FilterBarComponent } from '../../shared/components/filter-bar/filter-bar.component';
import { FilterState } from '../../shared/models/filter.model';
import { SelectOption } from '../../shared/models/filter.model';
import { formatBase64Image } from '../../shared/utils/file-base64.util';

const SNACKBAR = { duration: 3000, panelClass: ['success-snackbar'], horizontalPosition: 'right' as const, verticalPosition: 'top' as const };
const ERR      = { duration: 4000, panelClass: ['error-snackbar'],   horizontalPosition: 'right' as const, verticalPosition: 'top' as const };

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressBarModule,
    MatPaginatorModule,
    MatSortModule,
    MatMenuModule,
    MatTooltipModule,
    MatSlideToggleModule,
    FilterBarComponent,
  ],
  templateUrl: './news.component.html',
  styleUrls: ['./news.component.scss'],
})
export class NewsComponent implements OnInit {
  private readonly newsService = inject(NewsService);
  private readonly dialog      = inject(MatDialog);
  private readonly snackBar    = inject(MatSnackBar);
  private readonly destroyRef  = inject(DestroyRef);

  readonly articles      = signal<NewsArticle[]>([]);
  readonly loading       = signal(false);
  readonly totalElements = signal(0);
  readonly pageSize      = signal(10);
  readonly pageIndex     = signal(0);

  readonly displayedColumns = [
    'index', 'cover', 'title', 'category', 'status',
    'featured', 'pinned', 'author', 'publishDate', 'images', 'actions',
  ];

  readonly categorySelectOptions: SelectOption[] = CATEGORY_OPTIONS;
  readonly statusSelectOptions:   SelectOption[] = STATUS_OPTIONS;

  readonly formatImage = formatBase64Image;

  private readonly query$  = new BehaviorSubject<NewsQueryParams>({
    page: 0, size: 10, sortBy: 'publishDate', sortDir: 'desc',
  });
  // Explicit reload trigger — separate from query$ so distinctUntilChanged never blocks it
  private readonly reload$ = new Subject<void>();

  ngOnInit(): void {
    merge(
      // State changes: suppress identical consecutive params (catches FilterBar's
      // auto-emission at t=350ms which repeats the same initial BehaviorSubject value)
      this.query$.pipe(distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))),
      // Forced reloads (after CRUD): always pass through, use current params
      this.reload$.pipe(map(() => this.query$.value)),
    ).pipe(
      takeUntilDestroyed(this.destroyRef),
      switchMap(params => {
        this.loading.set(true);
        return this.newsService.getNews(params).pipe(
          finalize(() => this.loading.set(false)),
          catchError(() => {
            this.snackBar.open('Failed to load articles', '✕', ERR);
            return EMPTY;
          }),
        );
      }),
    ).subscribe(page => {
      this.articles.set(page.content);
      this.totalElements.set(page.totalElements);
    });
  }

  // ─── Filters / Pagination / Sort ─────────────────────────────────────────

  onFiltersChange(f: FilterState): void {
    this.pageIndex.set(0);
    this.query$.next({
      ...this.query$.value,
      page:     0,
      search:   f.search   || undefined,
      category: f.category || undefined,
      status:   f.status   || undefined,
      featured: f.featured === 'true' ? true : f.featured === 'false' ? false : undefined,
      pinned:   f.pinned   === 'true' ? true : f.pinned   === 'false' ? false : undefined,
      fromDate: f.fromDate || undefined,
      toDate:   f.toDate   || undefined,
    });
  }

  onPageChange(e: PageEvent): void {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
    this.query$.next({ ...this.query$.value, page: e.pageIndex, size: e.pageSize });
  }

  onSortChange(e: Sort): void {
    if (!e.direction) return;
    this.query$.next({ ...this.query$.value, page: 0, sortBy: e.active, sortDir: e.direction as 'asc' | 'desc' });
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────

  openAddDialog(): void {
    this.dialog.open(NewsDialogComponent, { width: '640px', data: { mode: 'add' } })
      .afterClosed().subscribe(article => {
        if (article) {
          this.snackBar.open(`"${article.title}" created!`, '✕', SNACKBAR);
          this.reload();
        }
      });
  }

  openEditDialog(article: NewsArticle): void {
    this.dialog.open(NewsDialogComponent, {
      width: '640px',
      data: { mode: 'edit', article },
    }).afterClosed().subscribe(updated => {
      if (updated) {
        this.snackBar.open(`"${updated.title}" updated!`, '✕', SNACKBAR);
        this.reload();
      }
    });
  }

  onDelete(article: NewsArticle): void {
    this.dialog.open(DeleteConfirmDialogComponent, {
      width: '420px',
      data: { name: article.title },
    }).afterClosed().pipe(
      filter(Boolean),
      switchMap(() => this.newsService.deleteNews(article.id)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.snackBar.open(`"${article.title}" deleted!`, '✕', SNACKBAR);
        this.reload();
      },
      error: () => this.snackBar.open('Failed to delete article', '✕', ERR),
    });
  }

  // ─── Quick actions ───────────────────────────────────────────────────────

  onPublish(article: NewsArticle): void {
    this.newsService.publishNews(article.id).subscribe({
      next: updated => {
        this.snackBar.open(`"${updated.title}" published!`, '✕', SNACKBAR);
        this.updateArticle(updated);
      },
      error: () => this.snackBar.open('Failed to publish article', '✕', ERR),
    });
  }

  onUnpublish(article: NewsArticle): void {
    this.newsService.unpublishNews(article.id).subscribe({
      next: updated => {
        this.snackBar.open(`"${updated.title}" moved to Draft.`, '✕', SNACKBAR);
        this.updateArticle(updated);
      },
      error: () => this.snackBar.open('Failed to unpublish article', '✕', ERR),
    });
  }

  onArchive(article: NewsArticle): void {
    this.newsService.archiveNews(article.id).subscribe({
      next: updated => {
        this.snackBar.open(`"${updated.title}" archived.`, '✕', SNACKBAR);
        this.updateArticle(updated);
      },
      error: () => this.snackBar.open('Failed to archive article', '✕', ERR),
    });
  }

  onToggleFeatured(article: NewsArticle, featured: boolean): void {
    this.updateArticle({ ...article, featured });
    this.newsService.toggleFeatured(article.id, featured).subscribe({
      next: updated => this.updateArticle(updated),
      error: () => {
        this.updateArticle({ ...article });
        this.snackBar.open('Failed to update featured status', '✕', ERR);
      },
    });
  }

  onTogglePinned(article: NewsArticle, pinned: boolean): void {
    this.updateArticle({ ...article, pinned });
    this.newsService.togglePinned(article.id, pinned).subscribe({
      next: updated => this.updateArticle(updated),
      error: () => {
        this.updateArticle({ ...article });
        this.snackBar.open('Failed to update pinned status', '✕', ERR);
      },
    });
  }

  // ─── Display helpers ─────────────────────────────────────────────────────

  getCategoryLabel(category: string): string {
    return CATEGORY_LABEL_MAP[category as keyof typeof CATEGORY_LABEL_MAP] ?? category;
  }

  getStatusLabel(status: string): string {
    return STATUS_LABEL_MAP[status as keyof typeof STATUS_LABEL_MAP] ?? status;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      DRAFT:     'badge-draft',
      PUBLISHED: 'badge-published',
      ARCHIVED:  'badge-archived',
    };
    return map[status] ?? '';
  }

  getCategoryClass(category: string): string {
    const map: Record<string, string> = {
      COMPANY_NEWS:    'badge-company',
      PRODUCT_UPDATES: 'badge-product',
      EVENTS:          'badge-events',
      ANNOUNCEMENTS:   'badge-announcements',
    };
    return map[category] ?? '';
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private reload(): void { this.reload$.next(); }

  private updateArticle(updated: NewsArticle): void {
    this.articles.update(list => list.map(a => a.id === updated.id ? updated : a));
  }
}
