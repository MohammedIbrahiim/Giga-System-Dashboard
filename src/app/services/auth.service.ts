import { Injectable, inject, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { LoginRequest, LoginResponse, CurrentUser } from '../core/models/auth.model';
import { ApiResponse } from '../core/models/api-response.model';
import { API_URL } from '../core/services/api-config';

const STORAGE_KEY = 'currentUser';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly _currentUser$ = new BehaviorSubject<CurrentUser | null>(
    this.loadFromStorage()
  );

  readonly currentUser$ = this._currentUser$.asObservable();

  private readonly _currentUser = signal<CurrentUser | null>(this.loadFromStorage());
  readonly currentUser = this._currentUser.asReadonly();

  readonly isLoggedIn = computed(() => !!this._currentUser());
  readonly email = computed(() => this._currentUser()?.email ?? '');
  readonly name = computed(() => this._currentUser()?.name ?? '');
  readonly initials = computed(() => {
    const n = this._currentUser()?.name;
    if (n) {
      return n.trim().split(/\s+/).map(p => p.charAt(0).toUpperCase()).slice(0, 2).join('');
    }
    const local = (this._currentUser()?.email ?? '').split('@')[0] || '?';
    return local.split('.').map(p => p.charAt(0).toUpperCase()).join('');
  });
  readonly profileImage = computed(() => this._currentUser()?.profileImageBase64 ?? null);

  getToken(): string | null {
    return this._currentUser()?.token ?? null;
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<ApiResponse<LoginResponse>>(`${API_URL}/auth/login`, credentials)
      .pipe(
        map(r => r.data),
        tap(user => this.persist(user)),
      );
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this._currentUser$.next(null);
    this._currentUser.set(null);
  }

  updateCurrentUser(user: CurrentUser): void {
    this.persist(user);
  }

  private persist(user: CurrentUser): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    this._currentUser$.next(user);
    this._currentUser.set(user);
  }

  private loadFromStorage(): CurrentUser | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CurrentUser) : null;
    } catch {
      return null;
    }
  }
}
