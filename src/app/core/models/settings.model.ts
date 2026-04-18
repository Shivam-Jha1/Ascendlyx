export type Theme = 'dark' | 'light';
export type AccentColor = 'blue' | 'cyan' | 'green' | 'red';

export interface AppearanceSettings {
  theme: Theme;
  accent_color: AccentColor;
  compact_mode: boolean;
}

export interface NotificationSettings {
  daily_habit_reminders: boolean;
  streak_alerts: boolean;
  friend_activity: boolean;
  ai_coach_nudges: boolean;
  leaderboard_updates: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

export interface PrivacySettings {
  public_profile: boolean;
  activity_feed_visible: boolean;
  hide_specific_habits: boolean;
  show_streaks_publicly: boolean;
  share_habit_completions: boolean;
  public_goal_visibility: boolean;
}

export interface SecuritySummary {
  two_fa_enabled: boolean;
  active_sessions_count: number;
  login_notifications_enabled: boolean;
}

export interface ActiveSession {
  id: string;
  device_name: string;
  device_type: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  ip_address: string;
  location?: string;
  last_used_at: string;
  is_current: boolean;
}

export interface SubscriptionInfo {
  tier: 'free' | 'pro' | 'enterprise';
  joined_at: string;
  renews_at?: string | null;
}

export interface FullSettings {
  appearance: AppearanceSettings;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  security: SecuritySummary;
  subscription: SubscriptionInfo;
}

export interface HabitPrivacyItem {
  habit_id: string;
  habit_name: string;
  category: string;
  is_hidden: boolean;
}

export interface TwoFactorSetupData {
  secret: string;
  qr_code_url: string;
  backup_codes: string[];
}
