import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_URL } from './api-config';
import { ApiResponse } from '../models/api-response.model';
import { PageResponse } from '../models/page-response.model';
import {
  NewsArticle, NewsArticleRequest, NewsQueryParams,
} from '../models/news.model';

@Injectable({ providedIn: 'root' })
export class NewsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/news`;

  getNews(params: NewsQueryParams): Observable<PageResponse<NewsArticle>> {
    let p = new HttpParams();
    if (params.page     !== undefined) p = p.set('page',     params.page);
    if (params.size     !== undefined) p = p.set('size',     params.size);
    if (params.sortBy)                 p = p.set('sortBy',   params.sortBy);
    if (params.sortDir)                p = p.set('sortDir',  params.sortDir);
    if (params.search)                 p = p.set('search',   params.search);
    if (params.fromDate)               p = p.set('fromDate', params.fromDate);
    if (params.toDate)                 p = p.set('toDate',   params.toDate);
    if (params.category)               p = p.set('category', params.category);
    if (params.status)                 p = p.set('status',   params.status);
    if (params.featured !== undefined) p = p.set('featured', params.featured);
    if (params.pinned   !== undefined) p = p.set('pinned',   params.pinned);
    return this.http
      .get<ApiResponse<PageResponse<NewsArticle>>>(this.url, { params: p })
      .pipe(map(r => r.data));
  }

  getAllNews(): Observable<NewsArticle[]> {
    return this.http
      .get<ApiResponse<NewsArticle[]>>(`${this.url}/all`)
      .pipe(map(r => r.data));
  }

  getNewsById(id: number): Observable<NewsArticle> {
    return this.http
      .get<ApiResponse<NewsArticle>>(`${this.url}/${id}`)
      .pipe(map(r => r.data));
  }

  getNewsBySlug(slug: string): Observable<NewsArticle> {
    return this.http
      .get<ApiResponse<NewsArticle>>(`${this.url}/slug/${slug}`)
      .pipe(map(r => r.data));
  }

  getFeaturedNews(): Observable<NewsArticle[]> {
    return this.http
      .get<ApiResponse<NewsArticle[]>>(`${this.url}/featured`)
      .pipe(map(r => r.data));
  }

  getPublishedNews(params: NewsQueryParams = {}): Observable<PageResponse<NewsArticle>> {
    return this.getNews({ ...params, status: 'PUBLISHED' });
  }

  createNews(payload: NewsArticleRequest): Observable<NewsArticle> {
    return this.http
      .post<ApiResponse<NewsArticle>>(this.url, payload)
      .pipe(map(r => r.data));
  }

  updateNews(id: number, payload: NewsArticleRequest): Observable<NewsArticle> {
    return this.http
      .put<ApiResponse<NewsArticle>>(`${this.url}/${id}`, payload)
      .pipe(map(r => r.data));
  }

  deleteNews(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.url}/${id}`)
      .pipe(map(() => void 0));
  }

  publishNews(id: number): Observable<NewsArticle> {
    return this.http
      .patch<ApiResponse<NewsArticle>>(`${this.url}/${id}/publish`, {})
      .pipe(map(r => r.data));
  }

  unpublishNews(id: number): Observable<NewsArticle> {
    return this.http
      .patch<ApiResponse<NewsArticle>>(`${this.url}/${id}/unpublish`, {})
      .pipe(map(r => r.data));
  }

  archiveNews(id: number): Observable<NewsArticle> {
    return this.http
      .patch<ApiResponse<NewsArticle>>(`${this.url}/${id}/archive`, {})
      .pipe(map(r => r.data));
  }

  toggleFeatured(id: number, featured: boolean): Observable<NewsArticle> {
    return this.http
      .patch<ApiResponse<NewsArticle>>(`${this.url}/${id}/featured`, { featured })
      .pipe(map(r => r.data));
  }

  togglePinned(id: number, pinned: boolean): Observable<NewsArticle> {
    return this.http
      .patch<ApiResponse<NewsArticle>>(`${this.url}/${id}/pin`, { pinned })
      .pipe(map(r => r.data));
  }
}
