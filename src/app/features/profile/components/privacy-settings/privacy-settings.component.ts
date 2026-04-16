import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { PrivacySettings, UpdatePrivacyPayload } from '../../../../core/models/profile.model';
import { ToggleSwitchComponent } from '../../../../shared/components/toggle-switch';

interface PrivacyRow {
  key: keyof PrivacySettings;
  label: string;
}

@Component({
  selector: 'app-privacy-settings',
  standalone: true,
  imports: [ToggleSwitchComponent],
  templateUrl: './privacy-settings.component.html',
  styleUrls: ['./privacy-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacySettingsComponent {
  privacy = input.required<PrivacySettings>();
  saving = input<boolean>(false);
  privacyChanged = output<UpdatePrivacyPayload>();

  readonly rows: PrivacyRow[] = [
    { key: 'show_streaks_publicly', label: 'Show streaks publicly' },
    { key: 'share_habit_completions', label: 'Share habit completions' },
    { key: 'public_goal_visibility', label: 'Public goal visibility' },
  ];

  onToggle(key: keyof PrivacySettings, newValue: boolean): void {
    this.privacyChanged.emit({ [key]: newValue } as UpdatePrivacyPayload);
  }
}
