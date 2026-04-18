import {
  Component, ChangeDetectionStrategy, OnInit, OnDestroy, inject, signal, computed, PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SettingsService } from '../../core/services/settings.service';
import {
  AppearanceSettings, NotificationSettings, PrivacySettings,
} from '../../core/models/settings.model';

import { AppearanceSectionComponent }  from './components/appearance-section/appearance-section.component';
import { NotificationsSectionComponent } from './components/notifications-section/notifications-section.component';
import { PrivacySectionComponent }     from './components/privacy-section/privacy-section.component';
import { SecuritySectionComponent }    from './components/security-section/security-section.component';
import { SubscriptionSectionComponent } from './components/subscription-section/subscription-section.component';
import { DeleteAccountSectionComponent } from './components/delete-account-section/delete-account-section.component';
import { TwoFactorSetupModalComponent } from './modals/two-factor-setup-modal/two-factor-setup-modal.component';
import { TwoFactorDisableModalComponent } from './modals/two-factor-disable-modal/two-factor-disable-modal.component';
import { DeleteAccountModalComponent }  from './modals/delete-account-modal/delete-account-modal.component';

interface NavSection {
  id: string;
  label: string;
  icon: string;
  danger?: boolean;
}

const NAV_SECTIONS: NavSection[] = [
  { id: 'appearance',   label: 'Appearance',       icon: 'bi-palette' },
  { id: 'notifications', label: 'Notifications',   icon: 'bi-bell' },
  { id: 'privacy',      label: 'Privacy',          icon: 'bi-shield' },
  { id: 'security',     label: 'Security',         icon: 'bi-lock' },
  { id: 'subscription', label: 'Subscription',     icon: 'bi-credit-card' },
  { id: 'delete',       label: 'Delete Account',   icon: 'bi-trash', danger: true },
];

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    AppearanceSectionComponent,
    NotificationsSectionComponent,
    PrivacySectionComponent,
    SecuritySectionComponent,
    SubscriptionSectionComponent,
    DeleteAccountSectionComponent,
    TwoFactorSetupModalComponent,
    TwoFactorDisableModalComponent,
    DeleteAccountModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit, OnDestroy {
  private readonly svc    = inject(SettingsService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // ── service state ──────────────────────────────────────────────────────
  readonly settings   = this.svc.settings;
  readonly isLoading  = this.svc.isLoading;
  readonly activeSessions = this.svc.activeSessions;

  // ── modal visibility ───────────────────────────────────────────────────
  readonly show2FASetup    = signal<boolean>(false);
  readonly show2FADisable  = signal<boolean>(false);
  readonly showDeleteModal = signal<boolean>(false);

  // ── toast ──────────────────────────────────────────────────────────────
  readonly toastMessage = signal<string>('');
  readonly toastVisible = signal<boolean>(false);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  // ── scroll-spy ─────────────────────────────────────────────────────────
  readonly activeSection  = signal<string>('appearance');
  readonly navSections    = NAV_SECTIONS;
  private observers: IntersectionObserver[] = [];
  private scrollSpyTimer: ReturnType<typeof setTimeout> | null = null;

  // ── derived ────────────────────────────────────────────────────────────
  readonly twoFaEnabled = computed(() => this.settings()?.security.two_fa_enabled ?? false);

  // ══════════════════════════════════════════════════════════════════════
  ngOnInit(): void {
    this.svc.loadSettings();
    if (this.isBrowser) this.initScrollSpy();
  }

  ngOnDestroy(): void {
    this.observers.forEach(o => o.disconnect());
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (this.scrollSpyTimer) clearTimeout(this.scrollSpyTimer);
  }

  // ── Scroll spy ─────────────────────────────────────────────────────────
  private initScrollSpy(): void {
    const ids = NAV_SECTIONS.map(s => s.id);
    const obs = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            this.activeSection.set(e.target.id);
            break;
          }
        }
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: 0 }
    );
    this.observers.push(obs);
    this.scrollSpyTimer = setTimeout(() => {
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) obs.observe(el);
      });
    }, 200);
  }

  scrollTo(id: string): void {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Toast helper ───────────────────────────────────────────────────────
  private toast(msg: string): void {
    this.toastMessage.set(msg);
    this.toastVisible.set(true);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastVisible.set(false), 3000);
  }

  loadSettings(): void {
    this.svc.loadSettings();
  }

  // ── Appearance ─────────────────────────────────────────────────────────
  onAppearanceChange(patch: Partial<AppearanceSettings>): void {
    const prev = this.settings()?.appearance;
    if (!prev) return;
    this.svc.settings.update(s => s ? { ...s, appearance: { ...s.appearance, ...patch } } : s);
    if (patch.theme) this.svc.applyTheme(patch.theme);
    this.svc.updateAppearance(patch).subscribe({
      next: () => this.toast('Appearance saved'),
      error: (err: string) => {
        this.svc.settings.update(s => s ? { ...s, appearance: prev } : s);
        if (prev.theme) this.svc.applyTheme(prev.theme);
        this.toast(err || 'Failed to save appearance');
      }
    });
  }

  // ── Notifications ──────────────────────────────────────────────────────
  onNotificationsChange(patch: Partial<NotificationSettings>): void {
    const prev = this.settings()?.notifications;
    if (!prev) return;
    this.svc.settings.update(s => s ? { ...s, notifications: { ...s.notifications, ...patch } } : s);
    this.svc.updateNotifications(patch).subscribe({
      next: () => this.toast('Notifications saved'),
      error: (err: string) => {
        this.svc.settings.update(s => s ? { ...s, notifications: prev } : s);
        this.toast(err || 'Failed to save notifications');
      }
    });
  }

  // ── Privacy ────────────────────────────────────────────────────────────
  onPrivacyChange(patch: Partial<PrivacySettings>): void {
    const prev = this.settings()?.privacy;
    if (!prev) return;
    this.svc.settings.update(s => s ? { ...s, privacy: { ...s.privacy, ...patch } } : s);
    this.svc.updatePrivacy(patch).subscribe({
      next: () => this.toast('Privacy settings saved'),
      error: (err: string) => {
        this.svc.settings.update(s => s ? { ...s, privacy: prev } : s);
        this.toast(err || 'Failed to save privacy');
      }
    });
  }

  // ── Security: 2FA ──────────────────────────────────────────────────────
  onToggle2FA(enabled: boolean): void {
    if (enabled) {
      this.show2FASetup.set(true);
    } else {
      this.show2FADisable.set(true);
    }
  }

  on2FAEnabled(): void {
    this.show2FASetup.set(false);
    this.toast('Two-factor authentication enabled');
  }

  on2FADisabled(): void {
    this.show2FADisable.set(false);
    this.toast('Two-factor authentication disabled');
  }

  // ── Security: Login notifications ──────────────────────────────────────
  onLoginNotifToggled(enabled: boolean): void {
    const security = this.settings()?.security;
    if (!security) return;
    const prev = security.login_notifications_enabled;
    this.svc.settings.update(s =>
      s ? { ...s, security: { ...s.security, login_notifications_enabled: enabled } } : s
    );
    this.svc.updateLoginNotifications(enabled).subscribe({
      next: () => this.toast('Login notifications updated'),
      error: (err: string) => {
        this.svc.settings.update(s =>
          s ? { ...s, security: { ...s.security, login_notifications_enabled: prev } } : s
        );
        this.toast(err || 'Failed to update');
      }
    });
  }

  // ── Security: Sessions ─────────────────────────────────────────────────
  onRevokeSession(id: string): void {
    this.svc.revokeSession(id).subscribe({
      next: () => this.toast('Session revoked'),
      error: (err: string) => this.toast(err || 'Could not revoke session'),
    });
  }

  onRevokeAll(): void {
    this.svc.revokeAllOtherSessions().subscribe({
      next: () => this.toast('All other sessions revoked'),
      error: (err: string) => this.toast(err || 'Could not revoke sessions'),
    });
  }

  onManageSessions(): void {
    this.svc.getSessions();
  }

  // ── Delete Account ─────────────────────────────────────────────────────
  onDeleteRequested(): void {
    this.showDeleteModal.set(true);
  }

  onPrivacyError(msg: string): void {
    this.toast(msg);
  }
}
