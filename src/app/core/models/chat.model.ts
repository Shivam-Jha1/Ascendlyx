export interface ConversationParticipant {
  user_id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  avatar_initial: string;
  is_online: boolean;
  current_streak: number;
}

export interface LastMessage {
  content: string;
  sender_id: string;
  sent_at: string;
  is_deleted: boolean;
}

export interface Conversation {
  id: string;
  other_participant: ConversationParticipant;
  last_message: LastMessage | null;
  unread_count: number;
  last_message_at: string | null;
  is_ai_coach: boolean;
  // client-side
  typingIndicator?: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_deleted: boolean;
  created_at: string;
  client_timestamp?: string | null;
  is_mine: boolean;
  read_by_other: boolean;
  // client-side
  pending?: boolean;
  failed?: boolean;
  idempotency_key?: string;
}

export interface MessagesPageResponse {
  messages: Message[];
  has_more: boolean;
}

export interface MessageCreate {
  content: string;
  idempotency_key: string;
  client_timestamp?: string;
}

export interface ConversationCreate {
  other_username: string;
}

export type WsChatEventType =
  | 'pong'
  | 'new_message'
  | 'message_deleted'
  | 'messages_read'
  | 'typing'
  | 'presence_update';

export interface WsChatEvent {
  type: WsChatEventType;
  conversation_id?: string;
  message?: Message;
  message_id?: string;
  reader_id?: string;
  read_at?: string;
  user_id?: string;
  is_online?: boolean;
}
