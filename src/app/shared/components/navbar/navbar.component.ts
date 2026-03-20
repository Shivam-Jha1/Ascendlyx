import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  streakDays = 0;
  hasNotifications = true;

  get userInitial(): string {
    const user = this.authService.getCurrentUser();
    return user?.name?.charAt(0)?.toUpperCase() || 'U';
  }

  openAiCoach(): void {
    this.router.navigate(['/ai-insights']);
  }
}