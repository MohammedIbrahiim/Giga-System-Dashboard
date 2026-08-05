import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_URL } from './api-config';
import { ApiResponse } from '../models/api-response.model';
import { PageResponse } from '../models/page-response.model';
import {
  CareerJob, CreateCareerJobRequest, CareerQueryParams,
  JobApplication, ApplicationQueryParams, ApplicationStatus,
} from '../models/career.model';

@Injectable({ providedIn: 'root' })
export class CareerService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_URL}/careers`;

  // ─── Admin careers ───────────────────────────────────────────────────────

  getAdminCareers(params: CareerQueryParams): Observable<PageResponse<CareerJob>> {
    const p = this.buildParams({
      page: params.page, size: params.size,
      sortBy: params.sortBy, sortDir: params.sortDir, search: params.search,
    });
    return this.http
      .get<ApiResponse<PageResponse<CareerJob>>>(`${this.baseUrl}/admin`, { params: p })
      .pipe(map(r => r.data));
  }

  getCareerById(id: number): Observable<CareerJob> {
    return this.http
      .get<ApiResponse<CareerJob>>(`${this.baseUrl}/admin/${id}`)
      .pipe(map(r => r.data));
  }

  createCareer(payload: CreateCareerJobRequest): Observable<CareerJob> {
    return this.http.post<ApiResponse<CareerJob>>(this.baseUrl, payload).pipe(map(r => r.data));
  }

  updateCareer(id: number, payload: CreateCareerJobRequest): Observable<CareerJob> {
    return this.http.put<ApiResponse<CareerJob>>(`${this.baseUrl}/${id}`, payload).pipe(map(r => r.data));
  }

  activateCareer(id: number): Observable<CareerJob> {
    return this.http.patch<ApiResponse<CareerJob>>(`${this.baseUrl}/${id}/activate`, {}).pipe(map(r => r.data));
  }

  deactivateCareer(id: number): Observable<CareerJob> {
    return this.http.patch<ApiResponse<CareerJob>>(`${this.baseUrl}/${id}/deactivate`, {}).pipe(map(r => r.data));
  }

  publishCareer(id: number): Observable<CareerJob> {
    return this.http.patch<ApiResponse<CareerJob>>(`${this.baseUrl}/${id}/publish`, {}).pipe(map(r => r.data));
  }

  unpublishCareer(id: number): Observable<CareerJob> {
    return this.http.patch<ApiResponse<CareerJob>>(`${this.baseUrl}/${id}/unpublish`, {}).pipe(map(r => r.data));
  }

  deleteCareer(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(map(() => void 0));
  }

  // ─── Admin applications ──────────────────────────────────────────────────

  getApplications(params: ApplicationQueryParams): Observable<PageResponse<JobApplication>> {
    const p = this.buildParams({
      page: params.page, size: params.size,
      sortBy: params.sortBy, sortDir: params.sortDir, search: params.search,
      status: params.status, careerId: params.careerId,
    });
    return this.http
      .get<ApiResponse<PageResponse<JobApplication>>>(`${this.baseUrl}/admin/applications`, { params: p })
      .pipe(map(r => r.data));
  }

  getApplicationById(id: number): Observable<JobApplication> {
    return this.http
      .get<ApiResponse<JobApplication>>(`${this.baseUrl}/admin/applications/${id}`)
      .pipe(map(r => r.data));
  }

  updateApplicationStatus(id: number, status: ApplicationStatus): Observable<JobApplication> {
    return this.http
      .patch<ApiResponse<JobApplication>>(`${this.baseUrl}/admin/applications/${id}/status`, { status })
      .pipe(map(r => r.data));
  }

  deleteApplication(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/admin/applications/${id}`)
      .pipe(map(() => void 0));
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private buildParams(filters: Record<string, string | number | null | undefined>): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, value);
      }
    }
    return params;
  }
}
