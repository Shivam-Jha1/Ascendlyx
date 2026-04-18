import {
  Component, ChangeDetectionStrategy, input, output
} from '@angular/core';
import { ToggleSwitchComponent } from '../../../../shared/components/toggle-switch/toggle-switch.component';
import { AppearanceSettings, AccentColor, Theme } from '../../../../core/models/settings.model';

const SWATCHES: { color: AccentColor; label: string; hex: string }[] = [
  { color: 'blue',  label: 'Blue',  hex: '#58a6ff' },
  { color: 'cyan',  label: 'Cyan',  hex: '#39d2c0' },
  { color: 'green', label: 'Green', hex: '#3fb950' },
  { color: 'red',   label: 'Red',   hex: '#f85149' },
];

@Component({
  selector: 'app-appearance-section',
  standalone: true,
  imports: [ToggleSwitchComponent],
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
            (click)="emitAppearance('theme', 'dark')"
            aria-label="Dark theme">
            🌙 Dark
          </button>
          <button
            class="theme-pill"
            [class.active]="settings().theme === 'light'"
            (click)="emitAppearance('theme', 'light')"
            aria-label="Light theme">
            ☀️ Light
          </button>
        </div>
      </div>

      <!-- Accent Color -->
      <div class="settings-row">
        <div class="row-info">
          <span class="row-label">Accent Color</span>
          <span class="row-desc">Primary brand color</span>
        </div>
        <div class="color-swatches">
          @for (s of swatches; track s.color) {
            <button
              class="swatch"
              [style.background]="s.hex"
              [class.selected]="settings().accent_color === s.color"
              [attr.aria-label]="s.label + ' accent color'"
              [attr.aria-pressed]="settings().accent_color === s.color"
              (click)="emitAppearance('accent_color', s.color)">
            </button>
          }
        </div>
      </div>

      <!-- Compact Mode -->
      <div class="settings-row">
        <div class="row-info">
          <span class="row-label">Compact Mode</span>
          <span class="row-desc">Reduce whitespace for more content</span>
        </div>
        <app-toggle-switch
          [checked]="settings().compact_mode"
          [attr.aria-label]="'Toggle compact mode'"
          (toggled)="emitAppearance('compact_mode', $event)" />
      </div>
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
    .theme-segmented { display: flex; gap: 0; background: rgba(255,255,255,.06); border-radius: 8px; padding: 3px; }
    .theme-pill {
      padding: 5px 14px; border-radius: 6px; border: none; background: transparent;
      color: var(--text-secondary); font-size: .82rem; cursor: pointer; transition: all .2s;
    }
    .theme-pill.active { background: var(--accent-blue); color: #fff; }
    .color-swatches { display: flex; gap: 8px; }
    .swatch {
      width: 28px; height: 28px; border-radius: 50%; border: 2px solid transparent;
      cursor: pointer; transition: transform .15s, border-color .15s; outline: none;
    }
    .swatch:hover  { transform: scale(1.15); }
    .swatch.selected { border-color: #fff; box-shadow: 0 0 0 3px rgba(255,255,255,.2); }
  `],
})
export class AppearanceSectionComponent {
  readonly settings = input.required<AppearanceSettings>();
  readonly changed  = output<Partial<AppearanceSettings>>();

  readonly swatches = SWATCHES;

  emitAppearance(key: keyof AppearanceSettings, value: Theme | AccentColor | boolean): void {
    this.changed.emit({ [key]: value } as Partial<AppearanceSettings>);
  }
}
