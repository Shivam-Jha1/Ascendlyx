import {
  Component, ChangeDetectionStrategy, output, inject, signal, input, OnDestroy
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { SettingsService } from '../../../../core/services/settings.service';

const CONFIRM_PHRASE = 'DELETE MY ACCOUNT';

@Component({
  selector: 'app-delete-account-modal',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="modal-backdrop" role="dialog" aria-modal="true" (click)="onBackdropClick($event)">
      <div class="modal-box" (click)="$event.stopPropagation()">
        <button class="modal-close" aria-label="Close modal" (click)="onClose()">✕</button>

        <!-- Step indicator -->
        <div class="steps">
          @for (s of stepLabels; track s; let i = $index) {
            <div class="step" [class.active]="step() === i + 1" [attr.aria-current]="step() === i+1 ? 'step' : null">
              <span class="step-num">{{ i + 1 }}</span>
              <span class="step-label">{{ s }}</span>
            </div>
            @if (i < 2) { <div class="step-connector"></div> }
          }
        </div>

        <!-- Step 1: Warning -->
        @if (step() === 1) {
          <div class="step-content">
            <h4 class="modal-title danger">⚠️ Delete Account</h4>
            <p class="modal-sub">The following will be permanently deleted after 30 days:</p>
            <ul class="delete-list">
              <li>All habits, streaks, and daily logs</li>
              <li>Goals, milestones, and progress history</li>
              <li>AI Coach conversation history</li>
              <li>Friendships, messages, and social posts</li>
              <li>Profile, badges, and achievements</li>
            </ul>
            <p class="grace-note">You have 30 days to cancel this request.</p>
            <div class="modal-actions">
              <button class="btn-cancel" (click)="onClose()">Cancel</button>
              <button class="btn-danger-outline" (click)="step.set(2)">I understand, continue</button>
            </div>
          </div>
        }

        <!-- Step 2: Verify Identity -->
        @if (step() === 2) {
          <div class="step-content">
            <h4 class="modal-title danger">Verify Your Identity</h4>

            <div class="field">
              <label for="del-password">Password</label>
              <input
                id="del-password"
                type="password"
                class="field-input"
                placeholder="Your password"
                autocomplete="current-password"
                [ngModel]="password()"
                (ngModelChange)="password.set($event)" />
            </div>

            @if (twoFaEnabled()) {
              <div class="field">
                <label for="del-totp">Authenticator Code</label>
                <input
                  id="del-totp"
                  type="text"
                  inputmode="numeric"
                  maxlength="6"
                  class="field-input code-input"
                  placeholder="000000"
                  [ngModel]="totpCode()"
                  (ngModelChange)="totpCode.set($event)" />
              </div>
            }

            @if (error()) {
              <p class="inline-err">{{ error() }}</p>
            }

            <div class="modal-actions">
              <button class="btn-cancel" (click)="step.set(1)">Back</button>
              <button
                class="btn-danger-outline"
                [disabled]="!canProceedStep2()"
                (click)="step.set(3)">Continue</button>
            </div>
          </div>
        }

        <!-- Step 3: Type confirmation phrase -->
        @if (step() === 3) {
          <div class="step-content">
            <h4 class="modal-title danger">Final Confirmation</h4>
            <p class="modal-sub">Type <strong class="phrase">DELETE MY ACCOUNT</strong> to confirm.</p>

            <div class="field">
              <label for="del-phrase">Confirmation phrase</label>
              <input
                id="del-phrase"
                type="text"
                class="field-input"
                placeholder="DELETE MY ACCOUNT"
                autofocus
                aria-describedby="del-err"
                [ngModel]="confirmPhrase()"
                (ngModelChange)="confirmPhrase.set($event)" />
            </div>

            @if (error()) {
              <p class="inline-err" id="del-err">{{ error() }}</p>
            }

            <div class="modal-actions">
              <button class="btn-cancel" (click)="step.set(2)">Back</button>
              <button
                class="btn-danger"
                aria-label="Destructive action: permanently delete account"
                [disabled]="confirmPhrase() !== PHRASE || deleting()"
                (click)="submit()">
                @if (deleting()) { Processing… } @else { Permanently Delete Account }
              </button>
            </div>
          </div>
        }

        <!-- Step 4: Grace Period Info -->
        @if (step() === 4) {
          <div class="step-content success-step">
            <div class="success-icon">🗑️</div>
            <h4 class="modal-title">Deletion Scheduled</h4>
            <p class="modal-sub">Your account is scheduled for deletion on <strong>{{ deletionDate() }}</strong>.</p>
            <p class="modal-sub">You can cancel this within 30 days by logging back in.</p>
            <p class="redirect-note">Redirecting to login…</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position:fixed; inset:0; background:rgba(0,0,0,.7);
      display:flex; align-items:center; justify-content:center; z-index:1000;
      animation: fadeIn .2s ease-out;
    }
    @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
    .modal-box {
      background:var(--bg-card); border:1px solid rgba(248,81,73,.25); border-radius:var(--radius-xl);
      padding:1.75rem; width:min(440px,95vw); position:relative;
      animation: scaleIn .2s ease-out;
    }
    @keyframes scaleIn { from { opacity:0; transform:scale(.95); } to { opacity:1; transform:scale(1); } }
    .modal-close { position:absolute; top:1rem; right:1rem; background:none; border:none; color:var(--text-secondary); font-size:1rem; cursor:pointer; }
    .steps { display:flex; align-items:center; margin-bottom:1.5rem; }
    .step { display:flex; align-items:center; gap:.35rem; }
    .step-num { width:22px; height:22px; border-radius:50%; background:rgba(255,255,255,.08); color:var(--text-secondary); font-size:.72rem; display:flex; align-items:center; justify-content:center; font-weight:700; }
    .step.active .step-num { background:var(--accent-red); color:#fff; }
    .step-label { font-size:.75rem; color:var(--text-secondary); }
    .step.active .step-label { color:var(--text-primary); font-weight:600; }
    .step-connector { flex:1; height:1px; background:var(--border); margin:0 .5rem; }
    .step-content { display:flex; flex-direction:column; gap:.85rem; }
    .modal-title { font-size:1rem; font-weight:700; color:var(--text-primary); }
    .modal-title.danger { color:var(--accent-red); }
    .modal-sub { font-size:.82rem; color:var(--text-secondary); line-height:1.5; }
    .phrase { color:var(--accent-red); }
    .delete-list { padding-left:1.25rem; margin:0; }
    .delete-list li { font-size:.82rem; color:var(--text-secondary); padding: 2px 0; }
    .grace-note { font-size:.78rem; color:#f0883e; }
    .field { display:flex; flex-direction:column; gap:.35rem; }
    label { font-size:.8rem; color:var(--text-secondary); }
    .field-input { background:var(--bg-input); border:1px solid var(--border); border-radius:8px; padding:.55rem .85rem; color:var(--text-primary); font-size:.88rem; outline:none; width:100%; }
    .field-input:focus { border-color:rgba(248,81,73,.5); }
    .code-input { letter-spacing:.2em; text-align:center; font-size:1rem; }
    .inline-err { font-size:.78rem; color:var(--accent-red); margin:0; }
    .modal-actions { display:flex; gap:.75rem; justify-content:flex-end; margin-top:.25rem; }
    .btn-cancel { background:rgba(255,255,255,.06); border:1px solid var(--border); color:var(--text-secondary); border-radius:8px; padding:7px 16px; font-size:.85rem; cursor:pointer; }
    .btn-danger-outline { background:transparent; border:1px solid var(--accent-red); color:var(--accent-red); border-radius:8px; padding:7px 16px; font-size:.85rem; cursor:pointer; }
    .btn-danger-outline:disabled { opacity:.5; cursor:not-allowed; }
    .btn-danger { background:var(--accent-red); border:none; color:#fff; border-radius:8px; padding:7px 16px; font-size:.85rem; font-weight:600; cursor:pointer; width:100%; text-align:center; }
    .btn-danger:disabled { opacity:.5; cursor:not-allowed; }
    .success-step { align-items:center; text-align:center; padding:1rem 0; }
    .success-icon { font-size:3rem; }
    .redirect-note { font-size:.78rem; color:var(--text-muted); }
  `],
})
export class DeleteAccountModalComponent implements OnDestroy {
  private readonly settingsService = inject(SettingsService);
  private readonly authService     = inject(AuthService);
  private readonly router          = inject(Router);
  private redirectTimer: ReturnType<typeof setTimeout> | null = null;

  readonly closed  = output<void>();
  readonly twoFaEnabled = input<boolean>(false);

  readonly step          = signal<1|2|3|4>(1);
  readonly password      = signal<string>('');
  readonly totpCode      = signal<string>('');
  readonly confirmPhrase = signal<string>('');
  readonly deleting      = signal<boolean>(false);
  readonly error         = signal<string | null>(null);
  readonly deletionDate  = signal<string>('');

  readonly PHRASE = CONFIRM_PHRASE;
  readonly stepLabels = ['Warning', 'Verify', 'Confirm'];

  ngOnDestroy(): void {
    if (this.redirectTimer) clearTimeout(this.redirectTimer);
  }

  onClose(): void {
    if (this.redirectTimer) clearTimeout(this.redirectTimer);
    this.closed.emit();
  }

  canProceedStep2(): boolean {
    return !!this.password() && (!this.twoFaEnabled() || this.totpCode().length === 6);
  }

  submit(): void {
    if (this.confirmPhrase() !== CONFIRM_PHRASE) return;
    this.deleting.set(true);
    this.error.set(null);
    const payload: { password: string; totp_code?: string; confirm_phrase: string } = {
      password: this.password(),
      confirm_phrase: CONFIRM_PHRASE,
    };
    if (this.twoFaEnabled()) payload.totp_code = this.totpCode();

    this.settingsService.requestDeletion(payload).subscribe({
      next: res => {
        this.deleting.set(false);
        this.deletionDate.set(new Date(res.deletion_date).toLocaleDateString(undefined, { dateStyle: 'long' }));
        this.step.set(4);
        this.authService.logoutLocally();
        this.redirectTimer = setTimeout(() => this.router.navigate(['/login']), 3000);
      },
      error: (err: string) => {
        this.deleting.set(false);
        this.error.set(err);
      }
    });
  }

  onBackdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-backdrop')) this.onClose();
  }
}
