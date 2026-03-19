import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private isAuthenticatedSignal = signal<boolean>(false);
  public isAuthenticated = this.isAuthenticatedSignal.asReadonly();

  constructor() {
    this.checkAuthStatus();
  }

  /**
   * Check if user has a valid auth token in localStorage
   */
  private checkAuthStatus(): void {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');
    this.isAuthenticatedSignal.set(!!(token && user));
  }

  /**
   * Log in user and store auth data
   */
  login(token: string, user: any): void {
    localStorage.setItem('authToken', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.isAuthenticatedSignal.set(true);
  }

  /**
   * Log out user and clear auth data
   */
  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    this.isAuthenticatedSignal.set(false);
  }

  /**
   * Get current user data
   */
  getCurrentUser(): any {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
  }

  /**
   * Get auth token
   */
  getToken(): string | null {
    return localStorage.getItem('authToken');
  }
}