import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  HostListener,
} from '@angular/core';

@Component({
  selector: 'app-toggle-switch',
  standalone: true,
  template: `
    <label class="toggle" [class.disabled]="disabled()">
      <input
        type="checkbox"
        class="toggle-input"
        [checked]="checked()"
        [disabled]="disabled()"
        (change)="onToggle()"
        role="switch"
        [attr.aria-checked]="checked()"
      />
      <span class="toggle-track" [class.active]="checked()" tabindex="0" (keydown.space)="onToggle(); $event.preventDefault()">
        <span class="toggle-thumb"></span>
      </span>
    </label>
  `,
  styles: [`
    :host { display: inline-block; }
    .toggle { display: inline-flex; align-items: center; cursor: pointer; }
    .toggle.disabled { opacity: 0.5; cursor: not-allowed; }
    .toggle-input { position: absolute; opacity: 0; width: 0; height: 0; }
    .toggle-track {
      position: relative;
      width: 44px;
      height: 24px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.1);
      transition: background 0.2s ease;
      outline: none;
    }
    .toggle-track:focus-visible {
      box-shadow: 0 0 0 2px var(--accent-blue);
    }
    .toggle-track.active {
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
    }
    .toggle-thumb {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #fff;
      transition: transform 0.2s ease;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }
    .toggle-track.active .toggle-thumb {
      transform: translateX(20px);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToggleSwitchComponent {
  checked = input<boolean>(false);
  disabled = input<boolean>(false);
  toggled = output<boolean>();

  onToggle(): void {
    if (!this.disabled()) {
      this.toggled.emit(!this.checked());
    }
  }
}
