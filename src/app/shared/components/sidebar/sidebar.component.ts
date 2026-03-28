import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  readonly mainNav = [
    { label: 'Dashboard', icon: 'bi-grid', route: '/dashboard' },
    { label: 'Daily Log', icon: 'bi-fire', route: '/daily-log' },
    { label: 'Goals', icon: 'bi-bullseye', route: '/goals' },
    { label: 'AI Insights', icon: 'bi-robot', route: '/ai-insights' },
  ];

  readonly socialNav = [
    { label: 'Friends', icon: 'bi-people', route: '/social/friends', badge: 3 },
    { label: 'Chat', icon: 'bi-chat-dots', route: '/chat', badge: 5 },
    { label: 'Leaderboard', icon: 'bi-trophy', route: '/leaderboard', locked: true },
  ];

  readonly accountNav = [
    { label: 'Settings', icon: 'bi-gear', route: '/settings' },
    { label: 'Profile', icon: 'bi-person', route: '/profile' },
  ];

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get userInitial(): string {
    const user = this.currentUser;
    return user?.name?.charAt(0)?.toUpperCase() || 'U';
  }

  logout(): void {
    this.authService.logout().pipe(
      finalize(() => this.router.navigate(['/login']))
    ).subscribe({ error: () => {} });
  }
}