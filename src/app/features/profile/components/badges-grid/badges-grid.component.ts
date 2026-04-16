import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { Badge } from '../../../../core/models/profile.model';

@Component({
  selector: 'app-badges-grid',
  standalone: true,
  templateUrl: './badges-grid.component.html',
  styleUrls: ['./badges-grid.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgesGridComponent {
  earned = input.required<Badge[]>();
  locked = input.required<Badge[]>();

  get allBadges(): Badge[] {
    return [...this.earned(), ...this.locked()];
  }
}
