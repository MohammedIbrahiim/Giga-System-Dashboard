import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_URL } from './api-config';
import { ApiResponse } from '../models/api-response.model';
import { PageResponse } from '../models/page-response.model';
import { Partner, PartnerRequest, PartnerQueryParams } from '../models/partner.model';

@Injectable({ providedIn: 'root' })
export class PartnerService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/partners`;

  getPartners(params: PartnerQueryParams): Observable<PageResponse<Partner>> {
    let p = new HttpParams();
    if (params.page     !== undefined) p = p.set('page',    params.page);
    if (params.size     !== undefined) p = p.set('size',    params.size);
    if (params.sortBy)                 p = p.set('sortBy',  params.sortBy);
    if (params.sortDir)                p = p.set('sortDir', params.sortDir);
    if (params.search)                 p = p.set('search', params.search);
    if (params.active !== undefined)   p = p.set('active', params.active);
    return this.http
      .get<ApiResponse<PageResponse<Partner>>>(`${this.url}/admin`, { params: p })
      .pipe(map(r => r.data));
  }

  getPartnerById(id: number): Observable<Partner> {
    return this.http
      .get<ApiResponse<Partner>>(`${this.url}/${id}`)
      .pipe(map(r => r.data));
  }

  createPartner(payload: PartnerRequest): Observable<Partner> {
    return this.http
      .post<ApiResponse<Partner>>(this.url, payload)
      .pipe(map(r => r.data));
  }

  updatePartner(id: number, payload: PartnerRequest): Observable<Partner> {
    return this.http
      .put<ApiResponse<Partner>>(`${this.url}/${id}`, payload)
      .pipe(map(r => r.data));
  }

  deletePartner(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.url}/${id}`)
      .pipe(map(() => void 0));
  }
}
