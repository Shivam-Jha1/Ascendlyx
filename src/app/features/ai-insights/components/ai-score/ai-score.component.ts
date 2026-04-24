import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
  signal,
  effect,
  OnInit,
} from '@angular/core';
import { WeeklyInsightResponse } from '../../../../core/models/insights.models';

const CIRCUMFERENCE = 2 * Math.PI * 54; // ≈ 339.29

@Component({
  selector: 'app-ai-score',
  standalone: true,
  templateUrl: './ai-score.component.html',
  styleUrls: ['./ai-score.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiScoreComponent implements OnInit {
  insight = input<WeeklyInsightResponse | null>(null);
  isLoading = input<boolean>(false);
  isStale = input<boolean>(false);

  readonly circumference = CIRCUMFERENCE;
  readonly dashOffset = signal(CIRCUMFERENCE);

  score = computed(() => this.insight()?.ai_productivity_score ?? null);
  rating = computed(() => this.insight()?.ai_score_rating ?? null);
  percentile = computed(() => this.insight()?.ai_percentile ?? null);
  consistency = computed(() => Math.round((this.insight()?.consistency_score ?? 0) * 100));
  gritScore = computed(() => Math.round((this.insight()?.avg_daily_completion ?? 0) * 100));
  goalProgress = computed(() => Math.round((this.insight()?.goal_progress_score ?? 0) * 100));

  ratingColor = computed(() => {
    switch (this.rating()) {
      case 'Excellent': return '#22C55E';
      case 'Great':     return '#22C55E';
      case 'Good':      return '#00C2FF';
      case 'Fair':      return '#FFA500';
      default:          return '#EF4444';
    }
  });

  // Track animated bar widths
  animConsistency = signal(0);
  animGrit = signal(0);
  animGoal = signal(0);

  constructor() {
    effect(() => {
      const s = this.score();
      if (s !== null) {
        setTimeout(() => {
          this.dashOffset.set(CIRCUMFERENCE * (1 - s / 100));
        }, 120);
      }
    });

    effect(() => {
      const c = this.consistency();
      const g = this.gritScore();
      const gp = this.goalProgress();
      if (c || g || gp) {
        setTimeout(() => {
          this.animConsistency.set(c);
          this.animGrit.set(g);
          this.animGoal.set(gp);
        }, 300);
      }
    });
  }

  ngOnInit(): void {}
}
