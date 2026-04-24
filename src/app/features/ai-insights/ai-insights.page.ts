import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  computed,
  signal,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { InsightsService } from '../../core/services/insights.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardResponse } from '../../core/models/dashboard.model';
import { ProductivityDayPoint } from '../../core/models/insights.models';

import { ProductivityChartComponent } from './components/productivity-chart/productivity-chart.component';
import { WeeklyReportComponent } from './components/weekly-report/weekly-report.component';
import { AiScoreComponent } from './components/ai-score/ai-score.component';
import { AiCoachComponent } from './components/ai-coach/ai-coach.component';
import { SmartNudgesComponent } from './components/smart-nudges/smart-nudges.component';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

@Component({
  selector: 'app-ai-insights-page',
  standalone: true,
  imports: [
    ProductivityChartComponent,
    WeeklyReportComponent,
    AiScoreComponent,
    AiCoachComponent,
    SmartNudgesComponent,
  ],
  templateUrl: './ai-insights.page.html',
  styleUrls: ['./ai-insights.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiInsightsPage implements OnInit {
  readonly insightsService = inject(InsightsService);
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);

  private dashboard = signal<DashboardResponse | null>(null);
  dashboardLoading = signal(false);

  // Expose service signals as shorthand
  insight      = this.insightsService.insights;
  isLoading    = this.insightsService.isLoading;
  isStale      = this.insightsService.isStale;
  isAIReady    = this.insightsService.isAIReady;
  isRefreshing = this.insightsService.isRefreshing;
  toastMessage = this.insightsService.toastMessage;
  error        = this.insightsService.error;
  hasNoData    = this.insightsService.hasNoData;

  // Chart data derived from dashboard weekly summary
  chartDays = computed((): ProductivityDayPoint[] => {
    const dash = this.dashboard();
    if (!dash?.weekly_summary?.days?.length) return [];

    const todayStr = new Date().toISOString().slice(0, 10);
    const total = dash.habits.length || 1;

    return dash.weekly_summary.days.map(day => {
      const d = new Date(day.date + 'T00:00:00');
      return {
        date: day.date,
        day_name: DAY_NAMES[d.getDay()],
        productivity_score: Math.round((day.habits_completed / total) * 100),
        habits_completed: day.habits_completed,
        habits_total: total,
        is_today: day.date === todayStr,
      };
    });
  });

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.insightsService.stopPolling());
    this.insightsService.loadInsights();
    this.loadDashboard();
  }

  private loadDashboard(): void {
    this.dashboardLoading.set(true);
    this.dashboardService
      .getDashboard()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.dashboardLoading.set(false)),
      )
      .subscribe({ next: data => this.dashboard.set(data), error: () => {} });
  }

  refresh(): void {
    this.insightsService.refreshInsights();
  }
}
