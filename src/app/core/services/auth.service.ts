import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/auth`;

  private isAuthenticatedSignal = signal<boolean>(false);
  public isAuthenticated = this.isAuthenticatedSignal.asReadonly();

  constructor() {
    this.isAuthenticatedSignal.set(!!localStorage.getItem('access_token'));
  }

  /** Step 1 of signup — request OTP */
  signupRequestOtp(data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/signup`, data);
  }

  /** Step 2 of signup — verify OTP and complete registration */
  signupVerifyOtp(data: { email: string; otp: string }): Observable<AuthTokens> {
    return this.http
      .post<AuthTokens>(`${this.apiUrl}/signup/verify`, data)
      .pipe(tap(tokens => this.storeTokens(tokens)));
  }

  /** Login with email + password */
  login(data: { email: string; password: string }): Observable<AuthTokens> {
    return this.http
      .post<AuthTokens>(`${this.apiUrl}/login`, data)
      .pipe(tap(tokens => this.storeTokens(tokens)));
  }

  /** Step 1 of forgot-password — request OTP */
  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/forgot-password`, { email });
  }

  /** Step 2 of forgot-password — verify OTP and set new password */
  resetPassword(data: {
    email: string;
    otp: string;
    new_password: string;
  }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/reset-password`, data);
  }

  /** Silently refresh access token using the stored refresh token */
  refreshToken(): Observable<AuthTokens> {
    const refresh_token = this.getRefreshToken();
    return this.http
      .post<AuthTokens>(`${this.apiUrl}/refresh`, { refresh_token })
      .pipe(tap(tokens => this.storeTokens(tokens)));
  }

  /** Call server logout endpoint and clear local session */
  logout(): Observable<{ message: string }> {
    const refresh_token = this.getRefreshToken();
    const body = refresh_token ? { refresh_token } : {};
    return this.http.post<{ message: string }>(`${this.apiUrl}/logout`, body).pipe(
      tap(() => this.clearSession()),
      catchError(err => {
        this.clearSession();
        return throwError(() => err);
      })
    );
  }

  /** Clear local session without calling the server (used by interceptor on refresh failure) */
  logoutLocally(): void {
    this.clearSession();
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  getCurrentUser(): any {
    const raw = localStorage.getItem('currentUser');
    return raw ? JSON.parse(raw) : null;
  }

  private storeTokens(tokens: AuthTokens): void {
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
    const payload = this.decodeJwt(tokens.access_token);
    if (payload) {
      const name =
        payload.name ??
        payload.full_name ??
        (payload.first_name
          ? `${payload.first_name} ${payload.last_name ?? ''}`.trim()
          : null) ??
        payload.email?.split('@')[0] ??
        'User';
      localStorage.setItem(
        'currentUser',
        JSON.stringify({ name, email: payload.email ?? payload.sub ?? '', handle: payload.handle ?? '' })
      );
    }
    this.isAuthenticatedSignal.set(true);
  }

  private decodeJwt(token: string): any | null {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }

  private clearSession(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('currentUser');
    this.isAuthenticatedSignal.set(false);
  }
}