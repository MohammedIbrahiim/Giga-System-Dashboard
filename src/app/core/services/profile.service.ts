import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ProfileResponse, ProfileUpdateRequest, ChangePasswordRequest } from '../models/profile.model';
import { ApiResponse } from '../models/api-response.model';
import { API_URL } from './api-config';
import { AuthService } from '../../services/auth.service';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  getProfile(): Observable<ProfileResponse> {
    return this.http
      .get<ApiResponse<ProfileResponse>>(`${API_URL}/profile/me`)
      .pipe(map(r => r.data));
  }

  updateProfile(request: ProfileUpdateRequest): Observable<ProfileResponse> {
    return this.http
      .put<ApiResponse<ProfileResponse>>(`${API_URL}/profile/me`, request)
      .pipe(
        map(r => r.data),
        tap(updated => {
          const current = this.auth.currentUser()!;
          this.auth.updateCurrentUser({ ...current, ...updated });
        }),
      );
  }

  changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.http
      .put<ApiResponse<void>>(`${API_URL}/profile/change-password`, request)
      .pipe(map(() => void 0));
  }
}
