import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { NgStyle } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [NgStyle],
  templateUrl: './stat-card.component.html',
  styleUrls: ['./stat-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatCardComponent {
  icon = input.required<string>();
  value = input.required<string>();
  label = input.required<string>();
  badge = input<string>();
  colorClass = input<string>('');
  glowClass = input<string>('');
  valueClass = input<string>('');
  badgeStyle = input<Record<string, string>>({});
}