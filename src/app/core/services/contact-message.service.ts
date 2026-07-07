import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_URL } from './api-config';
import { ApiResponse } from '../models/api-response.model';
import { PageResponse } from '../models/page-response.model';
import {
  ContactMessage, ContactMessageQueryParams, ContactMessageStats, ContactMessageStatus,
} from '../models/contact-message.model';

@Injectable({ providedIn: 'root' })
export class ContactMessageService {
  private readonly http = inject(HttpClient);
  private readonly url  = `${API_URL}/contact-messages/admin`;

  getMessages(params: ContactMessageQueryParams): Observable<PageResponse<ContactMessage>> {
    let p = new HttpParams();
    if (params.page    !== undefined) p = p.set('page',    params.page);
    if (params.size    !== undefined) p = p.set('size',    params.size);
    if (params.sortBy)                p = p.set('sortBy',  params.sortBy);
    if (params.sortDir)               p = p.set('sortDir', params.sortDir);
    if (params.search)                p = p.set('search',  params.search);
    if (params.status)                p = p.set('status',  params.status);
    return this.http
      .get<ApiResponse<PageResponse<ContactMessage>>>(this.url, { params: p })
      .pipe(map(r => r.data));
  }

  getMessageById(id: number): Observable<ContactMessage> {
    return this.http
      .get<ApiResponse<ContactMessage>>(`${this.url}/${id}`)
      .pipe(map(r => r.data));
  }

  updateStatus(id: number, status: ContactMessageStatus): Observable<ContactMessage> {
    return this.http
      .patch<ApiResponse<ContactMessage>>(`${this.url}/${id}/status`, { status })
      .pipe(map(r => r.data));
  }

  deleteMessage(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.url}/${id}`)
      .pipe(map(() => void 0));
  }

  getStats(): Observable<ContactMessageStats> {
    return this.http
      .get<ApiResponse<ContactMessageStats>>(`${this.url}/stats`)
      .pipe(map(r => r.data));
  }
}
