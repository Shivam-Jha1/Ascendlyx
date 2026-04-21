import { Component, ChangeDetectionStrategy, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TitleCasePipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, switchMap } from 'rxjs';

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

  isCompletedToday(habit: Habit): boolean {
    return habit.today_log?.is_completed === true;
  }

  // ── Stats ──
  habitsCompletedToday = computed(() =>
    this.allHabits().filter(h => this.isCompletedToday(h)).length
  );

  totalHabits = computed(() => this.allHabits().length);

  todayCompletionPct = computed(() => {
    const total = this.totalHabits();
    if (total === 0) return 0;
    return Math.round((this.habitsCompletedToday() / total) * 100);
  });

  weeklyAvg = computed(() => {
    const raw = this.dashboard()?.weekly_summary?.completion_rate ?? 0;
    let pct = raw <= 1 ? raw * 100 : raw;
    return Math.round(Math.min(100, Math.max(0, pct)));
  });

  bestStreak = computed(() => {
    const habits = this.allHabits();
    if (!habits.length) return 0;
    return Math.max(...habits.map(h => h.streak?.current_streak ?? 0));
  });

  // ── Heatmap ──
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

  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  // ═══════════════════════════════════════
  //  EDIT HABIT POPUP (check-in flow)
  // ═══════════════════════════════════════
  showEditPopup = signal(false);
  savingEdit = signal(false);
  editError = signal<string | null>(null);
  editHabit = signal<Habit | null>(null);
  editSubmitted = signal(false);
  wasAlreadyCompleted = false;

  editForm = {
    actual_duration: null as number | null,
    completed_at: '',
  };

  isoToLocalTime(iso: string): string {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  openEditPopup(habit: Habit): void {
    this.editHabit.set(habit);
    this.wasAlreadyCompleted = this.isCompletedToday(habit);

    // Pre-fill from existing today_log if available
    const log = habit.today_log;
    this.editForm = {
      actual_duration: log?.actual_duration ?? (habit.expected_duration ?? null),
      completed_at: log?.completed_at
        ? this.isoToLocalTime(log.completed_at)
        : new Date().toTimeString().slice(0, 5),
    };

    this.editError.set(null);
    this.editSubmitted.set(false);
    this.showEditPopup.set(true);
  }

  isActualDurationInvalid(): boolean {
    return this.editForm.actual_duration == null || this.editForm.actual_duration <= 0;
  }

  isCompletedAtInvalid(): boolean {
    return !/^\d{2}:\d{2}$/.test(this.editForm.completed_at);
  }

  private isEditFormInvalid(): boolean {
    return this.isActualDurationInvalid() || this.isCompletedAtInvalid();
  }

  private buildCompletedAtIso(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const completedAt = new Date(this.today);
    completedAt.setHours(hours, minutes, 0, 0);
    return completedAt.toISOString();
  }

  private updateHabitTodayLog(habitId: string, todayLog: Habit['today_log']): void {
    const currentDashboard = this.dashboard();
    if (!currentDashboard) return;

    this.dashboard.set({
      ...currentDashboard,
      habits: currentDashboard.habits.map(habit =>
        habit.id === habitId ? { ...habit, today_log: todayLog } : habit
      ),
    });
  }

  closeEditPopup(): void {
    this.showEditPopup.set(false);
    this.editHabit.set(null);
    this.editSubmitted.set(false);
  }

  cancelEdit(): void {
    const habit = this.editHabit();
    if (habit  && habit.today_log) {
      this.dashboardService.deleteHabitLog(habit.id, this.todayStr)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.updateHabitTodayLog(habit.id, null);
            this.closeEditPopup();
          },
          error: () => {
            // Even on error, clear local state and close
            this.updateHabitTodayLog(habit.id, null);
            this.closeEditPopup();
          },
        });
    } else {
      this.closeEditPopup();
    }
  }

  saveEdit(): void {
    const habit = this.editHabit();
    if (!habit) return;

    this.editSubmitted.set(true);
    if (this.isEditFormInvalid()) {
      this.editError.set('Enter both actual duration and completed time before saving.');
      return;
    }

    this.savingEdit.set(true);
    this.editError.set(null);
    const payload = {
      actual_duration: this.editForm.actual_duration!,
      completed_at: this.buildCompletedAtIso(this.editForm.completed_at),
    };

    if (this.wasAlreadyCompleted) {
      this.dashboardService.updateHabitLog(habit.id, this.todayStr, payload)
        .pipe(
          finalize(() => this.savingEdit.set(false)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: () => {
            this.closeEditPopup();
            this.loadData();
          },
          error: err => this.editError.set(err?.error?.message || err?.error?.detail || 'Failed to update log'),
        });
    } else {
      // 1) Toggle → mark complete, then 2) Update log with actual_duration
      this.dashboardService.toggleHabit(habit.id, this.todayStr)
        .pipe(
          switchMap(() => {
            return this.dashboardService.updateHabitLog(habit.id, this.todayStr, payload);
          }),
          finalize(() => this.savingEdit.set(false)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: () => {
            this.closeEditPopup();
            this.loadData();
          },
          error: err => {
            this.editError.set(err?.error?.message || err?.error?.detail || 'Failed to complete habit');
          },
        });
    }
  }

  // ═══════════════════════════════════════
  //  DELETE HABIT
  // ═══════════════════════════════════════
  showDeleteConfirm = signal(false);
  deletingHabit = signal(false);
  deleteTargetHabit = signal<Habit | null>(null);

  openDeleteConfirm(habit: Habit, event: Event): void {
    event.stopPropagation();
    this.deleteTargetHabit.set(habit);
    this.showDeleteConfirm.set(true);
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.deleteTargetHabit.set(null);
  }

  confirmDelete(): void {
    const habit = this.deleteTargetHabit();
    if (!habit) return;
    this.deletingHabit.set(true);
    this.dashboardService.deleteHabit(habit.id)
      .pipe(
        finalize(() => this.deletingHabit.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.showDeleteConfirm.set(false);
          this.deleteTargetHabit.set(null);
          this.loadData();
        },
        error: err => console.error('Delete failed:', err),
      });
  }

  // ═══════════════════════════════════════
  //  UNCOMPLETE (toggle back to incomplete)
  // ═══════════════════════════════════════
  uncompleteLoading = signal<string | null>(null);

  uncompleteHabit(habit: Habit): void {
    if (!this.isCompletedToday(habit) || this.uncompleteLoading()) return;
    this.uncompleteLoading.set(habit.id);
    this.dashboardService.toggleHabit(habit.id, this.todayStr)
      .pipe(
        finalize(() => this.uncompleteLoading.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.loadData(),
        error: err => console.error('Uncomplete failed:', err),
      });
  }

  // ═══════════════════════════════════════
  //  ADD HABIT MODAL
  // ═══════════════════════════════════════
  showAddHabit = signal(false);
  savingHabit = signal(false);
  habitError = signal<string | null>(null);
  readonly categories = CATEGORIES;

  habitForm = {
    name: '',
    category: 'fitness' as HabitCategory,
    reminder_time: '09:00',
    expected_duration: 30 as number | null,
  };

  openAddHabit(): void {
    this.habitForm = { name: '', category: 'fitness', reminder_time: '09:00', expected_duration: 30 };
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

    const rawTime = this.habitForm.reminder_time;
    const normalizedTime = rawTime
      ? (rawTime.length === 5 ? rawTime + ':00' : rawTime)
      : undefined;

    const payload: CreateHabitPayload = {
      name: this.habitForm.name.trim(),
      category: this.habitForm.category,
      reminder_time: normalizedTime,
      expected_duration: this.habitForm.expected_duration && this.habitForm.expected_duration > 0
        ? this.habitForm.expected_duration
        : undefined,
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