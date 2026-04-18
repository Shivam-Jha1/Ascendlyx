import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, EMPTY, catchError, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  FullSettings,
  AppearanceSettings,
  NotificationSettings,
  PrivacySettings,
  ActiveSession,
  TwoFactorSetupData,
  AccentColor,
  Theme,
} from '../models/settings.model';

const ACCENT_MAP: Record<AccentColor, string> = {
  blue:  '#58a6ff',
  cyan:  '#39d2c0',
  green: '#3fb950',
  red:   '#f85149',
};

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/settings`;

  readonly settings   = signal<FullSettings | null>(null);
  readonly isLoading  = signal<boolean>(false);
  readonly isSaving   = signal<boolean>(false);
  readonly error      = signal<string | null>(null);
  readonly activeSessions = signal<ActiveSession[]>([]);

  // ── Load ──────────────────────────────────────────────────────────────
  loadSettings(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.http.get<FullSettings>(this.base).pipe(
      tap(s => {
        this.settings.set(s);
        this.isLoading.set(false);
        this.applyTheme(s.appearance.theme);
        this.applyAccentColor(s.appearance.accent_color);
      }),
      catchError((err: HttpErrorResponse) => {
        this.error.set(this.msg(err));
        this.isLoading.set(false);
        return EMPTY;
      })
    ).subscribe();
  }

  // ── Appearance ────────────────────────────────────────────────────────
  updateAppearance(data: Partial<AppearanceSettings>): Observable<AppearanceSettings> {
    return this.http.patch<AppearanceSettings>(`${this.base}/appearance`, data).pipe(
      tap(updated => {
        this.settings.update(s => s ? { ...s, appearance: updated } : s);
        if (data.theme)        this.applyTheme(updated.theme);
        if (data.accent_color) this.applyAccentColor(updated.accent_color);
      }),
      catchError((err: HttpErrorResponse) => throwError(() => this.msg(err)))
    );
  }

  // ── Notifications ─────────────────────────────────────────────────────
  updateNotifications(data: Partial<NotificationSettings>): Observable<NotificationSettings> {
    return this.http.patch<NotificationSettings>(`${this.base}/notifications`, data).pipe(
      tap(updated => this.settings.update(s => s ? { ...s, notifications: updated } : s)),
      catchError((err: HttpErrorResponse) => throwError(() => this.msg(err)))
    );
  }

  // ── Privacy ──────────────────────────────────────────────────────────
  updatePrivacy(data: Partial<PrivacySettings>): Observable<PrivacySettings> {
    return this.http.patch<PrivacySettings>(`${this.base}/privacy`, data).pipe(
      tap(updated => this.settings.update(s => s ? { ...s, privacy: updated } : s)),
      catchError((err: HttpErrorResponse) => throwError(() => this.msg(err)))
    );
  }

  updateHabitPrivacy(habitId: string, isHidden: boolean): Observable<void> {
    return this.http.patch<void>(`${this.base}/privacy/habits`, { habit_id: habitId, is_hidden: isHidden }).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => this.msg(err)))
    );
  }

  getHabitPrivacyList(): Observable<import('../models/settings.model').HabitPrivacyItem[]> {
    return this.http.get<import('../models/settings.model').HabitPrivacyItem[]>(`${this.base}/privacy/habits`).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => this.msg(err)))
    );
  }

  // ── Sessions ──────────────────────────────────────────────────────────
  getSessions(): void {
    this.http.get<ActiveSession[]>(`${this.base}/sessions`).pipe(
      tap(list => this.activeSessions.set(list)),
      catchError(() => EMPTY)
    ).subscribe();
  }

  revokeSession(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/sessions/${id}`).pipe(
      tap(() => this.activeSessions.update(list => list.filter(s => s.id !== id))),
      catchError((err: HttpErrorResponse) => throwError(() => this.msg(err)))
    );
  }

  revokeAllOtherSessions(): Observable<void> {
    return this.http.delete<void>(`${this.base}/sessions`).pipe(
      tap(() => this.activeSessions.update(list => list.filter(s => s.is_current))),
      catchError((err: HttpErrorResponse) => throwError(() => this.msg(err)))
    );
  }

  // ── 2FA ───────────────────────────────────────────────────────────────
  setup2FA(): Observable<TwoFactorSetupData> {
    return this.http.post<TwoFactorSetupData>(`${this.base}/2fa/setup`, {}).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => this.msg(err)))
    );
  }

  confirm2FA(code: string): Observable<void> {
    return this.http.post<void>(`${this.base}/2fa/confirm`, { totp_code: code }).pipe(
      tap(() => this.settings.update(s =>
        s ? { ...s, security: { ...s.security, two_fa_enabled: true } } : s
      )),
      catchError((err: HttpErrorResponse) => throwError(() => this.msg(err)))
    );
  }

  disable2FA(password: string, code: string): Observable<void> {
    return this.http.post<void>(`${this.base}/2fa/disable`, { password, totp_code: code }).pipe(
      tap(() => this.settings.update(s =>
        s ? { ...s, security: { ...s.security, two_fa_enabled: false } } : s
      )),
      catchError((err: HttpErrorResponse) => throwError(() => this.msg(err)))
    );
  }

  // ── Account Deletion ──────────────────────────────────────────────────
  requestDeletion(payload: { password: string; totp_code?: string; confirm_phrase: string }): Observable<{ message: string; deletion_date: string; grace_period_days: number }> {
    return this.http.delete<{ message: string; deletion_date: string; grace_period_days: number }>(
      `${environment.apiBaseUrl}/account`, { body: payload }
    ).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => this.msg(err)))
    );
  }

  cancelDeletion(): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/account/cancel-deletion`, {}).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => this.msg(err)))
    );
  }

  updateLoginNotifications(enabled: boolean): Observable<void> {
    return this.http.patch<void>(`${this.base}/security/login-notifications`, { enabled }).pipe(
      tap(() => this.settings.update(s =>
        s ? { ...s, security: { ...s.security, login_notifications_enabled: enabled } } : s
      )),
      catchError((err: HttpErrorResponse) => throwError(() => this.msg(err)))
    );
  }

  // ── Theme application (immediate, no reload) ──────────────────────────
  applyTheme(theme: Theme): void {
    document.body.classList.toggle('theme-light', theme === 'light');
    document.documentElement.setAttribute('data-theme', theme);
  }

  applyAccentColor(color: AccentColor): void {
    document.documentElement.style.setProperty('--accent-blue', ACCENT_MAP[color]);
  }

  private msg(err: HttpErrorResponse): string {
    if (err.error?.detail) return err.error.detail;
    if (err.status === 0) return 'Network error. Please check your connection.';
    return `Error ${err.status}: ${err.statusText || 'Unknown error'}`;
  }
}
