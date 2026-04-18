import {
  Component, ChangeDetectionStrategy, input
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { SubscriptionInfo } from '../../../../core/models/settings.model';

const TIER_COLOR: Record<string, string> = {
  free:       '#8b949e',
  pro:        '#58a6ff',
  enterprise: '#bc8cff',
};

const PRO_FEATURES = [
  'Unlimited AI Coach conversations',
  'Advanced analytics & insights',
  'Priority support & early access',
];

@Component({
  selector: 'app-subscription-section',
  standalone: true,
  imports: [TitleCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="settings-section">
      <h3 class="section-title">💳 Subscription</h3>
      <div class="section-divider"></div>

      <div class="sub-card">
        <div class="sub-header">
          <span class="tier-badge" [style.color]="tierColor()">
            {{ subscription().tier | titlecase }}
          </span>
          <span class="joined">Member since {{ formatDate(subscription().joined_at) }}</span>
        </div>

        @if (subscription().tier === 'free') {
          <div class="pro-teaser">
            <p class="teaser-label">Upgrade to Pro</p>
            <ul class="feature-list">
              @for (f of features; track f) {
                <li>✦ {{ f }}</li>
              }
            </ul>
            <button class="btn-upgrade">Upgrade →</button>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .settings-section { margin-bottom: 2rem; }
    .section-title { font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin-bottom: .75rem; }
    .section-divider { height: 1px; background: var(--border); margin-bottom: 1.25rem; }
    .sub-card { background: rgba(255,255,255,.03); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.1rem 1.25rem; }
    .sub-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: .75rem; }
    .tier-badge { font-size: 1rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
    .joined { font-size: .78rem; color: var(--text-secondary); }
    .pro-teaser { border-top: 1px solid var(--border); padding-top: .85rem; }
    .teaser-label { font-size: .88rem; font-weight: 600; color: var(--text-primary); margin-bottom: .5rem; }
    .feature-list { list-style: none; padding: 0; margin: 0 0 .85rem; }
    .feature-list li { font-size: .8rem; color: var(--text-secondary); padding: 3px 0; }
    .btn-upgrade {
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
      border: none; color: #fff; border-radius: 8px; padding: 7px 18px;
      font-size: .85rem; font-weight: 600; cursor: pointer;
    }
  `],
})
export class SubscriptionSectionComponent {
  readonly subscription = input.required<SubscriptionInfo>();
  readonly features = PRO_FEATURES;

  tierColor(): string { return TIER_COLOR[this.subscription().tier] ?? '#8b949e'; }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
  }
}
