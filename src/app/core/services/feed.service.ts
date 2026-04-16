import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ActivityPost,
  FeedResponse,
  FriendListResponse,
  FriendListItem,
  FriendSearchResult,
  ReactionRequest,
  ReactionType,
  PostCreatePayload,
  ReplyCreatePayload,
  PostReply,
  WsFeedEvent,
} from '../models/feed.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class FeedService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly base = `${environment.apiBaseUrl}/feed`;

  // ── UI state signals ──
  readonly posts = signal<ActivityPost[]>([]);
  readonly friends = signal<FriendListItem[]>([]);
  readonly friendsTotal = signal<number>(0);
  readonly searchResults = signal<FriendSearchResult[]>([]);
  readonly isLoadingFeed = signal<boolean>(false);
  readonly isLoadingFriends = signal<boolean>(false);
  readonly feedError = signal<string | null>(null);
  readonly hasMore = signal<boolean>(false);
  readonly isLive = signal<boolean>(false);

  private page = 1;
  private ws: WebSocket | null = null;

  // ── Feed ──
  loadFeed(reset = true): void {
    if (reset) {
      this.page = 1;
      this.posts.set([]);
    }
    this.isLoadingFeed.set(true);
    this.feedError.set(null);

    this.http
      .get<FeedResponse>(`${this.base}`, { params: { page: this.page, per_page: 10 } })
      .pipe(
        tap(res => {
          const mapped = res.posts.map(p => ({ ...p, showReplies: false, replyLoading: false, replies: [] }));
          this.posts.update(prev => (reset ? mapped : [...prev, ...mapped]));
          this.hasMore.set(res.has_more);
          this.isLoadingFeed.set(false);
        }),
        catchError((err: HttpErrorResponse) => {
          this.feedError.set(this.extractMsg(err));
          this.isLoadingFeed.set(false);
          return throwError(() => err);
        })
      )
      .subscribe();
  }

  loadMore(): void {
    this.page++;
    this.loadFeed(false);
  }

  // ── Create post ──
  createPost(payload: PostCreatePayload): Observable<ActivityPost> {
    return this.http.post<ActivityPost>(`${this.base}/posts`, payload).pipe(
      tap(post => {
        const enriched = { ...post, showReplies: false, replyLoading: false, replies: [] };
        this.posts.update(prev => [enriched, ...prev]);
      }),
      catchError((err: HttpErrorResponse) => throwError(() => err))
    );
  }

  // ── Delete post ──
  deletePost(postId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/posts/${postId}`).pipe(
      tap(() => {
        this.posts.update(prev => prev.filter(p => p.id !== postId));
      }),
      catchError((err: HttpErrorResponse) => throwError(() => err))
    );
  }

  // ── React ──
  toggleReaction(postId: string, reactionType: ReactionType): Observable<ActivityPost> {
    const body: ReactionRequest = { reaction_type: reactionType };
    return this.http.post<ActivityPost>(`${this.base}/posts/${postId}/react`, body).pipe(
      tap(updated => {
        this.posts.update(prev =>
          prev.map(p => (p.id === postId ? { ...p, reactions: updated.reactions, user_reaction: updated.user_reaction ?? null } : p))
        );
      }),
      catchError((err: HttpErrorResponse) => throwError(() => err))
    );
  }

  // ── Replies ──
  loadReplies(postId: string): Observable<PostReply[]> {
    this.posts.update(prev =>
      prev.map(p => (p.id === postId ? { ...p, replyLoading: true } : p))
    );
    return this.http.get<PostReply[]>(`${this.base}/posts/${postId}/replies`).pipe(
      tap(replies => {
        this.posts.update(prev =>
          prev.map(p =>
            p.id === postId ? { ...p, replies, showReplies: true, replyLoading: false } : p
          )
        );
      }),
      catchError((err: HttpErrorResponse) => {
        this.posts.update(prev =>
          prev.map(p => (p.id === postId ? { ...p, replyLoading: false } : p))
        );
        return throwError(() => err);
      })
    );
  }

  addReply(postId: string, payload: ReplyCreatePayload): Observable<PostReply> {
    return this.http.post<PostReply>(`${this.base}/posts/${postId}/replies`, payload).pipe(
      tap(reply => {
        this.posts.update(prev =>
          prev.map(p =>
            p.id === postId
              ? { ...p, reply_count: p.reply_count + 1, replies: [...(p.replies ?? []), reply] }
              : p
          )
        );
      }),
      catchError((err: HttpErrorResponse) => throwError(() => err))
    );
  }

  toggleReplies(postId: string): void {
    const post = this.posts().find(p => p.id === postId);
    if (!post) return;

    if (post.showReplies) {
      this.posts.update(prev => prev.map(p => (p.id === postId ? { ...p, showReplies: false } : p)));
    } else if ((post.replies ?? []).length > 0) {
      this.posts.update(prev => prev.map(p => (p.id === postId ? { ...p, showReplies: true } : p)));
    } else {
      this.loadReplies(postId).subscribe();
    }
  }

  // ── Friends ──
  loadFriends(): void {
    this.isLoadingFriends.set(true);
    this.http
      .get<FriendListItem[] | FriendListResponse>(`${this.base}/friends`)
      .pipe(
        tap(res => {
          const list: FriendListItem[] = Array.isArray(res) ? res : (res as FriendListResponse).friends ?? [];
          const total = Array.isArray(res) ? list.length : (res as FriendListResponse).total ?? list.length;
          this.friends.set(list);
          this.friendsTotal.set(total);
          this.isLoadingFriends.set(false);
        }),
        catchError((err: HttpErrorResponse) => {
          this.isLoadingFriends.set(false);
          return throwError(() => err);
        })
      )
      .subscribe();
  }

  searchUsers(query: string): void {
    if (query.length < 2) {
      this.searchResults.set([]);
      return;
    }
    this.http
      .get<FriendSearchResult[]>(`${this.base}/friends/search`, { params: { q: query } })
      .pipe(
        tap(results => this.searchResults.set(results)),
        catchError(() => {
          this.searchResults.set([]);
          return [];
        })
      )
      .subscribe();
  }

  sendFriendRequest(username: string): Observable<unknown> {
    return this.http
      .post(`${environment.apiBaseUrl}/friends/request/${username}`, {})
      .pipe(catchError((err: HttpErrorResponse) => throwError(() => err)));
  }

  acceptFriendRequest(requesterUsername: string): Observable<unknown> {
    return this.http
      .patch(`${environment.apiBaseUrl}/friends/request/${requesterUsername}`, { action: 'accept' })
      .pipe(catchError((err: HttpErrorResponse) => throwError(() => err)));
  }

  // ── WebSocket ──
  connectWebSocket(): void {
    const token = this.authService.getAccessToken();
    if (!token || this.ws) return;

    const wsUrl = environment.apiBaseUrl
      .replace(/^http/, 'ws')
      .replace('/api/v1', '') + '/api/v1/ws/feed';

    this.ws = new WebSocket(`${wsUrl}?token=${token}`);

    this.ws.onopen = (): void => {
      this.isLive.set(true);
    };

    this.ws.onmessage = (event: MessageEvent): void => {
      try {
        const data = JSON.parse(event.data as string) as WsFeedEvent;
        this.handleWsEvent(data);
      } catch { /* ignore malformed */ }
    };

    this.ws.onclose = (): void => {
      this.isLive.set(false);
      this.ws = null;
    };

    this.ws.onerror = (): void => {
      this.isLive.set(false);
    };
  }

  disconnectWebSocket(): void {
    this.ws?.close();
    this.ws = null;
    this.isLive.set(false);
  }

  private handleWsEvent(event: WsFeedEvent): void {
    switch (event.type) {
      case 'new_post': {
        if (!event.post) break;
        const enriched = { ...event.post, showReplies: false, replyLoading: false, replies: [] };
        this.posts.update(prev =>
          prev.some(p => p.id === enriched.id) ? prev : [enriched, ...prev]
        );
        break;
      }
      case 'post_deleted': {
        if (!event.post_id) break;
        this.posts.update(prev => prev.filter(p => p.id !== event.post_id));
        break;
      }
      case 'reaction_update': {
        if (!event.post_id || !event.reactions) break;
        this.posts.update(prev =>
          prev.map(p => p.id === event.post_id ? { ...p, reactions: event.reactions! } : p)
        );
        break;
      }
      case 'new_reply': {
        if (!event.post_id || !event.reply) break;
        this.posts.update(prev =>
          prev.map(p => {
            if (p.id !== event.post_id) return p;
            const alreadyHas = (p.replies ?? []).some(r => r.id === event.reply!.id);
            return alreadyHas ? p : {
              ...p,
              reply_count: p.reply_count + 1,
              replies: [...(p.replies ?? []), event.reply!],
              showReplies: true,
            };
          })
        );
        break;
      }
      case 'reply_deleted': {
        if (!event.post_id || !event.reply_id) break;
        this.posts.update(prev =>
          prev.map(p =>
            p.id !== event.post_id ? p : {
              ...p,
              reply_count: Math.max(0, p.reply_count - 1),
              replies: (p.replies ?? []).filter(r => r.id !== event.reply_id),
            }
          )
        );
        break;
      }
    }
  }

  private extractMsg(err: HttpErrorResponse): string {
    if (err.error?.detail) return err.error.detail;
    if (err.status === 0) return 'Network error. Please check your connection.';
    return `Error ${err.status}: ${err.statusText || 'Unknown error'}`;
  }
}
