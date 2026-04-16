import {
  Component,
  ChangeDetectionStrategy,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { ProductivityStats } from '../../../../core/models/profile.model';

interface ProdTile {
  label: string;
  targetValue: number;
  color: string;
  prefix: string;
  suffix: string;
}

@Component({
  selector: 'app-productivity-stats',
  standalone: true,
  templateUrl: './productivity-stats.component.html',
  styleUrls: ['./productivity-stats.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductivityStatsComponent implements OnInit {
  stats = input.required<ProductivityStats>();

  readonly displayValues = signal<number[]>([0, 0, 0, 0, 0, 0]);

  get tiles(): ProdTile[] {
    const s = this.stats();
    return [
      { label: 'Habits Done', targetValue: s.habits_done_total, color: 'var(--accent-purple)', prefix: '', suffix: '' },
      { label: 'Active Goals', targetValue: s.active_goals_count, color: 'var(--accent-blue)', prefix: '', suffix: '' },
      { label: 'Books Read', targetValue: s.books_read_count, color: 'var(--accent-green)', prefix: '', suffix: '' },
      { label: 'Longest Streak', targetValue: s.longest_streak_days, color: 'var(--accent-orange)', prefix: '🔥 ', suffix: '' },
      { label: 'Focus Time', targetValue: Math.round(s.focus_time_hours), color: 'var(--text-primary)', prefix: '', suffix: 'h' },
      { label: 'Badges Earned', targetValue: s.badges_earned_count, color: 'var(--accent-purple)', prefix: '', suffix: '' },
    ];
  }

  ngOnInit(): void {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targets = this.tiles.map(t => t.targetValue);

    if (prefersReduced) {
      this.displayValues.set(targets);
      return;
    }

    this.countUp(targets, 800);
  }

  private countUp(targets: number[], duration: number): void {
    const start = performance.now();
    const animate = (now: number): void => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      const current = targets.map(t => Math.round(eased * t));
      this.displayValues.set(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }
}
