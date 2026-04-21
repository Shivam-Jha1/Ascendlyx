import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardResponse, WeeklySummary, Habit, HabitLog, ToggleResponse, HabitCategory } from '../models/dashboard.model';

export interface CreateHabitPayload {
  name: string;
  category: HabitCategory;
  reminder_time?: string;
  expected_duration?: number;
}

export interface HabitLogUpdatePayload {
  actual_duration?: number;
  completed_at?: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiBaseUrl;

  getDashboard(): Observable<DashboardResponse> {
    return this.http.get<DashboardResponse>(`${this.apiUrl}/dashboard`);
  }

  getWeeklySummary(): Observable<WeeklySummary> {
    return this.http.get<WeeklySummary>(`${this.apiUrl}/dashboard/weekly`);
  }

  getHabits(): Observable<Habit[]> {
    return this.http.get<Habit[]>(`${this.apiUrl}/habits`);
  }

  createHabit(payload: CreateHabitPayload): Observable<Habit> {
    return this.http.post<Habit>(`${this.apiUrl}/habits`, payload);
  }

  toggleHabit(habitId: string, date?: string): Observable<ToggleResponse> {
    const options: { params?: Record<string, string> } = {};
    if (date) { options.params = { date }; }
    return this.http.post<ToggleResponse>(`${this.apiUrl}/habits/${habitId}/toggle`, null, options);
  }

  updateHabitLog(habitId: string, logDate: string, payload: HabitLogUpdatePayload): Observable<HabitLog> {
    return this.http.put<HabitLog>(`${this.apiUrl}/habits/${habitId}/log/${logDate}`, payload);
  }

  deleteHabitLog(habitId: string, logDate: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/habits/${habitId}/log/${logDate}`);
  }

  deleteHabit(habitId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/habits/${habitId}`);
  }
}