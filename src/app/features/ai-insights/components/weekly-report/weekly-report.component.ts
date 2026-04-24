import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { WeeklyInsightResponse } from '../../../../core/models/insights.models';

@Component({
  selector: 'app-weekly-report',
  standalone: true,
  templateUrl: './weekly-report.component.html',
  styleUrls: ['./weekly-report.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeeklyReportComponent {
  report = input<WeeklyInsightResponse | null>(null);
  isLoading = input<boolean>(false);

  habitsDelta = computed(() => {
    const r = this.report();
    if (!r) return 0;
    return r.habits_completed - r.prev_week_habits_completed;
  });

  avgDailyScore = computed(() => {
    const r = this.report();
    if (!r) return 0;
    return Math.round(r.avg_daily_completion * 100);
  });

  missedHabits = computed(() => {
    const r = this.report();
    if (!r) return 0;
    return r.habits_total_possible - r.habits_completed;
  });

}
