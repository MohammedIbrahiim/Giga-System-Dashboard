import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { ApiResponse } from '../models/api-response.model';
import { ProductFilterResponse, ProductFilterValue } from '../models/product-filter.model';
import { API_URL } from './api-config';

@Injectable({ providedIn: 'root' })
export class ProductFilterService {
  private readonly http = inject(HttpClient);

  private readonly filters$: Observable<ProductFilterResponse[]> = this.http
    .get<ApiResponse<ProductFilterResponse[]>>(`${API_URL}/product-filters`)
    .pipe(
      map(res => res.data ?? []),
      shareReplay(1),
    );

  getProductFilters(): Observable<ProductFilterResponse[]> {
    return this.filters$;
  }

  getMainCategories(): Observable<ProductFilterValue[]> {
    return this.filters$.pipe(
      map(groups => groups.find(g => g.name === 'Main Category Filter')?.values ?? []),
    );
  }
}
