import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss']
})
export class LoginPage {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  errorMessage = '';
  isLoading = false;

  onSubmit(): void {
    this.errorMessage = '';

    if (!this.email || !this.password) {
      this.errorMessage = 'Please fill in all fields.';
      return;
    }

    this.isLoading = true;

    // Mock login — replace with real API call later
    setTimeout(() => {
      const mockUser = {
        id: '1',
        name: 'Alex Johnson',
        email: this.email,
        handle: '@alexj',
        avatar: null
      };
      this.authService.login('mock-jwt-token-' + Date.now(), mockUser);
      this.isLoading = false;
      this.router.navigate(['/dashboard']);
    }, 600);
  }

  loginWithGoogle(): void {
    // Placeholder for Google OAuth
    this.errorMessage = 'Google sign-in coming soon.';
  }
}