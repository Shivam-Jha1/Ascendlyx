import {
  Component,
  ChangeDetectionStrategy,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { ConsistencyData } from '../../../../core/models/profile.model';

@Component({
  selector: 'app-consistency-gauge',
  standalone: true,
  templateUrl: './consistency-gauge.component.html',
  styleUrls: ['./consistency-gauge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsistencyGaugeComponent implements OnInit {
  consistency = input.required<ConsistencyData>();
  ratingColor = input<string>('var(--accent-green)');

  readonly displayPercent = signal<number>(0);
  readonly strokeOffset = signal<number>(283);

  // SVG circle constants
  readonly radius = 45;
  readonly circumference = 2 * Math.PI * 45; // ~282.74

  get percentileDisplay(): string {
    return `Top ${100 - this.consistency().percentile}% of users`;
  }

  ngOnInit(): void {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const target = this.consistency().percentage;
    const targetOffset = this.circumference - (target / 100) * this.circumference;

    if (prefersReduced) {
      this.displayPercent.set(target);
      this.strokeOffset.set(targetOffset);
      return;
    }

    this.animateGauge(target, targetOffset, 1000);
  }

  private animateGauge(
    targetPercent: number,
    targetOffset: number,
    duration: number
  ): void {
    const startOffset = this.circumference;
    const start = performance.now();

    const animate = (now: number): void => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      this.displayPercent.set(Math.round(eased * targetPercent));
      this.strokeOffset.set(startOffset - eased * (startOffset - targetOffset));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }
}
