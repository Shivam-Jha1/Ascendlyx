export interface QuickStats {
  current_streak: number;
  ai_score: number;
  friends_count: number;
  consistency_percent: number;
}

export interface ProductivityStats {
  habits_done_total: number;
  active_goals_count: number;
  books_read_count: number;
  longest_streak_days: number;
  focus_time_hours: number;
  badges_earned_count: number;
}

export interface ConsistencyData {
  percentage: number;
  rating: 'Excellent' | 'Good' | 'Average' | 'Needs Work';
  percentile: number;
}

export interface PublicGoal {
  id: string;
  title: string;
  progress_percentage: number;
  priority: 'high' | 'medium' | 'low';
  unit: string | null;
  target_value: number | null;
}

export interface Badge {
  slug: string;
  name: string;
  description: string;
  icon_value: string;
  earned: boolean;
  earned_at: string | null;
  criteria?: string;
}

export interface PrivacySettings {
  show_streaks_publicly: boolean;
  share_habit_completions: boolean;
  public_goal_visibility: boolean;
  show_ai_score_publicly: boolean;
  show_friends_count: boolean;
  show_productivity_stats: boolean;
}

export type MembershipTier = 'free' | 'pro' | 'enterprise';

export interface OwnProfile {
  user_id: string;
  name: string;
  username: string;
  bio: string;
  location: string;
  avatar_url: string | null;
  avatar_initial: string;
  membership_tier: MembershipTier;
  joined_at: string;
  quick_stats: QuickStats;
  productivity_stats: ProductivityStats;
  consistency: ConsistencyData;
  public_goals: PublicGoal[];
  badges: Badge[];
  privacy: PrivacySettings;
}

export interface UpdateProfilePayload {
  username?: string;
  bio?: string;
  location?: string;
  avatar_url?: string;
}

export interface UpdatePrivacyPayload {
  show_streaks_publicly?: boolean;
  share_habit_completions?: boolean;
  public_goal_visibility?: boolean;
  show_ai_score_publicly?: boolean;
  show_friends_count?: boolean;
  show_productivity_stats?: boolean;
}

export interface FocusSessionPayload {
  duration_minutes: number;
  habit_id?: string;
  notes?: string;
}

export interface FocusSessionResponse {
  id: string;
  user_id: string;
  duration_minutes: number;
  started_at: string;
  ended_at: string;
  habit_id: string | null;
  notes: string | null;
}

export interface ApiError {
  detail: string;
  status_code: number;
  error_code?: string;
}
