import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
	{
		path: '',
		component: MainLayoutComponent,
		children: [
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
	{
		path: 'login',
		loadComponent: () => import('./features/auth/login/login.page').then(m => m.LoginPage)
	},
	{
		path: 'signup',
		loadComponent: () => import('./features/auth/signup/signup.page').then(m => m.SignupPage)
	},
	{ path: '**', redirectTo: 'dashboard' }
];
