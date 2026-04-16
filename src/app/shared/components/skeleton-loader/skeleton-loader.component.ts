import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  template: `
    @if (variant() === 'profile') {
      <div class="skeleton-profile">
        <div class="skeleton-hero shimmer"></div>
        <div class="skeleton-grid">
          <div class="skeleton-col-left">
            <div class="skeleton-card shimmer"></div>
            <div class="skeleton-card shimmer" style="height: 180px"></div>
          </div>
          <div class="skeleton-col-right">
            <div class="skeleton-card shimmer"></div>
            <div class="skeleton-card shimmer" style="height: 140px"></div>
            <div class="skeleton-card shimmer" style="height: 120px"></div>
          </div>
        </div>
      </div>
    } @else if (variant() === 'card') {
      <div class="skeleton-card shimmer"></div>
    } @else {
      <div class="skeleton-list">
        <div class="skeleton-row shimmer"></div>
        <div class="skeleton-row shimmer"></div>
        <div class="skeleton-row shimmer"></div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; width: 100%; }

    .skeleton-profile { max-width: 1100px; margin: 0 auto; padding: 2rem; }
    .skeleton-hero {
      height: 200px;
      border-radius: var(--radius-xl, 20px);
      margin-bottom: 1.5rem;
    }
    .skeleton-grid {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: 1.5rem;
    }
    .skeleton-col-left, .skeleton-col-right {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .skeleton-card {
      height: 220px;
      border-radius: var(--radius-lg, 14px);
    }
    .skeleton-list { display: flex; flex-direction: column; gap: 12px; }
    .skeleton-row { height: 48px; border-radius: var(--radius-md, 10px); }

    .shimmer {
      background: linear-gradient(
        90deg,
        var(--bg-card, #161b22) 25%,
        rgba(255, 255, 255, 0.05) 50%,
        var(--bg-card, #161b22) 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s ease-in-out infinite;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    @media (max-width: 900px) {
      .skeleton-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .shimmer { animation: none; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonLoaderComponent {
  variant = input<'profile' | 'card' | 'list'>('card');
}
