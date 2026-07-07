import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_URL } from './api-config';
import { ApiResponse } from '../models/api-response.model';
import { PageResponse } from '../models/page-response.model';
import {
  QuoteRequest, QuoteRequestQueryParams, QuoteRequestStats, QuoteStatus,
} from '../models/quote-request.model';

@Injectable({ providedIn: 'root' })
export class QuoteRequestService {
  private readonly http = inject(HttpClient);
  private readonly url  = `${API_URL}/quote-requests/admin`;

  getQuoteRequests(params: QuoteRequestQueryParams): Observable<PageResponse<QuoteRequest>> {
    let p = new HttpParams();
    if (params.page     !== undefined) p = p.set('page',     params.page);
    if (params.size     !== undefined) p = p.set('size',     params.size);
    if (params.sortBy)                 p = p.set('sortBy',   params.sortBy);
    if (params.sortDir)                p = p.set('sortDir',  params.sortDir);
    if (params.search)                 p = p.set('search',   params.search);
    if (params.status)                 p = p.set('status',   params.status);
    if (params.category)               p = p.set('category', params.category);
    return this.http
      .get<ApiResponse<PageResponse<QuoteRequest>>>(this.url, { params: p })
      .pipe(map(r => r.data));
  }

  getQuoteRequestById(id: number): Observable<QuoteRequest> {
    return this.http
      .get<ApiResponse<QuoteRequest>>(`${this.url}/${id}`)
      .pipe(map(r => r.data));
  }

  updateStatus(id: number, status: QuoteStatus): Observable<QuoteRequest> {
    return this.http
      .patch<ApiResponse<QuoteRequest>>(`${this.url}/${id}/status`, { status })
      .pipe(map(r => r.data));
  }

  deleteQuoteRequest(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.url}/${id}`)
      .pipe(map(() => void 0));
  }

  getStats(): Observable<QuoteRequestStats> {
    return this.http
      .get<ApiResponse<QuoteRequestStats>>(`${this.url}/stats`)
      .pipe(map(r => r.data));
  }
}
