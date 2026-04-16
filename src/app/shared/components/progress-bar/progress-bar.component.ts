import {
  Component,
  ChangeDetectionStrategy,
  input,
  ElementRef,
  AfterViewInit,
  inject,
} from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  template: `
    <div
      class="progress-track"
      [style.height.px]="height()"
      role="progressbar"
      [attr.aria-valuenow]="percentage()"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div
        class="progress-fill"
        [style.background]="color()"
        [style.width.%]="animatedWidth"
      ></div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .progress-track {
      width: 100%;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 100px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      border-radius: 100px;
      width: 0;
      transition: width 0.6s ease-out;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressBarComponent implements AfterViewInit {
  percentage = input.required<number>();
  color = input<string>('var(--accent-blue)');
  height = input<number>(6);

  animatedWidth = 0;

  private readonly el = inject(ElementRef);

  ngAfterViewInit(): void {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      this.animatedWidth = this.percentage();
      return;
    }
    requestAnimationFrame(() => {
      this.animatedWidth = this.percentage();
    });
  }
}
