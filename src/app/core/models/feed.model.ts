export type ReactionType = 'fire' | 'clap' | 'strong' | 'like' | 'goals' | 'read_it';
export type PostType = 'manual' | 'habit_checkin' | 'goal_completed' | 'streak_milestone';
export type FriendshipStatus =
  | 'none'
  | 'pending_sent'
  | 'pending_received'
  | 'accepted'
  | 'blocked';

export interface PostAuthor {
  user_id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  avatar_initial: string;
  current_streak: number;
}

export interface ReactionSummary {
  reaction_type: ReactionType;
  count: number;
  user_reacted: boolean;
}

export interface ReplyAuthor {
  user_id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  avatar_initial: string;
}

export interface PostReply {
  id: string;
  post_id: string;
  author: ReplyAuthor;
  content: string;
  created_at: string;
  time_ago: string;
}

export interface ActivityPost {
  id: string;
  author: PostAuthor;
  content: string;
  post_type: PostType;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  time_ago: string;
  reactions: ReactionSummary[];
  reply_count: number;
  user_reaction?: ReactionType | null;
  can_edit?: boolean;
  can_delete?: boolean;
  replies?: PostReply[];
  showReplies?: boolean;
  replyLoading?: boolean;
}

export interface FeedResponse {
  posts: ActivityPost[];
  total: number;
  page: number;
  page_size: number;
  per_page?: number;
  has_more: boolean;
}

export interface FriendListItem {
  user_id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  avatar_initial: string;
  current_streak: number;
  longest_streak?: number;
  membership_tier?: 'free' | 'pro' | 'enterprise';
}

export interface FriendListResponse {
  friends: FriendListItem[];
  total: number;
}

export interface FriendSearchResult {
  user_id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  avatar_initial: string;
  friendship_status: FriendshipStatus;
}

export interface ReactionRequest {
  reaction_type: ReactionType;
}

export interface PostCreatePayload {
  content: string;
  post_type?: PostType;
}

export interface ReplyCreatePayload {
  content: string;
}

export interface WsFeedEvent {
  type: 'new_post' | 'reaction_update' | 'new_reply' | 'post_deleted';
  post?: ActivityPost;
  post_id?: string;
}

export const REACTION_META: Record<ReactionType, { emoji: string; label: string }> = {
  fire: { emoji: '🔥', label: 'Fire' },
  clap: { emoji: '👏', label: 'Clap' },
  strong: { emoji: '💪', label: 'Strong' },
  like: { emoji: '👍', label: 'Like' },
  goals: { emoji: '🎯', label: 'Goals' },
  read_it: { emoji: '📖', label: 'Read it' },
};
