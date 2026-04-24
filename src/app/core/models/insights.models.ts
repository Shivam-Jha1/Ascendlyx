// ─── Weekly Insight Snapshot (from backend) ───────────────────────────────
export interface WeeklyInsightResponse {
  id: string;
  user_id: string;
  week_start: string;
  week_end: string;
  habits_completed: number;
  habits_total_possible: number;
  prev_week_habits_completed: number;
  consistency_score: number;       // 0.0–1.0
  avg_daily_completion: number;    // 0.0–1.0
  most_productive_time: string | null;
  goal_progress_score: number;     // 0.0–1.0
  ai_productivity_score: number | null;
  ai_score_rating: string | null;  // "Poor"|"Fair"|"Good"|"Great"|"Excellent"
  ai_percentile: number | null;
  ai_coach_message: string | null;
  smart_nudges: string[] | null;
  is_stale: boolean;
  computed_at: string;
  ai_computed_at: string | null;
}

// ─── Status endpoint ────────────────────────────────────────────────────────
export interface InsightStatusResponse {
  has_data: boolean;
  streak: InsightStreakResponse | null;
  latest_weekly: WeeklyInsightResponse | null;
}

export interface InsightStreakResponse {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_active_week: string | null;
  updated_at: string;
}

// ─── Refresh endpoint ───────────────────────────────────────────────────────
export interface InsightRefreshResponse {
  message: string;
  snapshot: WeeklyInsightResponse;
}

// ─── Chart data (constructed on the frontend) ──────────────────────────────
export interface ProductivityDayPoint {
  date: string;
  day_name: string;
  productivity_score: number; // 0–100
  habits_completed: number;
  habits_total: number;
  is_today: boolean;
}
