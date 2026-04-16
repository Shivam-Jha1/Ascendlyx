import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { animate, style, transition, trigger, query, stagger } from '@angular/animations';
import { HttpErrorResponse } from '@angular/common/http';
import { ProfileService } from '../../core/services/profile.service';
import { OwnProfile, UpdatePrivacyPayload, PrivacySettings } from '../../core/models/profile.model';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader';
import { ProfileHeaderComponent } from './components/profile-header/profile-header.component';
import { QuickStatsComponent } from './components/quick-stats/quick-stats.component';
import { ProductivityStatsComponent } from './components/productivity-stats/productivity-stats.component';
import { ConsistencyGaugeComponent } from './components/consistency-gauge/consistency-gauge.component';
import { PublicGoalsComponent } from './components/public-goals/public-goals.component';
import { BadgesGridComponent } from './components/badges-grid/badges-grid.component';
import { PrivacySettingsComponent } from './components/privacy-settings/privacy-settings.component';
import { EditProfileModalComponent } from './components/edit-profile-modal/edit-profile-modal.component';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    SkeletonLoaderComponent,
    ProfileHeaderComponent,
    QuickStatsComponent,
    ProductivityStatsComponent,
    ConsistencyGaugeComponent,
    PublicGoalsComponent,
    BadgesGridComponent,
    PrivacySettingsComponent,
    EditProfileModalComponent,
  ],
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('fadeSlideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(16px)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
    trigger('staggerColumns', [
      transition(':enter', [
        query('.col-left, .col-right', [
          style({ opacity: 0, transform: 'translateY(16px)' }),
          stagger(100, [
            animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
          ]),
        ], { optional: true }),
      ]),
    ]),
  ],
})
export class ProfilePage implements OnInit {
  private readonly profileService = inject(ProfileService);

  readonly profile = this.profileService.profile;
  readonly isLoading = this.profileService.isLoading;
  readonly error = this.profileService.error;
  readonly earnedBadges = this.profileService.earnedBadges;
  readonly lockedBadges = this.profileService.lockedBadges;
  readonly ratingColor = this.profileService.consistencyRatingColor;

  readonly showEditModal = signal<boolean>(false);
  readonly privacySaving = signal<boolean>(false);

  ngOnInit(): void {
    this.profileService.loadProfile();
  }

  onRetry(): void {
    this.profileService.loadProfile();
  }

  onEditClicked(): void {
    this.showEditModal.set(true);
  }

  onEditSaved(updated: OwnProfile): void {
    this.showEditModal.set(false);
  }

  onEditClosed(): void {
    this.showEditModal.set(false);
  }

  onPrivacyChanged(payload: UpdatePrivacyPayload): void {
    const prev = this.profile()?.privacy;
    if (!prev) return;

    this.privacySaving.set(true);

    this.profileService.updatePrivacy(payload).subscribe({
      next: () => {
        this.privacySaving.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.privacySaving.set(false);
        // Revert: re-load profile to restore server state
        this.profileService.loadProfile();
      },
    });
  }
}