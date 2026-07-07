import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_URL } from './api-config';
import { ApiResponse } from '../models/api-response.model';
import { AppUser, CreateUserRequest, UpdateUserRequest, UpdateUserRoleRequest } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private readonly http = inject(HttpClient);
  private readonly url  = `${API_URL}/users`;

  private readonly _version = new BehaviorSubject<number>(0);
  readonly refresh$ = this._version.asObservable();

  triggerRefresh(): void {
    this._version.next(this._version.value + 1);
  }

  getUsers(): Observable<AppUser[]> {
    return this.http
      .get<ApiResponse<AppUser[]>>(this.url)
      .pipe(map(r => r.data));
  }

  getUserById(id: number): Observable<AppUser> {
    return this.http
      .get<ApiResponse<AppUser>>(`${this.url}/${id}`)
      .pipe(map(r => r.data));
  }

  createUser(payload: CreateUserRequest): Observable<AppUser> {
    return this.http
      .post<ApiResponse<AppUser>>(this.url, payload)
      .pipe(map(r => r.data));
  }

  updateUser(id: number, payload: UpdateUserRequest): Observable<AppUser> {
    return this.http
      .put<ApiResponse<AppUser>>(`${this.url}/${id}`, payload)
      .pipe(map(r => r.data));
  }

  updateUserRole(id: number, payload: UpdateUserRoleRequest): Observable<AppUser> {
    return this.http
      .patch<ApiResponse<AppUser>>(`${this.url}/${id}/role`, payload)
      .pipe(map(r => r.data));
  }

  deleteUser(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.url}/${id}`)
      .pipe(map(() => void 0));
  }
}
