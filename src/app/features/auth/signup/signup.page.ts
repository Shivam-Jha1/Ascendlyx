import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-signup-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss']
})
export class SignupPage {
  private authService = inject(AuthService);
  private router = inject(Router);

  step: 'form' | 'otp' = 'form';

  // Step 1 fields
  firstName = '';
  lastName = '';
  email = '';
  password = '';
  confirmPassword = '';

  // Step 2 fields
  otp = '';

  errorMessage = '';
  successMessage = '';
  isLoading = false;

  onSubmitForm(): void {
    this.errorMessage = '';

    if (!this.firstName || !this.lastName || !this.email || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Please fill in all fields.';
      return;
    }

    if (this.password.length < 8) {
      this.errorMessage = 'Password must be at least 8 characters.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.isLoading = true;

    this.authService.signupRequestOtp({
      email: this.email,
      password: this.password,
      first_name: this.firstName,
      last_name: this.lastName
    }).subscribe({
      next: res => {
        this.isLoading = false;
        this.successMessage = res.message || 'Verification code sent to your email.';
        this.step = 'otp';
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        this.errorMessage =
          err.error?.detail || err.error?.message || 'Signup failed. Please try again.';
      }
    });
  }

  onVerifyOtp(): void {
    this.errorMessage = '';

    if (!this.otp || this.otp.length !== 6) {
      this.errorMessage = 'Please enter the 6-digit verification code.';
      return;
    }

    this.isLoading = true;

    this.authService.signupVerifyOtp({ email: this.email, otp: this.otp }).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        if (err.status === 429) {
          this.errorMessage = 'Too many attempts. Please wait before trying again.';
        } else {
          this.errorMessage =
            err.error?.detail || err.error?.message || 'Invalid or expired verification code.';
        }
      }
    });
  }

  goBackToForm(): void {
    this.step = 'form';
    this.otp = '';
    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = false;
  }

  signupWithGoogle(): void {
    this.errorMessage = 'Google sign-up coming soon.';
  }
}