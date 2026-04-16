import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { PublicGoal } from '../../../../core/models/profile.model';
import { ProgressBarComponent } from '../../../../shared/components/progress-bar';

@Component({
  selector: 'app-public-goals',
  standalone: true,
  imports: [ProgressBarComponent],
  templateUrl: './public-goals.component.html',
  styleUrls: ['./public-goals.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicGoalsComponent {
  goals = input.required<PublicGoal[]>();

  getBarColor(priority: string): string {
    const map: Record<string, string> = {
      high: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-blue))',
      medium: 'var(--accent-orange)',
      low: 'var(--accent-green)',
    };
    return map[priority] ?? 'var(--accent-blue)';
  }

  getProgressDetail(goal: PublicGoal): string {
    if (goal.unit && goal.target_value) {
      const current = Math.round((goal.progress_percentage / 100) * goal.target_value);
      return `${goal.progress_percentage}% · ${current}${goal.unit}`;
    }
    return `${goal.progress_percentage}%`;
  }
}
