import {
  Component, ChangeDetectionStrategy, input, output, signal
} from '@angular/core';
import { ToggleSwitchComponent } from '../../../../shared/components/toggle-switch';
import { SecuritySummary, ActiveSession } from '../../../../core/models/settings.model';

@Component({
  selector: 'app-security-section',
  standalone: true,
  imports: [ToggleSwitchComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="settings-section">
      <h3 class="section-title">🛡️ Account Security</h3>
      <div class="section-divider"></div>

      <!-- 2FA -->
      <div class="settings-row">
        <div class="row-info">
          <span class="row-label">Two-Factor Authentication</span>
          <span class="row-desc">Extra security on login</span>
        </div>
        <app-toggle-switch
          [checked]="security().two_fa_enabled"
          aria-label="Toggle two-factor authentication"
          (toggled)="on2FAToggle($event)" />
      </div>

      <!-- Login Notifications -->
      <div class="settings-row">
        <div class="row-info">
          <span class="row-label">Login Notifications</span>
          <span class="row-desc">Get notified on new sign-ins</span>
        </div>
        <app-toggle-switch
          [checked]="security().login_notifications_enabled"
          aria-label="Toggle login notifications"
          (toggled)="loginNotifToggled.emit($event)" />
      </div>

      <!-- Active Sessions -->
      <div class="settings-row" style="flex-direction: column; align-items: flex-start; gap: .5rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%">
          <div class="row-info">
            <span class="row-label">Active Sessions</span>
            <span class="row-desc">{{ security().active_sessions_count }} device(s) signed in</span>
          </div>
          <button class="manage-link" (click)="toggleSessions()">
            {{ sessionsOpen() ? 'Hide ▲' : 'Manage →' }}
          </button>
        </div>

        @if (sessionsOpen()) {
          <div class="sessions-panel">
            @if (sessions().length === 0) {
              <div class="no-sessions">No session data available.</div>
            } @else {
              @for (s of sessions(); track s.id) {
                <div class="session-card" [class.current]="s.is_current">
                  <div class="session-icon">
                    @if (s.device_type === 'mobile') { 📱 }
                    @else if (s.device_type === 'tablet') { 📟 }
                    @else { 🖥️ }
                  </div>
                  <div class="session-info">
                    <span class="session-name">{{ s.device_name }}</span>
                    @if (s.is_current) { <span class="current-badge">This device</span> }
                    <span class="session-meta">{{ s.ip_address }} · {{ formatAgo(s.last_used_at) }}</span>
                  </div>
                  @if (!s.is_current) {
                    @if (confirmRevokeId() === s.id) {
                      <div class="revoke-confirm">
                        <span>Sure?</span>
                        <button class="btn-revoke-yes" aria-label="Destructive action: confirm revoke session" (click)="revokeSession.emit(s.id)">Yes</button>
                        <button class="btn-revoke-no" (click)="confirmRevokeId.set(null)">No</button>
                      </div>
                    } @else {
                      <button class="btn-revoke" aria-label="Destructive action: revoke session for {{ s.device_name }}" (click)="confirmRevokeId.set(s.id)">Revoke</button>
                    }
                  }
                </div>
              }
              <button class="btn-revoke-all" aria-label="Destructive action: sign out all other devices" (click)="revokeAll.emit()">
                Sign out all other devices
              </button>
            }
          </div>
        }
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
    .manage-link { background: none; border: none; color: var(--accent-blue); font-size: .82rem; cursor: pointer; white-space: nowrap; }
    .sessions-panel { width: 100%; margin-top: .25rem; display: flex; flex-direction: column; gap: .5rem; }
    .session-card {
      display: flex; align-items: center; gap: .75rem;
      background: rgba(255,255,255,.03); border: 1px solid var(--border);
      border-radius: var(--radius-md); padding: .6rem .85rem;
    }
    .session-card.current { border-color: var(--accent-blue); }
    .session-icon { font-size: 1.2rem; }
    .session-info { flex: 1; }
    .session-name { display: block; font-size: .85rem; font-weight: 600; color: var(--text-primary); }
    .session-meta { font-size: .75rem; color: var(--text-secondary); }
    .current-badge {
      display: inline-block; font-size: .68rem; background: rgba(88,166,255,.15);
      color: var(--accent-blue); border-radius: 4px; padding: 1px 6px; margin-left: .4rem;
    }
    .btn-revoke {
      font-size: .75rem; background: rgba(248,81,73,.1); color: var(--accent-red);
      border: 1px solid rgba(248,81,73,.3); border-radius: 6px; padding: 3px 10px; cursor: pointer;
    }
    .revoke-confirm { display: flex; align-items: center; gap: .4rem; font-size: .78rem; }
    .btn-revoke-yes { background: var(--accent-red); color:#fff; border:none; border-radius:5px; padding:2px 8px; cursor:pointer; }
    .btn-revoke-no  { background: rgba(255,255,255,.08); color:var(--text-secondary); border:none; border-radius:5px; padding:2px 8px; cursor:pointer; }
    .btn-revoke-all {
      margin-top: .25rem; font-size: .8rem; background: none; border: 1px solid rgba(248,81,73,.3);
      color: var(--accent-red); border-radius: 7px; padding: 5px 12px; cursor: pointer; align-self: flex-start;
    }
    .no-sessions { font-size: .82rem; color: var(--text-secondary); padding: .5rem; }
  `],
})
export class SecuritySectionComponent {
  readonly security        = input.required<SecuritySummary>();
  readonly sessions        = input<ActiveSession[]>([]);
  readonly toggle2FA       = output<boolean>();
  readonly loginNotifToggled = output<boolean>();
  readonly revokeSession   = output<string>();
  readonly revokeAll       = output<void>();
  readonly manageSessions  = output<void>();

  readonly sessionsOpen    = signal<boolean>(false);
  readonly confirmRevokeId = signal<string | null>(null);

  on2FAToggle(val: boolean): void {
    this.toggle2FA.emit(val);
  }

  toggleSessions(): void {
    const opening = !this.sessionsOpen();
    this.sessionsOpen.set(opening);
    if (!opening) this.confirmRevokeId.set(null);
    if (opening) this.manageSessions.emit();
  }

  formatAgo(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }
}
