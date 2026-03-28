import { Component, ChangeDetectionStrategy, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { DashboardService, CreateHabitPayload } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardResponse, Habit, Goal, AIScore, DaySummary, HabitCategory } from '../../core/models/dashboard.model';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CATEGORIES: HabitCategory[] = ['fitness', 'study', 'mindfulness', 'reading', 'custom'];

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [DatePipe, DecimalPipe, TitleCasePipe, FormsModule, StatCardComponent, LoaderComponent, EmptyStateComponent],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage implements OnInit {
  private dashboardService = inject(DashboardService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);

  // ── State ──
  loading = signal(true);
  error = signal<string | null>(null);
  dashboard = signal<DashboardResponse | null>(null);

  // ── Derived computed values ──
  userName = computed(() => {
    const user = this.authService.getCurrentUser();
    return user?.name?.split(' ')[0] || 'there';
  });

  greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  });

  today = new Date();

  // Week badges from weekly_summary.days
  weekDays = computed(() => {
    const data = this.dashboard();
    if (!data?.weekly_summary?.days) return [];
    const todayStr = new Date().toISOString().slice(0, 10);
    return data.weekly_summary.days.map(day => {
      const date = new Date(day.date + 'T00:00:00');
      const dayLabel = DAY_LABELS[date.getDay()];
      const isToday = day.date === todayStr;
      const isDone = day.habits_completed > 0 && !isToday;
      return { ...day, dayLabel, isToday, isDone };
    });
  });

  // Best streak across all habits
  bestStreak = computed(() => {
    const habits = this.dashboard()?.habits;
    if (!habits?.length) return 0;
    return Math.max(...habits.map(h => h.streak?.current_streak ?? 0));
  });

  isPersonalBest = computed(() => {
    const habits = this.dashboard()?.habits;
    if (!habits?.length) return false;
    return habits.some(h => h.streak?.current_streak >= h.streak?.longest_streak && h.streak?.current_streak > 0);
  });

  // Today's habit completion
  habitsCompletedToday = computed(() => {
    const data = this.dashboard();
    if (!data?.weekly_summary?.days) return 0;
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayData = data.weekly_summary.days.find(d => d.date === todayStr);
    return todayData?.habits_completed ?? 0;
  });

  totalHabits = computed(() => this.dashboard()?.habits?.length ?? 0);

  habitCompletionPct = computed(() => {
    const total = this.totalHabits();
    if (total === 0) return 0;
    return Math.round((this.habitsCompletedToday() / total) * 100);
  });

  // AI Score
  aiScore = computed(() => this.dashboard()?.ai_score);

  // Weekly productivity bars
  weeklyBars = computed(() => {
    const data = this.dashboard();
    if (!data?.weekly_summary?.days) return [];
    const days = data.weekly_summary.days;
    const totalHabits = this.totalHabits() || 1;
    const todayStr = new Date().toISOString().slice(0, 10);
    return days.map(day => {
      const pct = Math.min(100, Math.round((day.habits_completed / totalHabits) * 100));
      const date = new Date(day.date + 'T00:00:00');
      const dayLabel = DAY_LABELS[date.getDay()];
      const isToday = day.date === todayStr;
      const isFuture = day.date > todayStr;
      return { ...day, pct, dayLabel, isToday, isFuture };
    });
  });

  // Top 3 goals by progress
  topGoals = computed(() => {
    const goals = this.dashboard()?.goals;
    if (!goals?.length) return [];
    return [...goals]
      .filter(g => !g.is_completed)
      .sort((a, b) => b.progress_percentage - a.progress_percentage)
      .slice(0, 3);
  });

  // AI insight text from breakdown
  aiInsightText = computed(() => {
    const score = this.aiScore();
    if (!score) return '';
    const { completion_rate, streak_consistency, goal_progress_rate } = score.breakdown;
    const parts: string[] = [];
    const completionPct = Math.round(completion_rate * 100);

    if (completionPct >= 80) {
      parts.push(`Your 7-day completion rate is <strong>${completionPct}%</strong> — outstanding consistency!`);
    } else if (completionPct >= 50) {
      parts.push(`Your 7-day completion rate is <strong>${completionPct}%</strong> — solid progress, keep pushing!`);
    } else {
      parts.push(`Your 7-day completion rate is <strong>${completionPct}%</strong> — try to check in more consistently this week.`);
    }

    if (streak_consistency >= 0.7) {
      parts.push(`Your streaks are rock-solid.`);
    } else if (streak_consistency >= 0.3) {
      parts.push(`Streak consistency is moderate — don't break the chain!`);
    }

    const goalPct = Math.round(goal_progress_rate * 100);
    if (goalPct >= 60) {
      parts.push(`<strong>${goalPct}%</strong> of your goals are past the halfway mark.`);
    } else {
      parts.push(`Only <strong>${goalPct}%</strong> of goals are past 50% — focus on making progress today.`);
    }

    return parts.join(' ');
  });

  goalProgressColor(index: number): string {
    const colors = ['var(--ax-grad)', 'var(--ax-blue)', 'var(--ax-green)'];
    return colors[index % colors.length];
  }

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.error.set(null);
    this.dashboardService.getDashboard()
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: data => this.dashboard.set(data),
        error: err => {
          const message = err?.error?.message || err?.message || 'Failed to load dashboard';
          this.error.set(message);
        },
      });
  }

  navigateToGoals(): void {
    this.router.navigate(['/goals']);
  }

  navigateToAiInsights(): void {
    this.router.navigate(['/ai-insights']);
  }

  // ── Add Habit Modal ──
  showAddHabit = signal(false);
  savingHabit = signal(false);
  habitError = signal<string | null>(null);
  readonly categories = CATEGORIES;

  habitForm = {
    name: '',
    category: 'fitness' as HabitCategory,
    reminder_time: '09:00',
    duration_minutes: 30,
    daily_target: 1,
  };

  openAddHabit(): void {
    this.habitForm = { name: '', category: 'fitness', reminder_time: '09:00', duration_minutes: 30, daily_target: 1 };
    this.habitError.set(null);
    this.showAddHabit.set(true);
  }

  closeAddHabit(): void {
    this.showAddHabit.set(false);
  }

  selectCategory(cat: HabitCategory): void {
    this.habitForm.category = cat;
  }

  saveHabit(): void {
    const name = this.habitForm.name.trim();
    if (!name) {
      this.habitError.set('Habit name is required.');
      return;
    }

    this.savingHabit.set(true);
    this.habitError.set(null);

    const payload: CreateHabitPayload = {
      name,
      category: this.habitForm.category,
      reminder_time: this.habitForm.reminder_time ? this.habitForm.reminder_time + ':00' : undefined,
      duration_minutes: this.habitForm.duration_minutes || undefined,
      daily_target: this.habitForm.daily_target || 1,
    };

    this.dashboardService.createHabit(payload)
      .pipe(
        finalize(() => this.savingHabit.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.showAddHabit.set(false);
          this.loadDashboard();
        },
        error: err => {
          const message = err?.error?.message || err?.error?.detail || 'Failed to create habit';
          this.habitError.set(message);
        },
      });
  }
}