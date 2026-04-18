import {
  Component, ChangeDetectionStrategy, output
} from '@angular/core';

@Component({
  selector: 'app-delete-account-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="settings-section">
      <h3 class="section-title danger-title">🗑️ Delete Account</h3>
      <div class="section-divider"></div>

      <div class="danger-card">
        <p class="danger-msg">
          Deleting your account is <strong>permanent and irreversible</strong>.
          All your data, habits, goals, and history will be permanently erased
          after a 30-day grace period. You can cancel the deletion within
          30 days by logging back in.
        </p>
        <button
          class="btn-delete"
          aria-label="Destructive action: delete my account"
          (click)="openModal.emit()">
          Delete My Account
        </button>
      </div>
    </section>
  `,
  styles: [`
    .settings-section { margin-bottom: 2rem; }
    .section-title { font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin-bottom: .75rem; }
    .danger-title { color: var(--accent-red) !important; }
    .section-divider { height: 1px; background: rgba(248,81,73,.25); margin-bottom: 1.25rem; }
    .danger-card {
      border: 1px solid rgba(248,81,73,.3); border-radius: var(--radius-lg);
      padding: 1.1rem 1.25rem; background: rgba(248,81,73,.04);
    }
    .danger-msg { font-size: .85rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 1rem; }
    .danger-msg strong { color: var(--accent-red); }
    .btn-delete {
      background: transparent; border: 1px solid var(--accent-red); color: var(--accent-red);
      border-radius: 8px; padding: 7px 18px; font-size: .85rem; font-weight: 600; cursor: pointer;
      transition: background .2s;
    }
    .btn-delete:hover { background: rgba(248,81,73,.12); }
  `],
})
export class DeleteAccountSectionComponent {
  readonly openModal = output<void>();
}
