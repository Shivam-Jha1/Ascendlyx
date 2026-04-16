import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  inject,
  OnInit,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  HostListener,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { OwnProfile, UpdateProfilePayload } from '../../../../core/models/profile.model';
import { ProfileService } from '../../../../core/services/profile.service';

@Component({
  selector: 'app-edit-profile-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './edit-profile-modal.component.html',
  styleUrls: ['./edit-profile-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditProfileModalComponent implements OnInit, AfterViewInit, OnDestroy {
  profile = input.required<OwnProfile>();
  saved = output<OwnProfile>();
  closed = output<void>();

  @ViewChild('modalContent') modalContent!: ElementRef<HTMLElement>;
  @ViewChild('firstInput') firstInput!: ElementRef<HTMLInputElement>;

  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);

  form!: FormGroup;
  readonly isSaving = signal<boolean>(false);
  readonly formError = signal<string | null>(null);

  private previousFocus: HTMLElement | null = null;

  ngOnInit(): void {
    const p = this.profile();
    this.form = this.fb.group({
      username: [p.username, [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(30),
        Validators.pattern(/^[a-zA-Z0-9_]+$/),
      ]],
      bio: [p.bio || '', [Validators.maxLength(500)]],
      location: [p.location || '', [Validators.maxLength(100)]],
      avatar_url: [p.avatar_url || ''],
    });
  }

  ngAfterViewInit(): void {
    this.previousFocus = document.activeElement as HTMLElement;
    setTimeout(() => {
      this.firstInput?.nativeElement?.focus();
    });
  }

  ngOnDestroy(): void {
    this.previousFocus?.focus();
  }

  get usernameError(): string | null {
    const ctrl = this.form.get('username');
    if (!ctrl?.touched || ctrl.valid) return null;
    if (ctrl.hasError('required')) return 'Username is required';
    if (ctrl.hasError('minlength')) return 'Username must be at least 3 characters';
    if (ctrl.hasError('maxlength')) return 'Username must be less than 30 characters';
    if (ctrl.hasError('pattern')) return 'Only letters, numbers, and underscores allowed';
    if (ctrl.hasError('serverError')) return ctrl.getError('serverError');
    return null;
  }

  get bioCharCount(): number {
    return 500 - (this.form.get('bio')?.value?.length ?? 0);
  }

  get avatarPreview(): string {
    return this.form.get('avatar_url')?.value || '';
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closed.emit();
  }

  @HostListener('document:keydown.tab', ['$event'])
  onTab(event: Event): void {
    const keyEvent = event as KeyboardEvent;
    if (!this.modalContent) return;
    const focusable = this.modalContent.nativeElement.querySelectorAll<HTMLElement>(
      'input, textarea, button, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (keyEvent.shiftKey && document.activeElement === first) {
      keyEvent.preventDefault();
      last.focus();
    } else if (!keyEvent.shiftKey && document.activeElement === last) {
      keyEvent.preventDefault();
      first.focus();
    }
  }

  onSave(): void {
    if (this.form.invalid || this.isSaving()) return;

    this.isSaving.set(true);
    this.formError.set(null);

    const payload: UpdateProfilePayload = {};
    const p = this.profile();

    if (this.form.value.username !== p.username) payload.username = this.form.value.username;
    if (this.form.value.bio !== (p.bio || '')) payload.bio = this.form.value.bio;
    if (this.form.value.location !== (p.location || '')) payload.location = this.form.value.location;
    if (this.form.value.avatar_url !== (p.avatar_url || '')) payload.avatar_url = this.form.value.avatar_url;

    this.profileService.updateProfile(payload).subscribe({
      next: (updated: OwnProfile) => {
        this.isSaving.set(false);
        this.saved.emit(updated);
      },
      error: (err: HttpErrorResponse) => {
        this.isSaving.set(false);
        if (err.status === 409) {
          this.form.get('username')?.setErrors({ serverError: 'This username is already taken' });
          this.form.get('username')?.markAsTouched();
        } else {
          this.formError.set(
            err.error?.detail || 'Something went wrong. Please try again.'
          );
        }
      },
    });
  }
}
