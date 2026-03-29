import { Component, ChangeDetectionStrategy, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TitleCasePipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { DashboardService, CreateHabitPayload } from '../../core/services/dashboard.service';
import { DashboardResponse, Habit, HabitCategory } from '../../core/models/dashboard.model';
import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

const CATEGORIES: HabitCategory[] = ['fitness', 'study', 'mindfulness', 'reading', 'custom'];

@Component({
  selector: 'app-daily-log-page',
  standalone: true,
  imports: [TitleCasePipe, DatePipe, FormsModule, LoaderComponent, EmptyStateComponent],
  templateUrl: './daily-log.page.html',
  styleUrls: ['./daily-log.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DailyLogPage implements OnInit {
  private dashboardService = inject(DashboardService);
  private destroyRef = inject(DestroyRef);

  // ── State ──
  loading = signal(true);
  error = signal<string | null>(null);
  dashboard = signal<DashboardResponse | null>(null);
  searchQuery = signal('');
  checkinLoading = signal<string | null>(null);

  // ── Today info ──
  readonly today = new Date();
  readonly todayStr = this.today.toISOString().slice(0, 10);
  readonly dayName = new Intl.DateTimeFormat('en', { weekday: 'long' }).format(this.today);

  // ── Habits ──
  allHabits = computed(() => this.dashboard()?.habits?.filter(h => h.is_active) ?? []);

  filteredHabits = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const habits = this.allHabits();
    if (!query) return habits;
    return habits.filter(h =>
      h.name.toLowerCase().includes(query) ||
      h.category.toLowerCase().includes(query)
    );
  });

  isCheckedInToday(habit: Habit): boolean {
    return habit.streak?.last_checkin_date === this.todayStr;
  }

  // ── Stats ──
  habitsCompletedToday = computed(() =>
    this.allHabits().filter(h => this.isCheckedInToday(h)).length
  );

  totalHabits = computed(() => this.allHabits().length);

  todayCompletionPct = computed(() => {
    const total = this.totalHabits();
    if (total === 0) return 0;
    return Math.round((this.habitsCompletedToday() / total) * 100);
  });

  weeklyAvg = computed(() => {
    const raw = this.dashboard()?.weekly_summary?.completion_rate ?? 0;
    // Backend may return a ratio (0–1) or already a percentage (> 1)
    let pct = raw <= 1 ? raw * 100 : raw;
    return Math.round(Math.min(100, Math.max(0, pct)));
  });

  bestStreak = computed(() => {
    const habits = this.allHabits();
    if (!habits.length) return 0;
    return Math.max(...habits.map(h => h.streak?.current_streak ?? 0));
  });

  // ── Heatmap — 7 cells from weekly_summary.days ──
  readonly DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  heatmapCells = computed(() => {
    const data = this.dashboard();
    const days = data?.weekly_summary?.days ?? [];
    const totalHabits = this.totalHabits();
    const sortedDays = [...days].sort((a, b) => a.date.localeCompare(b.date));
    return sortedDays.map(day => {
      const pct = totalHabits === 0
        ? 0
        : Math.round((day.habits_completed / totalHabits) * 100);
      let level = 0;
      if (pct > 0 && pct < 50) level = 1;
      else if (pct >= 50 && pct < 80) level = 2;
      else if (pct >= 80) level = 3;
      const d = new Date(day.date + 'T00:00:00');
      const dayLabel = this.DAY_LABELS[d.getDay()];
      return { date: day.date, level, dayLabel };
    });
  });

  // ── Helpers ──
  formatTime(time: string): string {
    if (!time) return '';
    const [h, m] = time.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${m} ${ampm}`;
  }

  // ── Lifecycle ──
  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    this.dashboardService.getDashboard()
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: data => this.dashboard.set(data),
        error: err => this.error.set(err?.error?.message || err?.message || 'Failed to load habits'),
      });
  }

  checkinHabit(habit: Habit): void {
    if (this.isCheckedInToday(habit) || this.checkinLoading()) return;
    this.checkinLoading.set(habit.id);
    this.dashboardService.checkinHabit(habit.id)
      .pipe(
        finalize(() => this.checkinLoading.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.loadData(),
        error: err => console.error('Checkin failed:', err),
      });
  }

  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
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
    if (!this.habitForm.name.trim()) {
      this.habitError.set('Habit name is required.');
      return;
    }
    this.savingHabit.set(true);
    this.habitError.set(null);
    // Normalize reminder_time from HH:MM to HH:MM:SS (backend expects HH:MM:SS)
    const rawTime = this.habitForm.reminder_time;
    const normalizedTime = rawTime
      ? (rawTime.length === 5 ? rawTime + ':00' : rawTime)
      : undefined;

    const dailyTarget =
      this.habitForm.daily_target && this.habitForm.daily_target > 0
        ? this.habitForm.daily_target
        : 1;

    const payload: CreateHabitPayload = {
      name: this.habitForm.name.trim(),
      category: this.habitForm.category,
      reminder_time: normalizedTime,
      duration_minutes: this.habitForm.duration_minutes || undefined,
      daily_target: dailyTarget,
    };
    this.dashboardService.createHabit(payload)
      .pipe(
        finalize(() => this.savingHabit.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.closeAddHabit();
          this.loadData();
        },
        error: err => {
          const message = err?.error?.message || err?.error?.detail || 'Failed to create habit';
          this.habitError.set(message);
        },
      });
  }
}