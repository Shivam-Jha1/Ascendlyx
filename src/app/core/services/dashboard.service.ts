import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardResponse, WeeklySummary, Habit, HabitCheckin, HabitCategory } from '../models/dashboard.model';

export interface CreateHabitPayload {
  name: string;
  category: HabitCategory;
  reminder_time?: string;
  duration_minutes?: number;
  daily_target?: number;
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

  checkinHabit(habitId: string, data?: { note?: string; checked_at?: string }): Observable<HabitCheckin> {
    return this.http.post<HabitCheckin>(`${this.apiUrl}/habits/${habitId}/checkin`, data ?? {});
  }
}