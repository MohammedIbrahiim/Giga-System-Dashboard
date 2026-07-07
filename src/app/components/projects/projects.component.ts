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
import { ProjectService } from '../../core/services/project.service';
import {
  Project, ProjectQueryParams,
  CATEGORY_OPTIONS, STATUS_OPTIONS, CATEGORY_LABEL_MAP, STATUS_LABEL_MAP,
} from '../../core/models/project.model';
import { ProjectDialogComponent } from '../project-dialog/project-dialog.component';
import { DeleteConfirmDialogComponent } from '../delete-confirm-dialog/delete-confirm-dialog.component';
import { FilterBarComponent } from '../../shared/components/filter-bar/filter-bar.component';
import { FilterState, SelectOption } from '../../shared/models/filter.model';
import { formatBase64Image } from '../../shared/utils/file-base64.util';

const SNACKBAR = { duration: 3000, panelClass: ['success-snackbar'], horizontalPosition: 'right' as const, verticalPosition: 'top' as const };
const ERR      = { duration: 4000, panelClass: ['error-snackbar'],   horizontalPosition: 'right' as const, verticalPosition: 'top' as const };

@Component({
  selector: 'app-projects',
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
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss'],
})
export class ProjectsComponent implements OnInit {
  private readonly projectService = inject(ProjectService);
  private readonly dialog         = inject(MatDialog);
  private readonly snackBar       = inject(MatSnackBar);
  private readonly destroyRef     = inject(DestroyRef);

  readonly projects       = signal<Project[]>([]);
  readonly loading        = signal(false);
  readonly totalElements  = signal(0);
  readonly pageSize       = signal(10);
  readonly pageIndex      = signal(0);
  readonly countryOptions = signal<string[]>([]);

  readonly displayedColumns = [
    'index', 'clientLogo', 'projectTitle', 'projectCode', 'clientName',
    'location', 'category', 'status', 'startDate', 'endDate',
    'featured', 'archived', 'images', 'documents', 'actions',
  ];

  readonly categorySelectOptions: SelectOption[] = CATEGORY_OPTIONS;
  readonly statusSelectOptions:   SelectOption[] = STATUS_OPTIONS;
  readonly yearOptions: SelectOption[] = this.buildYearOptions();
  readonly formatImage = formatBase64Image;

  private readonly query$  = new BehaviorSubject<ProjectQueryParams>({
    page: 0, size: 10, sortBy: 'sortOrder', sortDir: 'asc',
  });
  // Explicit reload trigger — separate from query$ so distinctUntilChanged never blocks it
  private readonly reload$ = new Subject<void>();

  ngOnInit(): void {
    // getAllProjects is a separate endpoint needed only for country filter dropdown.
    // takeUntilDestroyed ensures cleanup if the component unmounts before response.
    this.projectService.getAllProjects().pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: all => {
        const countries = [...new Set(all.map(p => p.country).filter(Boolean))].sort();
        this.countryOptions.set(countries);
      },
      error: () => {},
    });

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
        return this.projectService.getProjects(params).pipe(
          finalize(() => this.loading.set(false)),
          catchError(() => {
            this.snackBar.open('Failed to load projects', '✕', ERR);
            return EMPTY;
          }),
        );
      }),
    ).subscribe(page => {
      this.projects.set(page.content);
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
      country:  f.country  || undefined,
      status:   f.status   || undefined,
      year:     f.year ? Number(f.year) : undefined,
      featured: f.featured === 'true' ? true : f.featured === 'false' ? false : undefined,
      archived: f.archived === 'true' ? true : f.archived === 'false' ? false : undefined,
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
    this.dialog.open(ProjectDialogComponent, { width: '700px', data: { mode: 'add' } })
      .afterClosed().subscribe(project => {
        if (project) {
          this.snackBar.open(`"${project.projectTitle}" created!`, '✕', SNACKBAR);
          this.reload();
        }
      });
  }

  openEditDialog(project: Project): void {
    this.dialog.open(ProjectDialogComponent, {
      width: '700px',
      data: { mode: 'edit', project },
    }).afterClosed().subscribe(updated => {
      if (updated) {
        this.snackBar.open(`"${updated.projectTitle}" updated!`, '✕', SNACKBAR);
        this.reload();
      }
    });
  }

  onDelete(project: Project): void {
    this.dialog.open(DeleteConfirmDialogComponent, {
      width: '420px',
      data: { name: project.projectTitle },
    }).afterClosed().pipe(
      filter(Boolean),
      switchMap(() => this.projectService.deleteProject(project.id)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.snackBar.open(`"${project.projectTitle}" deleted!`, '✕', SNACKBAR);
        this.reload();
      },
      error: () => this.snackBar.open('Failed to delete project', '✕', ERR),
    });
  }

  // ─── Quick toggles ───────────────────────────────────────────────────────

  onToggleFeatured(project: Project, featured: boolean): void {
    this.updateProject({ ...project, featured });
    this.projectService.toggleFeatured(project.id, featured).subscribe({
      next:  updated => this.updateProject(updated),
      error: () => {
        this.updateProject({ ...project });
        this.snackBar.open('Failed to update featured status', '✕', ERR);
      },
    });
  }

  onToggleArchived(project: Project, archived: boolean): void {
    this.updateProject({ ...project, archived });
    this.projectService.toggleArchived(project.id, archived).subscribe({
      next:  updated => this.updateProject(updated),
      error: () => {
        this.updateProject({ ...project });
        this.snackBar.open('Failed to update archived status', '✕', ERR);
      },
    });
  }

  // ─── Display helpers ─────────────────────────────────────────────────────

  getCategoryLabel(cat: string): string {
    return CATEGORY_LABEL_MAP[cat as keyof typeof CATEGORY_LABEL_MAP] ?? cat;
  }

  getStatusLabel(status: string): string {
    return STATUS_LABEL_MAP[status as keyof typeof STATUS_LABEL_MAP] ?? status;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      ONGOING:   'badge-ongoing',
      COMPLETED: 'badge-completed',
      UPCOMING:  'badge-upcoming',
    };
    return map[status] ?? '';
  }

  getCategoryClass(cat: string): string {
    const map: Record<string, string> = {
      WATER_QUALITY_MONITORING:     'badge-water',
      MARINE_INSTRUMENTATION:       'badge-marine',
      METEOROLOGICAL_STATIONS:      'badge-meteo',
      WATER_QUANTITY_AND_DISCHARGE: 'badge-quantity',
      SURVEY_AND_BATHYMETRY:        'badge-survey',
      LABORATORY:                   'badge-lab',
    };
    return map[cat] ?? '';
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private reload(): void { this.reload$.next(); }

  private updateProject(updated: Project): void {
    this.projects.update(list => list.map(p => p.id === updated.id ? updated : p));
  }

  private buildYearOptions(): SelectOption[] {
    const current = new Date().getFullYear();
    return Array.from({ length: current - 2009 + 2 }, (_, i) => {
      const y = current + 1 - i;
      return { value: String(y), label: String(y) };
    });
  }
}
