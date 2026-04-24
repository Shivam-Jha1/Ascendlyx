import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';

const ICON_MAP: Record<string, string> = {
  focus:    '⚡',
  schedule: '🌙',
  sleep:    '😴',
  streak:   '🔥',
  goal:     '🎯',
};

function detectIconType(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('sleep') || t.includes('night')) return 'sleep';
  if (t.includes('streak') || t.includes('chain')) return 'streak';
  if (t.includes('goal') || t.includes('milestone')) return 'goal';
  if (t.includes('schedul') || t.includes('evening') || t.includes('morning')) return 'schedule';
  return 'focus';
}

@Component({
  selector: 'app-smart-nudges',
  standalone: true,
  templateUrl: './smart-nudges.component.html',
  styleUrls: ['./smart-nudges.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SmartNudgesComponent {
  nudges = input<string[] | null>(null);
  isLoading = input<boolean>(false);
  isStale = input<boolean>(false);

  nudgeItems = computed(() => {
    const raw = this.nudges();
    if (!raw?.length) return [];
    return raw.map(text => {
      const type = detectIconType(text);
      return { icon: ICON_MAP[type] ?? '⚡', body: text };
    });
  });

  skeletonRows = [1, 2, 3];
}
