import {
  Component, ChangeDetectionStrategy, output, inject, signal, OnInit
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../../../core/services/settings.service';
import { TwoFactorSetupData } from '../../../../core/models/settings.model';

@Component({
  selector: 'app-two-factor-setup-modal',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="modal-backdrop" role="dialog" aria-modal="true" (click)="onBackdropClick($event)">
      <div class="modal-box" (click)="$event.stopPropagation()">
        <button class="modal-close" aria-label="Close modal" (click)="closed.emit()">✕</button>

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

        <!-- Step 1: QR Code -->
        @if (step() === 1) {
          <div class="step-content">
            <h4 class="modal-title">Set Up Two-Factor Authentication</h4>
            @if (loading()) {
              <div class="loading-spin">Loading…</div>
            } @else if (setupData()) {
              <p class="modal-sub">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
              <img class="qr-img" [src]="qrDataUrl()" alt="2FA QR code" />
              <div class="secret-row">
                <code class="secret-text">{{ setupData()!.secret }}</code>
                <button class="btn-copy" (click)="copySecret()">{{ copied() ? '✓ Copied' : 'Copy' }}</button>
              </div>
              <button class="btn-primary" (click)="step.set(2)">Next →</button>
            } @else if (loadError()) {
              <p class="inline-err">{{ loadError() }}</p>
              <button class="btn-primary" (click)="load()">Retry</button>
            }
          </div>
        }

        <!-- Step 2: Verify TOTP -->
        @if (step() === 2) {
          <div class="step-content">
            <h4 class="modal-title">Verify Code</h4>
            <p class="modal-sub">Enter the 6-digit code from your authenticator app.</p>
            <input
              class="code-input"
              type="text"
              inputmode="numeric"
              maxlength="6"
              placeholder="000000"
              autofocus
              aria-label="6-digit TOTP code"
              [ngModel]="totpCode()"
              (ngModelChange)="totpCode.set($event)"
              [attr.aria-describedby]="verifyError() ? 'verify-err' : null" />
            @if (verifyError()) {
              <p class="inline-err" id="verify-err">{{ verifyError() }}</p>
            }
            <button class="btn-primary" [disabled]="totpCode().length !== 6 || verifying()" (click)="verify()">
              @if (verifying()) { Verifying… } @else { Verify &amp; Enable }
            </button>
          </div>
        }

        <!-- Step 3: Backup Codes -->
        @if (step() === 3) {
          <div class="step-content">
            <h4 class="modal-title">Backup Codes</h4>
            <p class="modal-sub warning-note">⚠️ Store these safely — they won't be shown again.</p>
            <div class="backup-grid">
              @for (code of setupData()!.backup_codes; track code) {
                <code class="backup-code">{{ code }}</code>
              }
            </div>
            <div class="backup-actions">
              <button class="btn-secondary" (click)="copyAll()">{{ copiedAll() ? '✓ Copied all' : 'Copy all' }}</button>
              <button class="btn-secondary" (click)="downloadCodes()">Download .txt</button>
            </div>
            <button class="btn-primary" (click)="done()">Done</button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,.65);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
      animation: fadeIn .2s ease-out;
    }
    @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
    .modal-box {
      background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl);
      padding: 1.75rem; width: min(440px, 95vw); position: relative;
      animation: scaleIn .2s ease-out;
    }
    @keyframes scaleIn { from { opacity:0; transform:scale(.95); } to { opacity:1; transform:scale(1); } }
    .modal-close { position:absolute; top:1rem; right:1rem; background:none; border:none; color:var(--text-secondary); font-size:1rem; cursor:pointer; }
    .steps { display:flex; align-items:center; margin-bottom:1.5rem; }
    .step { display:flex; align-items:center; gap:.35rem; }
    .step-num { width:22px; height:22px; border-radius:50%; background:rgba(255,255,255,.08); color:var(--text-secondary); font-size:.72rem; display:flex; align-items:center; justify-content:center; font-weight:700; }
    .step.active .step-num { background:var(--accent-blue); color:#fff; }
    .step-label { font-size:.75rem; color:var(--text-secondary); }
    .step.active .step-label { color:var(--text-primary); font-weight:600; }
    .step-connector { flex:1; height:1px; background:var(--border); margin:0 .5rem; }
    .step-content { display:flex; flex-direction:column; gap:.85rem; }
    .modal-title { font-size:1rem; font-weight:700; color:var(--text-primary); }
    .modal-sub { font-size:.82rem; color:var(--text-secondary); line-height:1.5; }
    .warning-note { color:#f0883e; }
    .qr-img { width:160px; height:160px; border-radius:8px; border:2px solid var(--border); align-self:center; background:#fff; }
    .loading-spin { color:var(--text-secondary); font-size:.85rem; text-align:center; padding:2rem; }
    .secret-row { display:flex; align-items:center; gap:.5rem; background:rgba(255,255,255,.04); border-radius:7px; padding:.5rem .75rem; }
    .secret-text { font-size:.75rem; color:var(--text-primary); flex:1; word-break:break-all; font-family:monospace; }
    .btn-copy { font-size:.72rem; background:rgba(88,166,255,.12); color:var(--accent-blue); border:none; border-radius:5px; padding:3px 8px; cursor:pointer; white-space:nowrap; }
    .code-input { width:100%; background:var(--bg-input); border:1px solid var(--border); border-radius:8px; padding:.6rem 1rem; color:var(--text-primary); font-size:1.2rem; text-align:center; letter-spacing:.25em; outline:none; }
    .code-input:focus { border-color:var(--border-focus); }
    .inline-err { font-size:.78rem; color:var(--accent-red); margin:0; }
    .btn-primary { background:linear-gradient(135deg,var(--accent-blue),var(--accent-purple)); border:none; color:#fff; border-radius:8px; padding:9px 22px; font-size:.88rem; font-weight:600; cursor:pointer; align-self:flex-start; }
    .btn-primary:disabled { opacity:.5; cursor:not-allowed; }
    .backup-grid { display:grid; grid-template-columns:1fr 1fr; gap:.4rem; }
    .backup-code { background:rgba(255,255,255,.04); border:1px solid var(--border); border-radius:6px; padding:.4rem .6rem; font-size:.78rem; color:var(--text-primary); font-family:monospace; text-align:center; }
    .backup-actions { display:flex; gap:.5rem; }
    .btn-secondary { background:rgba(255,255,255,.06); border:1px solid var(--border); color:var(--text-secondary); border-radius:7px; padding:6px 14px; font-size:.8rem; cursor:pointer; }
  `],
})
export class TwoFactorSetupModalComponent implements OnInit {
  private readonly settingsService = inject(SettingsService);

  readonly closed  = output<void>();
  readonly enabled = output<void>();

  readonly step      = signal<1 | 2 | 3>(1);
  readonly loading   = signal<boolean>(false);
  readonly loadError = signal<string | null>(null);
  readonly setupData = signal<TwoFactorSetupData | null>(null);
  readonly qrDataUrl = signal<string>('');
  readonly totpCode  = signal<string>('');
  readonly verifying = signal<boolean>(false);
  readonly verifyError = signal<string | null>(null);
  readonly copied    = signal<boolean>(false);
  readonly copiedAll = signal<boolean>(false);

  readonly stepLabels = ['Scan QR', 'Verify', 'Backup Codes'];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.settingsService.setup2FA().subscribe({
      next: data => {
        this.setupData.set(data);
        this.loading.set(false);
        this.generateQr(data.qr_code_url);
      },
      error: (err: string) => {
        this.loading.set(false);
        this.loadError.set(err);
      }
    });
  }

  private generateQr(url: string): void {
    // Use dynamic import to generate QR client-side
    import('qrcode').then(QRCode => {
      QRCode.toDataURL(url, { width: 160, margin: 1 }).then(dataUrl => {
        this.qrDataUrl.set(dataUrl);
      });
    }).catch(() => {
      // Fallback: use the URL as-is (a QR API would be another option)
      this.qrDataUrl.set('');
    });
  }

  verify(): void {
    this.verifying.set(true);
    this.verifyError.set(null);
    this.settingsService.confirm2FA(this.totpCode()).subscribe({
      next: () => { this.verifying.set(false); this.step.set(3); },
      error: (err: string) => { this.verifying.set(false); this.verifyError.set(err); }
    });
  }

  copySecret(): void {
    navigator.clipboard.writeText(this.setupData()!.secret);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  copyAll(): void {
    navigator.clipboard.writeText(this.setupData()!.backup_codes.join('\n'));
    this.copiedAll.set(true);
    setTimeout(() => this.copiedAll.set(false), 2000);
  }

  downloadCodes(): void {
    const text = this.setupData()!.backup_codes.join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = 'ascendlyx-backup-codes.txt';
    a.click();
  }

  done(): void {
    this.enabled.emit();
    this.closed.emit();
  }

  onBackdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-backdrop')) this.closed.emit();
  }
}
