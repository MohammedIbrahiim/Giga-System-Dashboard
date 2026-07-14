import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';
import { finalize } from 'rxjs/operators';
import { NewsService } from '../../core/services/news.service';
import { AuthService } from '../../services/auth.service';
import {
  NewsArticle, NewsArticleRequest, NewsDialogData,
  CATEGORY_OPTIONS, STATUS_OPTIONS,
} from '../../core/models/news.model';
import { fileToBase64, formatBase64Image } from '../../shared/utils/file-base64.util';

@Component({
  selector: 'app-news-dialog',
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
    MatChipsModule,
  ],
  templateUrl: './news-dialog.component.html',
  styleUrls: ['./news-dialog.component.scss'],
})
export class NewsDialogComponent implements OnInit {
  form!: FormGroup;

  readonly loading        = signal(false);
  readonly coverPreview   = signal<string | null>(null);
  readonly galleryPreviews = signal<string[]>([]);
  readonly tags           = signal<string[]>([]);

  readonly separatorKeysCodes = [ENTER, COMMA] as const;
  readonly categoryOptions    = CATEGORY_OPTIONS;
  readonly statusOptions      = STATUS_OPTIONS;


  constructor(
    private readonly fb:          FormBuilder,
    private readonly newsService: NewsService,
    private readonly authService: AuthService,
    public  readonly dialogRef:   MatDialogRef<NewsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: NewsDialogData,
  ) {}

  get isAdd(): boolean  { return this.data.mode === 'add'; }
  get isEdit(): boolean { return this.data.mode === 'edit'; }

  ngOnInit(): void {
    this.form = this.fb.group({
      title:            ['', Validators.required],
      content:          ['', Validators.required],
      author:           ['', Validators.required],
      category:         ['', Validators.required],
      status:           ['DRAFT', Validators.required],
      publishDate:      [null, Validators.required],
      featured:         [false],
      pinned:           [false],
    });

    if (this.isAdd) {
      this.form.patchValue({
        author:      this.authService.name(),
        publishDate: new Date(),
      });
      this.form.get('author')?.disable();
    }

    if (this.isEdit && this.data.article) {
      const a: NewsArticle = this.data.article;
      this.form.patchValue({
        title:            a.title,
        content:          a.content,
        author:           a.author,
        category:         a.category,
        status:           a.status,
        publishDate:      a.publishDate ? new Date(a.publishDate) : null,
        featured:         a.featured,
        pinned:           a.pinned,
      });
      this.tags.set(a.tags ? a.tags.split(',').map(t => t.trim()).filter(Boolean) : []);
      if (a.coverImageBase64) {
        this.coverPreview.set(formatBase64Image(a.coverImageBase64));
      }
      if (a.images?.length) {
        this.galleryPreviews.set(a.images.map(i => formatBase64Image(i.imageBase64)));
      }
    }
  }






  async onCoverSelect(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const dataUrl = await fileToBase64(file);
    this.coverPreview.set(dataUrl);
  }

  removeCover(): void {
    this.coverPreview.set(null);
  }

  async onGallerySelect(event: Event): Promise<void> {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    if (!files.length) return;
    const dataUrls = await Promise.all(files.map(f => fileToBase64(f)));
    this.galleryPreviews.update(p => [...p, ...dataUrls]);
    (event.target as HTMLInputElement).value = '';
  }

  removeGalleryImage(index: number): void {
    this.galleryPreviews.update(p => p.filter((_, i) => i !== index));
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);

    const v = this.form.getRawValue();
    const payload: NewsArticleRequest = {
      title:            v.title,
      content:          v.content,
      author:           v.author,
      category:         v.category,
      status:           v.status,
      featured:         v.featured ?? false,
      pinned:           v.pinned   ?? false,
      publishDate:      this.fmtDate(v.publishDate),
      coverImageBase64: this.coverPreview() ?? null,
      imagesBase64:     this.galleryPreviews(),
    };

    const req$ = this.isAdd
      ? this.newsService.createNews(payload)
      : this.newsService.updateNews(this.data.article!.id, payload);

    req$.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: article => this.dialogRef.close(article),
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
