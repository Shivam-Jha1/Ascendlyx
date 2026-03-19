import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = 'frontend';
  private authService = inject(AuthService);
  private router = inject(Router);

  protected isAuthenticated = this.authService.isAuthenticated;

  constructor() {
    // If user is not authenticated, redirect to login
    if (!this.isAuthenticated()) {
      this.router.navigate(['/login']);
    }
  }
}
