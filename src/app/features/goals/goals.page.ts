import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe, DecimalPipe, TitleCasePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { GoalService } from '../../core/services/goal.service';
import {
  GoalResponse,
  GoalPriority,
  MilestoneCreate,
  GoalCreate,
  GoalUpdate,
} from '../../core/models/goal.model';
import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

interface GoalForm {
  title: string;
  description: string;
  priority: GoalPriority;
  deadline: string;
  target_value: number | null;
  unit: string;
  category: string;
  milestones: string[];
}

const PRIORITIES: GoalPriority[] = ['high', 'medium', 'low'];
const CATEGORIES = ['general', 'fitness', 'study', 'mindfulness', 'reading', 'finance', 'career', 'health'];

@Component({
  selector: 'app-goals-page',
  standalone: true,
  imports: [DatePipe, DecimalPipe, TitleCasePipe, NgClass, FormsModule, LoaderComponent, EmptyStateComponent],
  templateUrl: './goals.page.html',
  styleUrls: ['./goals.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoalsPage implements OnInit {
  private goalService = inject(GoalService);
  private destroyRef = inject(DestroyRef);

  // ── State ──
  loading = signal(true);
  error = signal<string | null>(null);
  goals = signal<GoalResponse[]>([]);
  includeCompleted = signal(true);
  toggleLoading = signal<string | null>(null); // milestoneId being toggled

  // ── Add Goal Modal ──
  showAddModal = signal(false);
  formLoading = signal(false);
  formError = signal<string | null>(null);
  goalForm: GoalForm = this.defaultForm();
  newMilestoneLabel = '';

  // ── Edit Goal Modal ──
  showEditModal = signal(false);
  editingGoalId = signal<string | null>(null);
  editForm: GoalForm = this.defaultForm();
  editMilestoneLabel = '';
  editFormLoading = signal(false);
  editFormError = signal<string | null>(null);

  // ── Progress Modal ──
  showProgressModal = signal(false);
  progressGoal = signal<GoalResponse | null>(null);
  progressDelta: number | null = null;
  progressNote = '';
  progressLoading = signal(false);
  progressError = signal<string | null>(null);

  readonly priorities = PRIORITIES;
  readonly categories = CATEGORIES;

  // ── Derived ──
  allGoals = computed(() => this.goals());

  ngOnInit(): void {
    this.loadGoals();
  }

  loadGoals(): void {
    this.loading.set(true);
    this.error.set(null);
    this.goalService
      .getGoals(this.includeCompleted())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (goals) => this.goals.set(goals),
        error: (err) => this.error.set(err?.error?.detail ?? 'Failed to load goals'),
      });
  }

  toggleFilter(): void {
    this.includeCompleted.update(v => !v);
    this.loadGoals();
  }

  // ── Priority helpers ──
  priorityClass(p: GoalPriority): string {
    return { high: 'priority-high', medium: 'priority-medium', low: 'priority-low' }[p];
  }

  priorityLabel(p: GoalPriority): string {
    return { high: 'HIGH PRIORITY', medium: 'MEDIUM', low: 'LOW' }[p];
  }

  progressBarClass(goal: GoalResponse): string {
    const pct = goal.progress_percentage;
    if (pct >= 80) return 'bar-green';
    if (pct >= 40) return 'bar-blue';
    return 'bar-orange';
  }

  // ── Milestone toggle ──
  toggleMilestone(goal: GoalResponse, milestoneId: string): void {
    if (this.toggleLoading()) return;
    this.toggleLoading.set(milestoneId);
    this.goalService
      .toggleMilestone(goal.id, milestoneId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.toggleLoading.set(null)),
      )
      .subscribe({
        next: (updated) => {
          this.goals.update(list => list.map(g => (g.id === updated.id ? updated : g)));
        },
        error: (err) => {
          console.error('Failed to toggle milestone', err);
        },
      });
  }

  // ── Add Goal Modal ──
  openAddModal(): void {
    this.goalForm = this.defaultForm();
    this.newMilestoneLabel = '';
    this.formError.set(null);
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    this.showAddModal.set(false);
  }

  addMilestoneToForm(): void {
    const label = this.newMilestoneLabel.trim();
    if (!label) return;
    if (!this.goalForm.milestones.includes(label)) {
      this.goalForm.milestones = [...this.goalForm.milestones, label];
    }
    this.newMilestoneLabel = '';
  }

  removeMilestoneFromForm(index: number): void {
    this.goalForm.milestones = this.goalForm.milestones.filter((_, i) => i !== index);
  }

  onMilestoneLabelKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addMilestoneToForm();
    }
  }

  submitGoal(): void {
    const form = this.goalForm;
    if (!form.title.trim()) {
      this.formError.set('Title is required.');
      return;
    }

    const milestones: MilestoneCreate[] = form.milestones.map(label => ({ label }));

    const payload: GoalCreate = {
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      category: form.category,
      deadline: form.deadline || null,
      target_value: form.target_value !== null ? String(form.target_value) : null,
      unit: form.unit.trim() || null,
      milestones,
    };

    this.formLoading.set(true);
    this.formError.set(null);

    this.goalService
      .createGoal(payload)
      .pipe(finalize(() => this.formLoading.set(false)))
      .subscribe({
        next: (created) => {
          this.goals.update(list => [created, ...list]);
          this.closeAddModal();
        },
        error: (err) => {
          this.formError.set(err?.error?.detail ?? 'Failed to create goal. Please try again.');
        },
      });
  }

  // ── Edit Goal Modal ──
  openEditModal(goal: GoalResponse): void {
    this.editingGoalId.set(goal.id);
    this.editForm = {
      title: goal.title,
      description: goal.description ?? '',
      priority: goal.priority,
      deadline: goal.deadline ? goal.deadline.slice(0, 10) : '',
      target_value: goal.target_value != null ? parseFloat(goal.target_value) : null,
      unit: goal.unit ?? '',
      category: goal.category,
      milestones: goal.milestones.map(m => m.label),
    };
    this.editMilestoneLabel = '';
    this.editFormError.set(null);
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.editingGoalId.set(null);
  }

  addMilestoneToEditForm(): void {
    const label = this.editMilestoneLabel.trim();
    if (!label) return;
    if (!this.editForm.milestones.includes(label)) {
      this.editForm.milestones = [...this.editForm.milestones, label];
    }
    this.editMilestoneLabel = '';
  }

  removeMilestoneFromEditForm(index: number): void {
    this.editForm.milestones = this.editForm.milestones.filter((_, i) => i !== index);
  }

  onEditMilestoneLabelKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addMilestoneToEditForm();
    }
  }

  submitEdit(): void {
    const goalId = this.editingGoalId();
    if (!goalId) return;
    const form = this.editForm;
    if (!form.title.trim()) {
      this.editFormError.set('Title is required.');
      return;
    }

    const milestones: MilestoneCreate[] = form.milestones.map(label => ({ label }));

    const payload: GoalUpdate = {
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      category: form.category,
      deadline: form.deadline || null,
      target_value: form.target_value !== null ? String(form.target_value) : null,
      unit: form.unit.trim() || null,
      milestones,
    };

    this.editFormLoading.set(true);
    this.editFormError.set(null);

    this.goalService
      .updateGoal(goalId, payload)
      .pipe(finalize(() => this.editFormLoading.set(false)))
      .subscribe({
        next: (updated) => {
          this.goals.update(list => list.map(g => (g.id === updated.id ? updated : g)));
          this.closeEditModal();
        },
        error: (err) => {
          this.editFormError.set(err?.error?.detail ?? 'Failed to update goal. Please try again.');
        },
      });
  }

  // ── Progress Modal ──
  openProgressModal(goal: GoalResponse): void {
    this.progressGoal.set(goal);
    this.progressDelta = null;
    this.progressNote = '';
    this.progressError.set(null);
    this.showProgressModal.set(true);
  }

  closeProgressModal(): void {
    this.showProgressModal.set(false);
    this.progressGoal.set(null);
  }

  submitProgress(): void {
    const goal = this.progressGoal();
    if (!goal) return;
    const delta = this.progressDelta;
    if (delta === null || isNaN(delta)) {
      this.progressError.set('Enter a valid number.');
      return;
    }

    this.progressLoading.set(true);
    this.progressError.set(null);

    this.goalService
      .updateProgress(goal.id, { delta, note: this.progressNote.trim() || null })
      .pipe(finalize(() => this.progressLoading.set(false)))
      .subscribe({
        next: (updated) => {
          this.goals.update(list => list.map(g => (g.id === updated.id ? updated : g)));
          this.closeProgressModal();
        },
        error: (err) => {
          this.progressError.set(err?.error?.detail ?? 'Failed to update progress.');
        },
      });
  }

  // ── Delete ──
  deleteGoal(goalId: string): void {
    this.goalService
      .deleteGoal(goalId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.goals.update(list => list.filter(g => g.id !== goalId));
        },
        error: (err) => {
          console.error('Failed to delete goal', err);
        },
      });
  }

  private defaultForm(): GoalForm {
    return {
      title: '',
      description: '',
      priority: 'medium',
      deadline: '',
      target_value: null,
      unit: '',
      category: 'general',
      milestones: [],
    };
  }
}
