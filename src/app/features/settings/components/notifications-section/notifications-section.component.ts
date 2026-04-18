import {
  Component, ChangeDetectionStrategy, input, output
} from '@angular/core';
import { ToggleSwitchComponent } from '../../../../shared/components/toggle-switch/toggle-switch.component';
import { NotificationSettings } from '../../../../core/models/settings.model';

interface NotifRow {
  key: keyof NotificationSettings;
  label: string;
  desc: string;
}

const ROWS: NotifRow[] = [
  { key: 'daily_habit_reminders', label: 'Daily Habit Reminders', desc: 'Get reminded at scheduled times' },
  { key: 'streak_alerts',         label: 'Streak Alerts',         desc: 'Notify before streak breaks' },
  { key: 'friend_activity',       label: 'Friend Activity',       desc: 'When friends complete habits' },
  { key: 'ai_coach_nudges',       label: 'AI Coach Nudges',       desc: 'Smart behavioral suggestions' },
  { key: 'leaderboard_updates',   label: 'Leaderboard Updates',   desc: 'Rank changes and achievements' },
];

@Component({
  selector: 'app-notifications-section',
  standalone: true,
  imports: [ToggleSwitchComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="settings-section">
      <h3 class="section-title">🔔 Notifications</h3>
      <div class="section-divider"></div>

      @for (row of rows; track row.key) {
        <div class="settings-row">
          <div class="row-info">
            <span class="row-label">{{ row.label }}</span>
            <span class="row-desc">{{ row.desc }}</span>
          </div>
          <app-toggle-switch
            [checked]="!!settings()[row.key]"
            [attr.aria-label]="'Toggle ' + row.label"
            (toggled)="emitChange(row.key, $event)" />
        </div>
      }
    </section>
  `,
  styles: [`
    .settings-section { margin-bottom: 2rem; }
    .section-title { font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin-bottom: .75rem; }
    .section-divider { height: 1px; background: var(--border); margin-bottom: 1.25rem; }
    .settings-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: .85rem 0; border-bottom: 1px solid var(--border);
    }
    .settings-row:last-child { border-bottom: none; }
    .row-info { flex: 1; }
    .row-label { display: block; font-size: .9rem; font-weight: 600; color: var(--text-primary); }
    .row-desc  { display: block; font-size: .78rem; color: var(--text-secondary); margin-top: 2px; }
  `],
})
export class NotificationsSectionComponent {
  readonly settings = input.required<NotificationSettings>();
  readonly changed  = output<Partial<NotificationSettings>>();

  readonly rows = ROWS;

  emitChange(key: keyof NotificationSettings, value: boolean): void {
    this.changed.emit({ [key]: value } as Partial<NotificationSettings>);
  }
}
