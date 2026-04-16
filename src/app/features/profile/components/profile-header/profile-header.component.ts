import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { OwnProfile, MembershipTier } from '../../../../core/models/profile.model';

@Component({
  selector: 'app-profile-header',
  standalone: true,
  templateUrl: './profile-header.component.html',
  styleUrls: ['./profile-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileHeaderComponent {
  profile = input.required<OwnProfile>();
  editClicked = output<void>();

  get tierClass(): string {
    const tier = this.profile().membership_tier;
    const map: Record<MembershipTier, string> = {
      free: 'tier-free',
      pro: 'tier-pro',
      enterprise: 'tier-enterprise',
    };
    return map[tier];
  }

  get tierLabel(): string {
    const tier = this.profile().membership_tier;
    const map: Record<MembershipTier, string> = {
      free: 'Free',
      pro: 'Pro Member',
      enterprise: 'Enterprise',
    };
    return map[tier];
  }

  get joinedDate(): string {
    const date = new Date(this.profile().joined_at);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
}
