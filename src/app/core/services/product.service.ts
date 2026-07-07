import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { API_URL } from './api-config';
import { ApiResponse } from '../models/api-response.model';
import { PageResponse } from '../models/page-response.model';
import { Product, ProductRequest, ProductQueryParams } from '../models/product.model';
import { ProductFilterMetadata } from '../models/product-filter-metadata.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/products`;

  private readonly filterMetadata$: Observable<ProductFilterMetadata> = this.http
    .get<ApiResponse<ProductFilterMetadata>>(`${this.url}/filter-metadata`)
    .pipe(map(r => r.data), shareReplay(1));

  getProductFilterMetadata(): Observable<ProductFilterMetadata> {
    return this.filterMetadata$;
  }

  getProducts(params: ProductQueryParams): Observable<PageResponse<Product>> {
    let p = new HttpParams();
    if (params.page        !== undefined) p = p.set('page',        params.page);
    if (params.size        !== undefined) p = p.set('size',        params.size);
    if (params.sortBy)                    p = p.set('sortBy',      params.sortBy);
    if (params.sortDir)                   p = p.set('sortDir',     params.sortDir);
    if (params.search)                    p = p.set('search',      params.search);
    if (params.categoryId    !== undefined) p = p.set('categoryId',    params.categoryId);
    if (params.brand)                       p = p.set('brand',          params.brand);
    if (params.subCategoryId !== undefined) p = p.set('subCategoryId',  params.subCategoryId);
    if (params.stockStatus)                 p = p.set('stockStatus',    params.stockStatus);
    if (params.mainCategory)  p = p.set('mainCategory',  params.mainCategory);
    if (params.application)   p = p.set('application',   params.application);
    if (params.parameter)     p = p.set('parameter',     params.parameter);
    if (params.communication) p = p.set('communication', params.communication);
    if (params.installation)  p = p.set('installation',  params.installation);
    if (params.power)         p = p.set('power',         params.power);
    if (params.environment)   p = p.set('environment',   params.environment);
    if (params.outputSignal)  p = p.set('outputSignal',  params.outputSignal);
    if (params.compliance)    p = p.set('compliance',    params.compliance);
    return this.http
      .get<ApiResponse<PageResponse<Product>>>(this.url, { params: p })
      .pipe(map(r => r.data));
  }

  getAllProducts(): Observable<Product[]> {
    return this.http
      .get<ApiResponse<Product[]>>(`${this.url}/all`)
      .pipe(map(r => r.data));
  }

  getProductById(id: number): Observable<Product> {
    return this.http
      .get<ApiResponse<Product>>(`${this.url}/${id}`)
      .pipe(map(r => r.data));
  }

  getProductBySku(sku: string): Observable<Product> {
    return this.http
      .get<ApiResponse<Product>>(`${this.url}/sku/${sku}`)
      .pipe(map(r => r.data));
  }

  getProductsByCategory(category: string): Observable<Product[]> {
    return this.http
      .get<ApiResponse<Product[]>>(`${this.url}/category/${category}`)
      .pipe(map(r => r.data));
  }

  getRelatedProducts(id: number): Observable<Product[]> {
    return this.http
      .get<ApiResponse<Product[]>>(`${this.url}/${id}/related`)
      .pipe(map(r => r.data));
  }

  createProduct(payload: ProductRequest): Observable<Product> {
    return this.http
      .post<ApiResponse<Product>>(this.url, payload)
      .pipe(map(r => r.data));
  }

  updateProduct(id: number, payload: ProductRequest): Observable<Product> {
    return this.http
      .put<ApiResponse<Product>>(`${this.url}/${id}`, payload)
      .pipe(map(r => r.data));
  }

  deleteProduct(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.url}/${id}`)
      .pipe(map(() => void 0));
  }
}
