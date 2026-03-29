import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  GoalResponse,
  GoalCreate,
  GoalUpdate,
  GoalProgressUpdate,
  GoalProgressLogResponse,
} from '../models/goal.model';

@Injectable({ providedIn: 'root' })
export class GoalService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/goals`;

  getGoals(includeCompleted = true): Observable<GoalResponse[]> {
    const params = new HttpParams().set('include_completed', String(includeCompleted));
    return this.http.get<GoalResponse[]>(this.apiUrl, { params });
  }

  getGoal(goalId: string): Observable<GoalResponse> {
    return this.http.get<GoalResponse>(`${this.apiUrl}/${goalId}`);
  }

  createGoal(payload: GoalCreate): Observable<GoalResponse> {
    return this.http.post<GoalResponse>(this.apiUrl, payload);
  }

  updateGoal(goalId: string, payload: GoalUpdate): Observable<GoalResponse> {
    return this.http.patch<GoalResponse>(`${this.apiUrl}/${goalId}`, payload);
  }

  deleteGoal(goalId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${goalId}`);
  }

  toggleMilestone(goalId: string, milestoneId: string): Observable<GoalResponse> {
    return this.http.patch<GoalResponse>(
      `${this.apiUrl}/${goalId}/milestones/${milestoneId}/toggle`,
      {}
    );
  }

  updateProgress(goalId: string, payload: GoalProgressUpdate): Observable<GoalResponse> {
    return this.http.patch<GoalResponse>(`${this.apiUrl}/${goalId}/progress`, payload);
  }

  getProgressLogs(goalId: string): Observable<GoalProgressLogResponse[]> {
    return this.http.get<GoalProgressLogResponse[]>(`${this.apiUrl}/${goalId}/progress-logs`);
  }
}
