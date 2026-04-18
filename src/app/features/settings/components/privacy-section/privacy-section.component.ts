import {
  Component, ChangeDetectionStrategy, input, output, signal, OnInit, inject
} from '@angular/core';
import { animate, style, transition, trigger, state } from '@angular/animations';
import { ToggleSwitchComponent } from '../../../../shared/components/toggle-switch';
import { PrivacySettings, HabitPrivacyItem } from '../../../../core/models/settings.model';
import { SettingsService } from '../../../../core/services/settings.service';

@Component({
  selector: 'app-privacy-section',
  standalone: true,
  imports: [ToggleSwitchComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('expandCollapse', [
      state('void', style({ maxHeight: '0', opacity: 0, overflow: 'hidden' })),
      state('*',    style({ maxHeight: '500px', opacity: 1, overflow: 'hidden' })),
      transition('void <=> *', animate('220ms ease-in-out')),
    ]),
  ],
  template: `
    <section class="settings-section">
      <h3 class="section-title">🔒 Privacy</h3>
      <div class="section-divider"></div>

      <div class="settings-row">
        <div class="row-info">
          <span class="row-label">Public Profile</span>
          <span class="row-desc">Anyone can view your profile</span>
        </div>
        <app-toggle-switch
          [checked]="settings().public_profile"
          aria-label="Toggle public profile"
          (toggled)="emit('public_profile', $event)" />
      </div>

      <div class="settings-row">
        <div class="row-info">
          <span class="row-label">Activity Feed Visibility</span>
          <span class="row-desc">Show in friends' activity feeds</span>
        </div>
        <app-toggle-switch
          [checked]="settings().activity_feed_visible"
          aria-label="Toggle activity feed visibility"
          (toggled)="emit('activity_feed_visible', $event)" />
      </div>

      <div class="settings-row">
        <div class="row-info">
          <span class="row-label">Hide Specific Habits</span>
          <span class="row-desc">Choose private habits</span>
        </div>
        <app-toggle-switch
          [checked]="settings().hide_specific_habits"
          aria-label="Toggle hide specific habits"
          (toggled)="onHideHabitsToggle($event)" />
      </div>

      @if (settings().hide_specific_habits) {
        <div class="habit-list" @expandCollapse>
          @if (loadingHabits()) {
            <div class="habits-loading">Loading habits…</div>
          } @else {
            @for (h of habits(); track h.habit_id) {
              <div class="habit-row">
                <div class="habit-info">
                  <span class="habit-name">{{ h.habit_name }}</span>
                  <span class="habit-cat">{{ h.category }}</span>
                </div>
                <app-toggle-switch
                  [checked]="h.is_hidden"
                  [attr.aria-label]="'Hide habit ' + h.habit_name"
                  (toggled)="onHabitToggle(h, $event)" />
              </div>
            } @empty {
              <div class="habits-loading">No habits found.</div>
            }
          }
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
    .habit-list {
      background: rgba(255,255,255,.03); border-radius: var(--radius-md);
      border: 1px solid var(--border); margin-top: .5rem; padding: .5rem .75rem;
    }
    .habit-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: .6rem 0; border-bottom: 1px solid var(--border);
    }
    .habit-row:last-child { border-bottom: none; }
    .habit-name { font-size: .85rem; color: var(--text-primary); font-weight: 500; }
    .habit-cat {
      display: inline-block; margin-left: .5rem; font-size: .7rem;
      background: rgba(88,166,255,.12); color: var(--accent-blue);
      border-radius: 4px; padding: 0 6px; line-height: 1.6;
    }
    .habits-loading { font-size: .82rem; color: var(--text-secondary); padding: .75rem 0; text-align: center; }
  `],
})
export class PrivacySectionComponent implements OnInit {
  private readonly settingsService = inject(SettingsService);

  readonly settings     = input.required<PrivacySettings>();
  readonly changed      = output<Partial<PrivacySettings>>();
  readonly habitError   = output<string>();

  readonly habits       = signal<HabitPrivacyItem[]>([]);
  readonly loadingHabits = signal<boolean>(false);

  private habitsLoaded = false;

  ngOnInit(): void {
    if (this.settings().hide_specific_habits && !this.habitsLoaded) {
      this.fetchHabits();
    }
  }

  emit(key: keyof PrivacySettings, value: boolean): void {
    this.changed.emit({ [key]: value } as Partial<PrivacySettings>);
  }

  onHideHabitsToggle(value: boolean): void {
    this.emit('hide_specific_habits', value);
    if (value && !this.habitsLoaded) this.fetchHabits();
  }

  onHabitToggle(habit: HabitPrivacyItem, isHidden: boolean): void {
    // Optimistic update
    this.habits.update(list => list.map(h => h.habit_id === habit.habit_id ? { ...h, is_hidden: isHidden } : h));
    this.settingsService.updateHabitPrivacy(habit.habit_id, isHidden).subscribe({
      error: (err: string) => {
        // Revert
        this.habits.update(list => list.map(h => h.habit_id === habit.habit_id ? { ...h, is_hidden: !isHidden } : h));
        this.habitError.emit(err);
      }
    });
  }

  private fetchHabits(): void {
    this.loadingHabits.set(true);
    this.settingsService.getHabitPrivacyList().subscribe({
      next: list => {
        this.habits.set(list);
        this.habitsLoaded = true;
        this.loadingHabits.set(false);
      },
      error: (err: string) => {
        this.habitsLoaded = false;
        this.loadingHabits.set(false);
        this.habitError.emit(err || 'Failed to load habits');
      }
    });
  }
}
