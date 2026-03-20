import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
	// ── Auth pages (no sidebar/navbar, only for guests) ──
	{
		path: 'login',
		canActivate: [guestGuard],
		loadComponent: () => import('./features/auth/login/login.page').then(m => m.LoginPage)
	},
	{
		path: 'signup',
		canActivate: [guestGuard],
		loadComponent: () => import('./features/auth/signup/signup.page').then(m => m.SignupPage)
	},

	// ── Authenticated app (sidebar + navbar layout) ──
	{
		path: '',
		component: MainLayoutComponent,
		canActivate: [authGuard],
		children: [
			{ path: '', redirectTo: 'dashboard', pathMatch: 'full' },
			{
				path: 'dashboard',
				loadComponent: () => import('./features/dashboard/dashboard.page').then(m => m.DashboardPage)
			},
			{
				path: 'daily-log',
				loadComponent: () => import('./features/daily-log/daily-log.page').then(m => m.DailyLogPage)
			},
			{
				path: 'goals',
				loadComponent: () => import('./features/goals/goals.page').then(m => m.GoalsPage)
			},
			{
				path: 'social/friends',
				loadComponent: () => import('./features/social/friends.page').then(m => m.FriendsPage)
			},
			{
				path: 'social/user-profile',
				loadComponent: () => import('./features/social/user-profile.page').then(m => m.UserProfilePage)
			},
			{
				path: 'chat',
				loadComponent: () => import('./features/chat/chat.page').then(m => m.ChatPage)
			},
			{
				path: 'profile',
				loadComponent: () => import('./features/profile/profile.page').then(m => m.ProfilePage)
			},
			{
				path: 'ai-insights',
				loadComponent: () => import('./features/ai-insights/ai-insights.page').then(m => m.AiInsightsPage)
			}
		]
	},

	// ── Fallback ──
	{ path: '**', redirectTo: 'login' }
];
