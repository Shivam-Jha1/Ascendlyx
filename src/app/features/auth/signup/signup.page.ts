import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
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

  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  errorMessage = '';
  isLoading = false;

  onSubmit(): void {
    this.errorMessage = '';

    if (!this.fullName || !this.email || !this.password || !this.confirmPassword) {
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

    // Mock signup — replace with real API call later
    setTimeout(() => {
      const mockUser = {
        id: Date.now().toString(),
        name: this.fullName,
        email: this.email,
        handle: '@' + this.fullName.toLowerCase().replace(/\s+/g, ''),
        avatar: null
      };
      this.authService.login('mock-jwt-token-' + Date.now(), mockUser);
      this.isLoading = false;
      this.router.navigate(['/dashboard']);
    }, 800);
  }

  signupWithGoogle(): void {
    this.errorMessage = 'Google sign-up coming soon.';
  }
}