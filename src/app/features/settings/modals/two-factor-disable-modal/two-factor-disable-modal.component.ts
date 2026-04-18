import {
  Component, ChangeDetectionStrategy, output, inject, signal, ElementRef, HostListener, OnInit
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../../../core/services/settings.service';

@Component({
  selector: 'app-two-factor-disable-modal',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="modal-backdrop" role="dialog" aria-modal="true" (click)="onBackdropClick($event)">
      <div class="modal-box" (click)="$event.stopPropagation()">
        <button class="modal-close" aria-label="Close modal" (click)="closed.emit()">✕</button>
        <h4 class="modal-title">Disable Two-Factor Authentication</h4>
        <p class="modal-sub">Enter your password and current TOTP code to disable 2FA.</p>

        <div class="field">
          <label for="dis-password">Password</label>
          <input
            id="dis-password"
            type="password"
            class="field-input"
            placeholder="Your password"
            autocomplete="current-password"
            [attr.aria-describedby]="error() ? 'dis-err' : null"
            [ngModel]="password()"
            (ngModelChange)="password.set($event)" />
        </div>

        <div class="field">
          <label for="dis-totp">Authenticator Code</label>
          <input
            id="dis-totp"
            type="text"
            inputmode="numeric"
            maxlength="6"
            class="field-input code-input"
            placeholder="000000"
            [ngModel]="totpCode()"
            (ngModelChange)="totpCode.set($event)" />
        </div>

        @if (error()) {
          <p class="inline-err" id="dis-err">{{ error() }}</p>
        }

        <div class="modal-actions">
          <button class="btn-cancel" (click)="closed.emit()">Cancel</button>
          <button
            class="btn-disable"
            aria-label="Destructive action: disable 2FA"
            [disabled]="!password() || totpCode().length !== 6 || saving()"
            (click)="disable()">
            @if (saving()) { Disabling… } @else { Disable 2FA }
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position:fixed; inset:0; background:rgba(0,0,0,.65);
      display:flex; align-items:center; justify-content:center; z-index:1000;
      animation: fadeIn .2s ease-out;
    }
    @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
    .modal-box {
      background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-xl);
      padding:1.75rem; width:min(400px,95vw); position:relative;
      display:flex; flex-direction:column; gap:1rem;
      animation: scaleIn .2s ease-out;
    }
    @keyframes scaleIn { from { opacity:0; transform:scale(.95); } to { opacity:1; transform:scale(1); } }
    .modal-close { position:absolute; top:1rem; right:1rem; background:none; border:none; color:var(--text-secondary); font-size:1rem; cursor:pointer; }
    .modal-title { font-size:1rem; font-weight:700; color:var(--text-primary); }
    .modal-sub { font-size:.82rem; color:var(--text-secondary); line-height:1.5; }
    .field { display:flex; flex-direction:column; gap:.35rem; }
    label { font-size:.8rem; color:var(--text-secondary); }
    .field-input { background:var(--bg-input); border:1px solid var(--border); border-radius:8px; padding:.55rem .85rem; color:var(--text-primary); font-size:.88rem; outline:none; width:100%; }
    .field-input:focus { border-color:var(--border-focus); }
    .code-input { letter-spacing:.2em; text-align:center; font-size:1rem; }
    .inline-err { font-size:.78rem; color:var(--accent-red); margin:0; }
    .modal-actions { display:flex; gap:.75rem; justify-content:flex-end; }
    .btn-cancel { background:rgba(255,255,255,.06); border:1px solid var(--border); color:var(--text-secondary); border-radius:8px; padding:7px 16px; font-size:.85rem; cursor:pointer; }
    .btn-disable { background:var(--accent-red); border:none; color:#fff; border-radius:8px; padding:7px 16px; font-size:.85rem; font-weight:600; cursor:pointer; }
    .btn-disable:disabled { opacity:.5; cursor:not-allowed; }
  `],
})
export class TwoFactorDisableModalComponent implements OnInit {
  private readonly settingsService = inject(SettingsService);
  private readonly el = inject(ElementRef<HTMLElement>);
  private previousFocus: HTMLElement | null = null;

  @HostListener('document:keydown.escape')
  onEscape(): void { this.closed.emit(); }

  readonly closed   = output<void>();
  readonly disabled = output<void>();

  readonly password  = signal<string>('');
  readonly totpCode  = signal<string>('');
  readonly saving    = signal<boolean>(false);
  readonly error     = signal<string | null>(null);

  ngOnInit(): void {
    this.previousFocus = document.activeElement as HTMLElement;
    const firstInput = this.el.nativeElement.querySelector('input, button') as HTMLElement | null;
    firstInput?.focus();
  }

  disable(): void {
    this.saving.set(true);
    this.error.set(null);
    this.settingsService.disable2FA(this.password(), this.totpCode()).subscribe({
      next: () => { this.saving.set(false); this.disabled.emit(); this.previousFocus?.focus(); this.closed.emit(); },
      error: (err: string) => { this.saving.set(false); this.error.set(err); }
    });
  }

  onBackdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-backdrop')) this.closed.emit();
  }
}
