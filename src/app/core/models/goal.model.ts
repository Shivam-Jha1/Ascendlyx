export type GoalPriority = 'high' | 'medium' | 'low';

export interface MilestoneCreate {
  label: string;
}

export interface MilestoneResponse {
  id: string;
  goal_id: string;
  label: string;
  is_completed: boolean;
  sort_order: number;
  created_at: string;
}

export interface GoalResponse {
  id: string;
  user_id: string;
  title: string;
  description: string;
  priority: GoalPriority;
  deadline: string | null;
  target_value: string | null;
  current_value: string;
  unit: string | null;
  category: string;
  is_completed: boolean;
  created_at: string;
  milestones: MilestoneResponse[];
  progress_percentage: number;
  completed_milestones: number;
  total_milestones: number;
}

export interface GoalCreate {
  title: string;
  description?: string;
  priority?: GoalPriority;
  deadline?: string | null;
  target_value?: string | null;
  unit?: string | null;
  category?: string;
  milestones?: MilestoneCreate[];
}

export interface GoalUpdate {
  title?: string;
  description?: string;
  priority?: GoalPriority;
  deadline?: string | null;
  target_value?: string | null;
  unit?: string | null;
  category?: string;
  milestones?: MilestoneCreate[] | null;
}

export interface GoalProgressUpdate {
  delta: number;
  note?: string | null;
}

export interface GoalProgressLogResponse {
  id: string;
  goal_id: string;
  delta: number;
  note: string | null;
  logged_at: string;
  created_at: string;
}
