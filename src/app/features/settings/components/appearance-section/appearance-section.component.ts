import {
  Component, ChangeDetectionStrategy, input, output
} from '@angular/core';
import { AppearanceSettings, Theme } from '../../../../core/models/settings.model';

@Component({
  selector: 'app-appearance-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="settings-section" id="appearance">
      <h3 class="section-title">🎨 Appearance</h3>
      <div class="section-divider"></div>

      <!-- Theme -->
      <div class="settings-row">
        <div class="row-info">
          <span class="row-label">Theme</span>
          <span class="row-desc">Choose between dark and light mode</span>
        </div>
        <div class="theme-segmented">
          <button
            class="theme-pill"
            [class.active]="settings().theme === 'dark'"
            (click)="emitTheme('dark')"
            aria-label="Dark theme">
            🌙 Dark
          </button>
          <button
            class="theme-pill"
            [class.active]="settings().theme === 'light'"
            (click)="emitTheme('light')"
            aria-label="Light theme">
            ☀️ Light
          </button>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .settings-section { margin-bottom: 2rem; }
    .section-title { font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin-bottom: .75rem; }
    .section-divider { height: 1px; background: var(--border); margin-bottom: 1.25rem; }
    .settings-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: .85rem 0;
    }
    .row-info { flex: 1; }
    .row-label { display: block; font-size: .9rem; font-weight: 600; color: var(--text-primary); }
    .row-desc  { display: block; font-size: .78rem; color: var(--text-secondary); margin-top: 2px; }
    .theme-segmented { display: flex; gap: 0; background: rgba(255,255,255,.06); border-radius: 8px; padding: 3px; }
    .theme-pill {
      padding: 5px 14px; border-radius: 6px; border: none; background: transparent;
      color: var(--text-secondary); font-size: .82rem; cursor: pointer; transition: all .2s;
    }
    .theme-pill.active { background: var(--accent-blue); color: #fff; }
  `],
})
export class AppearanceSectionComponent {
  readonly settings = input.required<AppearanceSettings>();
  readonly changed  = output<Partial<AppearanceSettings>>();

  emitTheme(theme: Theme): void {
    this.changed.emit({ theme });
  }
}
