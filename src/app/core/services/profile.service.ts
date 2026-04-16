import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  OwnProfile,
  UpdateProfilePayload,
  UpdatePrivacyPayload,
  PrivacySettings,
  Badge,
} from '../models/profile.model';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/profile`;

  // ── State signals ──
  readonly profile = signal<OwnProfile | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // ── Computed signals ──
  readonly earnedBadges = computed<Badge[]>(() => {
    const p = this.profile();
    return p ? p.badges.filter(b => b.earned) : [];
  });

  readonly lockedBadges = computed<Badge[]>(() => {
    const p = this.profile();
    return p ? p.badges.filter(b => !b.earned) : [];
  });

  readonly consistencyRatingColor = computed<string>(() => {
    const p = this.profile();
    if (!p) return 'var(--text-secondary)';
    const map: Record<string, string> = {
      'Excellent': 'var(--accent-green)',
      'Good': 'var(--accent-blue)',
      'Average': 'var(--accent-orange)',
      'Needs Work': 'var(--accent-red)',
    };
    return map[p.consistency.rating] ?? 'var(--text-secondary)';
  });

  loadProfile(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.http.get<OwnProfile>(this.apiUrl).pipe(
      tap(profile => {
        this.profile.set(profile);
        this.isLoading.set(false);
      }),
      catchError((err: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.error.set(this.extractErrorMessage(err));
        return throwError(() => err);
      })
    ).subscribe();
  }

  updateProfile(payload: UpdateProfilePayload): Observable<OwnProfile> {
    return this.http.patch<OwnProfile>(`${this.apiUrl}`, payload).pipe(
      tap(updated => {
        this.profile.set(updated);
      }),
      catchError((err: HttpErrorResponse) => {
        return throwError(() => err);
      })
    );
  }

  updatePrivacy(payload: UpdatePrivacyPayload): Observable<PrivacySettings> {
    return this.http.patch<PrivacySettings>(`${this.apiUrl}/privacy`, payload).pipe(
      tap(updatedPrivacy => {
        const current = this.profile();
        if (current) {
          this.profile.set({ ...current, privacy: updatedPrivacy });
        }
      }),
      catchError((err: HttpErrorResponse) => {
        return throwError(() => err);
      })
    );
  }

  private extractErrorMessage(err: HttpErrorResponse): string {
    if (err.error?.detail) return err.error.detail;
    if (err.status === 0) return 'Something went wrong. Please try again.';
    return `Error ${err.status}: ${err.statusText || 'Unknown error'}`;
  }
}
