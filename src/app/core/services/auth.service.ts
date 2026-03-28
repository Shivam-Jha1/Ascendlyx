import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

const STORAGE_KEYS = {
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
  currentUser: 'currentUser',
} as const;

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
    this.isAuthenticatedSignal.set(!!localStorage.getItem(STORAGE_KEYS.accessToken));
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
    if (!refresh_token) {
      this.clearSession();
      return throwError(() => new Error('No refresh token available'));
    }
    return this.http
      .post<AuthTokens>(`${this.apiUrl}/refresh`, { refresh_token })
      .pipe(tap(tokens => this.storeTokens(tokens)));
  }

  /** Call server logout endpoint and clear local session */
  logout(): Observable<{ message: string }> {
    const refresh_token = this.getRefreshToken();
    // Clear the local session immediately so tokens aren't retained during a slow request
    this.clearSession();
    const body = refresh_token ? { refresh_token } : {};
    // Best-effort server-side logout; caller handles any network error
    return this.http.post<{ message: string }>(`${this.apiUrl}/logout`, body);
  }

  /** Clear local session without calling the server (used by interceptor on refresh failure) */
  logoutLocally(): void {
    this.clearSession();
  }

  getAccessToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.accessToken);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.refreshToken);
  }

  getCurrentUser(): any {
    const raw = localStorage.getItem(STORAGE_KEYS.currentUser);
    return raw ? JSON.parse(raw) : null;
  }

  private storeTokens(tokens: AuthTokens): void {
    localStorage.setItem(STORAGE_KEYS.accessToken, tokens.access_token);
    localStorage.setItem(STORAGE_KEYS.refreshToken, tokens.refresh_token);
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
        STORAGE_KEYS.currentUser,
        JSON.stringify({ name, email: payload.email ?? payload.sub ?? '', handle: payload.handle ?? '' })
      );
    }
    this.isAuthenticatedSignal.set(true);
  }

  private decodeJwt(token: string): any | null {
    try {
      const payloadPart = token.split('.')[1];
      if (!payloadPart) return null;
      // JWT uses base64url encoding — convert to standard base64 before atob
      const base64 = payloadPart
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(payloadPart.length + ((4 - (payloadPart.length % 4)) % 4), '=');
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
  }

  private clearSession(): void {
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    localStorage.removeItem(STORAGE_KEYS.currentUser);
    this.isAuthenticatedSignal.set(false);
  }
}