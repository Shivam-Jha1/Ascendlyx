import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss']
})
export class ForgotPasswordPage {
  private authService = inject(AuthService);
  private router = inject(Router);

  step: 'email' | 'reset' = 'email';

  email = '';
  otp = '';
  newPassword = '';
  confirmNewPassword = '';

  errorMessage = '';
  successMessage = '';
  isLoading = false;

  onRequestOtp(): void {
    this.errorMessage = '';

    if (!this.email) {
      this.errorMessage = 'Please enter your email address.';
      return;
    }

    this.isLoading = true;

    this.authService.forgotPassword(this.email).subscribe({
      next: res => {
        this.isLoading = false;
        this.successMessage = res.message;
        this.step = 'reset';
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        if (err.status === 429) {
          this.errorMessage = 'Too many attempts. Please wait before trying again.';
        } else {
          this.errorMessage =
            err.error?.detail || err.error?.message || 'Something went wrong. Please try again.';
        }
      }
    });
  }

  onResetPassword(): void {
    this.errorMessage = '';

    if (!this.otp || !this.newPassword || !this.confirmNewPassword) {
      this.errorMessage = 'Please fill in all fields.';
      return;
    }

    if (this.otp.length !== 6) {
      this.errorMessage = 'Please enter the 6-digit verification code.';
      return;
    }

    if (this.newPassword.length < 8) {
      this.errorMessage = 'Password must be at least 8 characters.';
      return;
    }

    if (this.newPassword !== this.confirmNewPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.isLoading = true;

    this.authService.resetPassword({
      email: this.email,
      otp: this.otp,
      new_password: this.newPassword
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/login'], { queryParams: { reset: 'success' } });
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        if (err.status === 429) {
          this.errorMessage = 'Too many attempts. Please wait before trying again.';
        } else {
          this.errorMessage =
            err.error?.detail || err.error?.message || 'Invalid or expired code. Please try again.';
        }
      }
    });
  }
}
