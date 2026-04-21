export type HabitCategory = 'fitness' | 'study' | 'mindfulness' | 'reading' | 'custom';

export interface Streak {
  current_streak: number;
  longest_streak: number;
  last_checkin_date: string | null;
}

export interface HabitLog {
  id: number | string;
  habit_id: string;
  user_id: string;
  date: string;
  is_completed: boolean;
  actual_duration: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  category: HabitCategory;
  reminder_time: string;
  expected_duration: number | null;
  is_active: boolean;
  streak: Streak;
  today_log: HabitLog | null;
  created_at: string;
  updated_at: string;
}

export interface ToggleResponse {
  habit_id: string;
  date: string;
  is_completed: boolean;
  streak: Streak;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  target_value: string;
  current_value: string;
  unit: string;
  deadline: string;
  category: string;
  is_completed: boolean;
  progress_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface AIScoreBreakdown {
  completion_rate: number;
  streak_consistency: number;
  goal_progress_rate: number;
}

export interface AIScore {
  id: string;
  user_id: string;
  score: number;
  breakdown: AIScoreBreakdown;
  calculated_at: string;
}

export interface DaySummary {
  date: string;
  checkins_count: number;
  habits_completed: number;
}

export interface WeeklySummary {
  week_start: string;
  week_end: string;
  days: DaySummary[];
  total_checkins: number;
  completion_rate: number;
}

export interface DashboardResponse {
  habits: Habit[];
  goals: Goal[];
  ai_score: AIScore | null;
  weekly_summary: WeeklySummary;
}
