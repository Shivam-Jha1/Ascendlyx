import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, shareReplay, switchMap, throwError } from 'rxjs';
import { AuthService, AuthTokens } from '../services/auth.service';

// Single-flight refresh: all concurrent 401s share one token refresh call.
let refreshInFlight$: Observable<AuthTokens> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getAccessToken();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Skip refresh for any auth endpoint (login, signup, forgot-password, etc.)
      // and when no refresh token is stored.
      const isAuthEndpoint = req.url.includes('/auth/');
      const hasRefreshToken = !!authService.getRefreshToken();

      if (error.status === 401 && !isAuthEndpoint && hasRefreshToken) {
        if (!refreshInFlight$) {
          refreshInFlight$ = authService.refreshToken().pipe(shareReplay(1));
        }

        return refreshInFlight$.pipe(
          switchMap(tokens => {
            refreshInFlight$ = null;
            const retried = req.clone({
              setHeaders: { Authorization: `Bearer ${tokens.access_token}` }
            });
            return next(retried);
          }),
          catchError(refreshErr => {
            refreshInFlight$ = null;
            authService.logoutLocally();
            router.navigate(['/login']);
            return throwError(() => refreshErr);
          })
        );
      }
      return throwError(() => error);
    })
  );
};