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

  private autoSlug = true;

  constructor(
    private readonly fb:          FormBuilder,
    private readonly newsService: NewsService,
    public  readonly dialogRef:   MatDialogRef<NewsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: NewsDialogData,
  ) {}

  get isAdd(): boolean  { return this.data.mode === 'add'; }
  get isEdit(): boolean { return this.data.mode === 'edit'; }

  ngOnInit(): void {
    this.form = this.fb.group({
      title:            ['', Validators.required],
      slug:             ['', Validators.required],
      shortDescription: ['', Validators.required],
      content:          ['', Validators.required],
      author:           ['', Validators.required],
      category:         ['', Validators.required],
      status:           ['DRAFT', Validators.required],
      publishDate:      [null, Validators.required],
      expiryDate:       [null],
      featured:         [false],
      pinned:           [false],
    });

    if (this.isEdit && this.data.article) {
      const a: NewsArticle = this.data.article;
      this.autoSlug = false;
      this.form.patchValue({
        title:            a.title,
        slug:             a.slug,
        shortDescription: a.shortDescription,
        content:          a.content,
        author:           a.author,
        category:         a.category,
        status:           a.status,
        publishDate:      a.publishDate ? new Date(a.publishDate) : null,
        expiryDate:       a.expiryDate  ? new Date(a.expiryDate)  : null,
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

  onTitleInput(): void {
    if (!this.autoSlug) return;
    const title: string = this.form.get('title')!.value ?? '';
    this.form.get('slug')!.setValue(this.toSlug(title), { emitEvent: false });
  }

  onSlugInput(): void {
    this.autoSlug = false;
  }

  addTag(event: MatChipInputEvent): void {
    const val = (event.value ?? '').trim();
    if (val) this.tags.update(t => [...t, val]);
    event.chipInput!.clear();
  }

  removeTag(tag: string): void {
    this.tags.update(t => t.filter(x => x !== tag));
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

    const v = this.form.value;
    const payload: NewsArticleRequest = {
      title:            v.title,
      slug:             v.slug,
      shortDescription: v.shortDescription,
      content:          v.content,
      author:           v.author,
      category:         v.category,
      status:           v.status,
      featured:         v.featured ?? false,
      pinned:           v.pinned   ?? false,
      publishDate:      this.fmtDate(v.publishDate),
      expiryDate:       v.expiryDate ? this.fmtDate(v.expiryDate) : null,
      tags:             this.tags().join(',') || undefined,
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

  private toSlug(title: string): string {
    return title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  private fmtDate(date: Date | string | null): string {
    if (!date) return '';
    if (typeof date === 'string') return date;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
