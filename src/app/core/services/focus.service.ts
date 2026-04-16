import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FocusSessionPayload, FocusSessionResponse } from '../models/profile.model';
import { ProfileService } from './profile.service';

@Injectable({ providedIn: 'root' })
export class FocusService {
  private readonly http = inject(HttpClient);
  private readonly profileService = inject(ProfileService);
  private readonly apiUrl = `${environment.apiBaseUrl}/focus-sessions`;

  logSession(payload: FocusSessionPayload): Observable<FocusSessionResponse> {
    return this.http.post<FocusSessionResponse>(this.apiUrl, payload).pipe(
      tap(() => {
        this.profileService.loadProfile();
      }),
      catchError((err: HttpErrorResponse) => {
        return throwError(() => err);
      })
    );
  }
}
