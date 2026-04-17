import { Injectable, NgZone, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { EMPTY, catchError, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Conversation,
  Message,
  MessagesPageResponse,
  MessageCreate,
  WsChatEvent,
} from '../models/chat.model';
import { AuthService } from './auth.service';

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly ngZone = inject(NgZone);
  private readonly base = environment.apiBaseUrl;

  // ── State signals ──
  readonly conversations = signal<Conversation[]>([]);
  readonly activeConversationId = signal<string | null>(null);
  readonly messages = signal<Message[]>([]);
  readonly hasMoreMessages = signal<boolean>(false);
  readonly isLoadingConversations = signal<boolean>(false);
  readonly isLoadingMessages = signal<boolean>(false);
  readonly isLoadingOlder = signal<boolean>(false);
  readonly isAiReplying = signal<boolean>(false);
  readonly isLive = signal<boolean>(false);
  readonly chatError = signal<string | null>(null);
  readonly newConvUsername = signal<string>('');
  readonly isStartingConv = signal<boolean>(false);
  readonly startConvError = signal<string | null>(null);

  readonly activeConversation = computed<Conversation | null>(() =>
    this.conversations().find(c => c.id === this.activeConversationId()) ?? null
  );

  // ── WebSocket internals ──
  private ws: WebSocket | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectDelay = 30_000;
  private shouldReconnect = false;
  private messageCursor: string | null = null;
  private typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

  // ── Conversations ──
  loadConversations(): void {
    this.isLoadingConversations.set(true);
    this.http.get<Conversation[]>(`${this.base}/conversations`).pipe(
      tap(list => {
        this.conversations.set(this.sortConversations(list));
        this.isLoadingConversations.set(false);
      }),
      catchError((err: HttpErrorResponse) => {
        this.chatError.set(this.extractMsg(err));
        this.isLoadingConversations.set(false);
        return EMPTY;
      })
    ).subscribe();
  }

  selectConversation(convId: string): void {
    if (this.activeConversationId() === convId) return;
    this.activeConversationId.set(convId);
    this.messages.set([]);
    this.messageCursor = null;
    this.hasMoreMessages.set(false);
    this.loadMessages(convId, true);
  }

  startConversation(username: string): void {
    if (!username.trim() || this.isStartingConv()) return;
    this.isStartingConv.set(true);
    this.startConvError.set(null);
    this.http.post<Conversation>(`${this.base}/conversations`, { other_username: username.trim() }).pipe(
      tap(conv => {
        this.isStartingConv.set(false);
        this.newConvUsername.set('');
        this.conversations.update(prev => {
          const exists = prev.some(c => c.id === conv.id);
          return exists ? prev : this.sortConversations([conv, ...prev]);
        });
        this.selectConversation(conv.id);
      }),
      catchError((err: HttpErrorResponse) => {
        this.isStartingConv.set(false);
        this.startConvError.set(this.extractMsg(err));
        return EMPTY;
      })
    ).subscribe();
  }

  // ── Messages ──
  loadMessages(convId: string, reset: boolean): void {
    if (reset) {
      this.isLoadingMessages.set(true);
      this.messageCursor = null;
    } else {
      this.isLoadingOlder.set(true);
    }

    const params: Record<string, string> = { page_size: '30' };
    if (!reset && this.messageCursor) params['cursor'] = this.messageCursor;

    this.http.get<MessagesPageResponse>(`${this.base}/conversations/${convId}/messages`, { params }).pipe(
      tap(res => {
        const msgs = res.messages;
        if (reset) {
          this.messages.set(msgs);
        } else {
          this.messages.update(prev => [...msgs, ...prev]);
        }
        this.hasMoreMessages.set(res.has_more);
        if (msgs.length > 0) this.messageCursor = msgs[0].created_at;
        this.isLoadingMessages.set(false);
        this.isLoadingOlder.set(false);
        this.markRead(convId);
      }),
      catchError(() => {
        this.isLoadingMessages.set(false);
        this.isLoadingOlder.set(false);
        return EMPTY;
      })
    ).subscribe();
  }

  loadOlderMessages(): void {
    const convId = this.activeConversationId();
    if (!convId || !this.hasMoreMessages() || this.isLoadingOlder()) return;
    this.loadMessages(convId, false);
  }

  sendMessage(convId: string, content: string): void {
    const trimmed = content.trim();
    if (!trimmed) return;

    const key = uuidv4();
    const tempId = `temp-${key}`;
    const now = new Date().toISOString();
    const optimistic: Message = {
      id: tempId,
      conversation_id: convId,
      sender_id: this.authService.getCurrentUserId() ?? '',
      content: trimmed,
      is_deleted: false,
      created_at: now,
      is_mine: true,
      read_by_other: false,
      pending: true,
      idempotency_key: key,
    };

    this.messages.update(prev => [...prev, optimistic]);
    this.updateConvLastMessage(convId, optimistic);

    const payload: MessageCreate = { content: trimmed, idempotency_key: key, client_timestamp: now };
    this.http.post<Message>(`${this.base}/conversations/${convId}/messages`, payload).pipe(
      tap(msg => {
        this.messages.update(prev => prev.map(m => m.id === tempId ? { ...msg, pending: false } : m));
        this.updateConvLastMessage(convId, msg);
      }),
      catchError(() => {
        this.messages.update(prev => prev.map(m => m.id === tempId ? { ...m, pending: false, failed: true } : m));
        return EMPTY;
      })
    ).subscribe();
  }

  deleteMessage(convId: string, msgId: string): void {
    this.http.delete<void>(`${this.base}/conversations/${convId}/messages/${msgId}`).pipe(
      tap(() => {
        this.messages.update(prev =>
          prev.map(m => m.id === msgId
            ? { ...m, is_deleted: true, content: 'This message was deleted' }
            : m
          )
        );
      }),
      catchError(() => EMPTY)
    ).subscribe();
  }

  markRead(convId: string): void {
    this.http.post<void>(`${this.base}/conversations/${convId}/read`, {}).pipe(
      tap(() => {
        this.conversations.update(prev =>
          prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c)
        );
      }),
      catchError(() => EMPTY)
    ).subscribe();
  }

  // ── AI Coach ──
  loadAiCoach(): void {
    this.http.get<Conversation>(`${this.base}/ai-coach`).pipe(
      tap(conv => {
        this.conversations.update(prev =>
          prev.some(c => c.id === conv.id) ? prev : this.sortConversations([conv, ...prev])
        );
      }),
      catchError(() => EMPTY)
    ).subscribe();
  }

  sendAiCoachMessage(convId: string, content: string): void {
    const trimmed = content.trim();
    if (!trimmed || this.isAiReplying()) return;

    const key = uuidv4();
    const tempId = `temp-${key}`;
    const now = new Date().toISOString();
    const optimistic: Message = {
      id: tempId,
      conversation_id: convId,
      sender_id: this.authService.getCurrentUserId() ?? '',
      content: trimmed,
      is_deleted: false,
      created_at: now,
      is_mine: true,
      read_by_other: true,
      pending: true,
    };

    this.messages.update(prev => [...prev, optimistic]);
    this.isAiReplying.set(true);

    this.http.post<Message[]>(`${this.base}/ai-coach/messages`, { content: trimmed, idempotency_key: key }).pipe(
      tap(pair => {
        const [userMsg, aiMsg] = pair;
        this.messages.update(prev => [
          ...prev.filter(m => m.id !== tempId),
          { ...userMsg, pending: false },
          aiMsg,
        ]);
        this.isAiReplying.set(false);
        this.updateConvLastMessage(convId, aiMsg);
      }),
      catchError(() => {
        this.messages.update(prev =>
          prev.map(m => m.id === tempId ? { ...m, pending: false, failed: true } : m)
        );
        this.isAiReplying.set(false);
        return EMPTY;
      })
    ).subscribe();
  }

  // ── Typing ──
  sendTyping(convId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'typing', conversation_id: convId }));
    }
  }

  // ── WebSocket ──
  connectWebSocket(): void {
    this.shouldReconnect = true;
    this.doConnect();
  }

  disconnectWebSocket(): void {
    this.shouldReconnect = false;
    this.stopPing();
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.ws?.close();
    this.ws = null;
    this.isLive.set(false);
  }

  private doConnect(): void {
    const token = this.authService.getAccessToken();
    if (!token || this.ws) return;

    const wsUrl = environment.apiBaseUrl.replace(/^http/, 'ws').replace('/api/v1', '') + '/api/v1/ws/messages';
    this.ws = new WebSocket(`${wsUrl}?token=${encodeURIComponent(token)}`);

    this.ws.onopen = (): void => {
      this.isLive.set(true);
      this.reconnectAttempts = 0;
      this.startPing();
    };
    this.ws.onmessage = (ev: MessageEvent): void => {
      try {
        const event = JSON.parse(ev.data as string) as WsChatEvent;
        this.ngZone.run(() => this.handleWsEvent(event));
      } catch { /* ignore */ }
    };
    this.ws.onclose = (): void => {
      this.isLive.set(false);
      this.stopPing();
      this.ws = null;
      if (this.shouldReconnect) this.scheduleReconnect();
    };
    this.ws.onerror = (): void => {
      this.isLive.set(false);
      this.stopPing();
      const s = this.ws; this.ws = null; s?.close();
    };
  }

  private startPing(): void {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25_000);
  }

  private stopPing(): void {
    if (this.pingInterval) { clearInterval(this.pingInterval); this.pingInterval = null; }
  }

  private scheduleReconnect(): void {
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => { this.reconnectTimer = null; this.doConnect(); }, delay);
  }

  private handleWsEvent(event: WsChatEvent): void {
    switch (event.type) {
      case 'new_message': {
        if (!event.conversation_id || !event.message) break;
        const msg = event.message;
        if (msg.is_mine) break; // self-echo guard

        const convId = event.conversation_id;
        const convKnown = this.conversations().some(c => c.id === convId);

        if (!convKnown) {
          // First-ever message in this conversation — fetch the full list so
          // the new conversation appears with proper participant info.
          this.loadConversations();
        } else {
          this.updateConvLastMessage(convId, msg);
          if (this.activeConversationId() !== convId) {
            this.conversations.update(prev =>
              prev.map(c => c.id === convId
                ? { ...c, unread_count: (c.unread_count ?? 0) + 1 }
                : c
              )
            );
          }
        }

        if (this.activeConversationId() === convId) {
          this.messages.update(prev =>
            prev.some(m => m.id === msg.id) ? prev : [...prev, msg]
          );
          this.markRead(convId);
        }
        break;
      }
      case 'message_deleted': {
        if (!event.message_id) break;
        this.messages.update(prev =>
          prev.map(m => m.id === event.message_id
            ? { ...m, is_deleted: true, content: 'This message was deleted' }
            : m
          )
        );
        break;
      }
      case 'messages_read': {
        if (!event.conversation_id) break;
        if (this.activeConversationId() === event.conversation_id) {
          this.messages.update(prev => prev.map(m => m.is_mine ? { ...m, read_by_other: true } : m));
        }
        break;
      }
      case 'typing': {
        if (!event.conversation_id) break;
        this.conversations.update(prev =>
          prev.map(c => c.id === event.conversation_id ? { ...c, typingIndicator: true } : c)
        );
        const existing = this.typingTimers.get(event.conversation_id);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(() => {
          this.conversations.update(prev =>
            prev.map(c => c.id === event.conversation_id ? { ...c, typingIndicator: false } : c)
          );
          this.typingTimers.delete(event.conversation_id!);
        }, 3000);
        this.typingTimers.set(event.conversation_id, timer);
        break;
      }
      case 'presence_update': {
        if (!event.user_id) break;
        this.conversations.update(prev =>
          prev.map(c =>
            c.other_participant.user_id === event.user_id
              ? { ...c, other_participant: { ...c.other_participant, is_online: event.is_online ?? false } }
              : c
          )
        );
        break;
      }
    }
  }

  private updateConvLastMessage(convId: string, msg: Message): void {
    this.conversations.update(prev =>
      this.sortConversations(prev.map(c =>
        c.id !== convId ? c : {
          ...c,
          last_message: { content: msg.content, sender_id: msg.sender_id, sent_at: msg.created_at, is_deleted: msg.is_deleted },
          last_message_at: msg.created_at,
          typingIndicator: false,
        }
      ))
    );
  }

  private sortConversations(list: Conversation[]): Conversation[] {
    return [...list].sort((a, b) => {
      if (a.is_ai_coach) return -1;
      if (b.is_ai_coach) return 1;
      return (b.last_message_at ?? '').localeCompare(a.last_message_at ?? '');
    });
  }

  private extractMsg(err: HttpErrorResponse): string {
    if (err.error?.detail) return err.error.detail;
    if (err.status === 0) return 'Network error. Please check your connection.';
    return `Error ${err.status}: ${err.statusText || 'Unknown error'}`;
  }
}
