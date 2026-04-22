import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, Subject, of } from 'rxjs';
import { catchError, finalize, switchMap, takeUntil } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';
import {
  WeeklyInsightResponse,
  InsightStatusResponse,
  InsightRefreshResponse,
} from '../models/insights.models';

@Injectable({ providedIn: 'root' })
export class InsightsService {
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);
  private readonly apiUrl = environment.apiBaseUrl;

  readonly insights = signal<WeeklyInsightResponse | null>(null);
  readonly isLoading = signal(false);
  readonly isAIReady = signal(false);
  readonly isStale = signal(false);
  readonly isRefreshing = signal(false);
  readonly toastMessage = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly hasNoData = signal(false);

  private readonly stopPolling$ = new Subject<void>();

  loadInsights(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.hasNoData.set(false);

    this.http
      .get<WeeklyInsightResponse>(`${this.apiUrl}/ai-insights/weekly`)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
        catchError(err => {
          if (err.status === 404) {
            this.hasNoData.set(true);
            return of(null);
          }
          this.error.set('Failed to load insights. Please try again.');
          return of(null);
        }),
      )
      .subscribe(data => {
        this.insights.set(data);
        const stale = data?.is_stale ?? false;
        this.isStale.set(stale);
        this.isAIReady.set(!stale);
        if (stale) this.startPolling();
      });
  }

  refreshInsights(): void {
    if (this.isRefreshing()) return;
    this.isRefreshing.set(true);

    this.http
      .post<InsightRefreshResponse>(`${this.apiUrl}/ai-insights/refresh`, null)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isRefreshing.set(false)),
      )
      .subscribe({
        next: res => {
          this.insights.set(res.snapshot);
          this.hasNoData.set(false);
          const stale = res.snapshot.is_stale;
          this.isStale.set(stale);
          this.isAIReady.set(!stale);
          if (stale) this.startPolling();
        },
        error: err => {
          if (err.status === 429) {
            this.toastMessage.set('Already refreshing, check back in a moment');
            setTimeout(() => this.toastMessage.set(null), 4000);
          }
        },
      });
  }

  private startPolling(): void {
    this.stopPolling$.next();

    interval(10_000)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        takeUntil(this.stopPolling$),
        switchMap(() =>
          this.http
            .get<InsightStatusResponse>(`${this.apiUrl}/ai-insights/status`)
            .pipe(catchError(() => of(null))),
        ),
      )
      .subscribe(status => {
        if (!status) return;
        const aiReady = status.latest_weekly ? !status.latest_weekly.is_stale : false;
        if (aiReady) {
          this.stopPolling$.next();
          this.isAIReady.set(true);
          this.isStale.set(false);
          this.http
            .get<WeeklyInsightResponse>(`${this.apiUrl}/ai-insights/weekly`)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(data => this.insights.set(data));
        }
      });
  }

  stopPolling(): void {
    this.stopPolling$.next();
  }
}
