import {
  Component,
  ChangeDetectionStrategy,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { QuickStats } from '../../../../core/models/profile.model';

interface StatTile {
  label: string;
  targetValue: number;
  color: string;
  prefix: string;
  suffix: string;
}

@Component({
  selector: 'app-quick-stats',
  standalone: true,
  templateUrl: './quick-stats.component.html',
  styleUrls: ['./quick-stats.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickStatsComponent implements OnInit {
  stats = input.required<QuickStats>();

  readonly displayValues = signal<number[]>([0, 0, 0, 0]);

  get tiles(): StatTile[] {
    const s = this.stats();
    return [
      { label: 'Current Streak', targetValue: s.current_streak, color: 'var(--accent-orange)', prefix: '🔥 ', suffix: '' },
      { label: 'AI Score', targetValue: s.ai_score, color: 'var(--accent-blue)', prefix: '', suffix: '' },
      { label: 'Friends', targetValue: s.friends_count, color: 'var(--text-primary)', prefix: '', suffix: '' },
      { label: 'Consistency', targetValue: s.consistency_percent, color: 'var(--accent-green)', prefix: '', suffix: '%' },
    ];
  }

  ngOnInit(): void {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targets = [
      this.stats().current_streak,
      this.stats().ai_score,
      this.stats().friends_count,
      this.stats().consistency_percent,
    ];

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
