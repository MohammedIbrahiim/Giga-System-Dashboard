import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_URL } from './api-config';
import { ApiResponse } from '../models/api-response.model';
import {
  DashboardSummary,
  RecentNewsItem,
  ProjectStatusChartItem,
  WeeklySalesItem,
} from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/dashboard`;

  getSummary(): Observable<DashboardSummary> {
    return this.http
      .get<ApiResponse<DashboardSummary>>(`${this.url}/summary`)
      .pipe(map(r => r.data));
  }

  getRecentNews(): Observable<RecentNewsItem[]> {
    return this.http
      .get<ApiResponse<RecentNewsItem[]>>(`${this.url}/recent-news`)
      .pipe(map(r => r.data));
  }

  getProjectStatus(): Observable<ProjectStatusChartItem[]> {
    return this.http
      .get<ApiResponse<ProjectStatusChartItem[]>>(`${this.url}/project-status`)
      .pipe(map(r => r.data));
  }

  getWeeklySales(): Observable<WeeklySalesItem[]> {
    return this.http
      .get<ApiResponse<WeeklySalesItem[]>>(`${this.url}/weekly-sales`)
      .pipe(map(r => r.data));
  }
}
