import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_URL } from './api-config';
import { ApiResponse } from '../models/api-response.model';
import { PageResponse } from '../models/page-response.model';
import { Project, ProjectRequest, ProjectQueryParams } from '../models/project.model';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/projects`;

  getProjects(params: ProjectQueryParams): Observable<PageResponse<Project>> {
    let p = new HttpParams();
    if (params.page     !== undefined) p = p.set('page',     params.page);
    if (params.size     !== undefined) p = p.set('size',     params.size);
    if (params.sortBy)                 p = p.set('sortBy',   params.sortBy);
    if (params.sortDir)                p = p.set('sortDir',  params.sortDir);
    if (params.search)                 p = p.set('search',   params.search);
    if (params.category)               p = p.set('category', params.category);
    if (params.country)                p = p.set('country',  params.country);
    if (params.status)                 p = p.set('status',   params.status);
    if (params.year     !== undefined) p = p.set('year',     params.year);
    if (params.featured !== undefined) p = p.set('featured', params.featured);
    if (params.archived !== undefined) p = p.set('archived', params.archived);
    return this.http
      .get<ApiResponse<PageResponse<Project>>>(this.url, { params: p })
      .pipe(map(r => r.data));
  }

  getAllProjects(): Observable<Project[]> {
    return this.http
      .get<ApiResponse<Project[]>>(`${this.url}/all`)
      .pipe(map(r => r.data));
  }

  getProjectById(id: number): Observable<Project> {
    return this.http
      .get<ApiResponse<Project>>(`${this.url}/${id}`)
      .pipe(map(r => r.data));
  }

  getFeaturedProjects(): Observable<Project[]> {
    return this.http
      .get<ApiResponse<Project[]>>(`${this.url}/featured`)
      .pipe(map(r => r.data));
  }

  getPublicProjects(): Observable<Project[]> {
    return this.http
      .get<ApiResponse<Project[]>>(`${this.url}/public`)
      .pipe(map(r => r.data));
  }

  createProject(payload: ProjectRequest): Observable<Project> {
    return this.http
      .post<ApiResponse<Project>>(this.url, payload)
      .pipe(map(r => r.data));
  }

  updateProject(id: number, payload: ProjectRequest): Observable<Project> {
    return this.http
      .put<ApiResponse<Project>>(`${this.url}/${id}`, payload)
      .pipe(map(r => r.data));
  }

  deleteProject(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.url}/${id}`)
      .pipe(map(() => void 0));
  }

  toggleFeatured(id: number, featured: boolean): Observable<Project> {
    return this.http
      .patch<ApiResponse<Project>>(`${this.url}/${id}/featured`, { featured })
      .pipe(map(r => r.data));
  }

  toggleArchived(id: number, archived: boolean): Observable<Project> {
    return this.http
      .patch<ApiResponse<Project>>(`${this.url}/${id}/archive`, { archived })
      .pipe(map(r => r.data));
  }
}
