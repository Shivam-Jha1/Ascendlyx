import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FeedService } from '../../core/services/feed.service';
import {
  ActivityPost,
  FriendListItem,
  FriendSearchResult,
  ReactionType,
  REACTION_META,
} from '../../core/models/feed.model';

@Component({
  selector: 'app-friends-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './friends.page.html',
  styleUrls: ['./friends.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FriendsPage implements OnInit, OnDestroy {
  protected readonly feedService = inject(FeedService);

  // ── Service signals (exposed to template) ──
  readonly posts = this.feedService.posts;
  readonly friends = this.feedService.friends;
  readonly friendsTotal = this.feedService.friendsTotal;
  readonly searchResults = this.feedService.searchResults;
  readonly isLoadingFeed = this.feedService.isLoadingFeed;
  readonly isLoadingFriends = this.feedService.isLoadingFriends;
  readonly feedError = this.feedService.feedError;
  readonly hasMore = this.feedService.hasMore;
  readonly isLive = this.feedService.isLive;

  // ── Local UI state ──
  readonly searchQuery = signal<string>('');
  readonly isSearching = signal<boolean>(false);
  readonly showCreatePost = signal<boolean>(false);
  readonly newPostContent = signal<string>('');
  readonly isCreatingPost = signal<boolean>(false);
  readonly activeReplyPostId = signal<string | null>(null);
  readonly replyContent = signal<string>('');
  readonly isSendingReply = signal<boolean>(false);
  readonly sendingRequestFor = signal<string | null>(null);

  // ── Computed ──
  readonly visibleFriends = computed<FriendListItem[]>(() =>
    (this.friends() ?? []).slice(0, 5)
  );

  readonly reactionMeta = REACTION_META;

  ngOnInit(): void {
    this.feedService.loadFriends();
    this.feedService.loadFeed();
    this.feedService.connectWebSocket();
  }

  ngOnDestroy(): void {
    this.feedService.disconnectWebSocket();
  }

  // ── Search ──
  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    if (value.length >= 2) {
      this.isSearching.set(true);
      this.feedService.searchUsers(value);
      setTimeout(() => this.isSearching.set(false), 300);
    } else {
      this.feedService.searchResults.set([]);
    }
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.feedService.searchResults.set([]);
  }

  handleFriendAction(user: FriendSearchResult): void {
    if (user.friendship_status === 'pending_received') {
      this.acceptRequest(user);
    } else if (user.friendship_status === 'none') {
      this.sendRequest(user);
    }
  }

  sendRequest(user: FriendSearchResult): void {
    this.sendingRequestFor.set(user.user_id);
    this.feedService.sendFriendRequest(user.username).subscribe({
      next: () => {
        this.sendingRequestFor.set(null);
        this.feedService.searchResults.update(prev =>
          prev.map(u =>
            u.user_id === user.user_id ? { ...u, friendship_status: 'pending_sent' as const } : u
          )
        );
      },
      error: () => this.sendingRequestFor.set(null),
    });
  }

  acceptRequest(user: FriendSearchResult): void {
    this.sendingRequestFor.set(user.user_id);
    this.feedService.acceptFriendRequest(user.username).subscribe({
      next: () => {
        this.sendingRequestFor.set(null);
        this.feedService.searchResults.update(prev =>
          prev.map(u =>
            u.user_id === user.user_id ? { ...u, friendship_status: 'accepted' as const } : u
          )
        );
        this.feedService.loadFriends();
      },
      error: () => this.sendingRequestFor.set(null),
    });
  }

  retryFeed(): void {
    this.feedService.loadFeed();
  }

  loadMore(): void {
    this.feedService.loadMore();
  }

  // ── Post create ──
  submitPost(): void {
    const content = this.newPostContent().trim();
    if (!content || this.isCreatingPost()) return;

    this.isCreatingPost.set(true);
    this.feedService.createPost({ content, post_type: 'manual' }).subscribe({
      next: () => {
        this.newPostContent.set('');
        this.showCreatePost.set(false);
        this.isCreatingPost.set(false);
      },
      error: () => this.isCreatingPost.set(false),
    });
  }

  deletePost(postId: string): void {
    this.feedService.deletePost(postId).subscribe();
  }

  // ── Reactions ──
  react(postId: string, type: ReactionType): void {
    this.feedService.toggleReaction(postId, type).subscribe();
  }

  getReactions(post: ActivityPost): Array<{ type: ReactionType; count: number; active: boolean; emoji: string; label: string }> {
    return post.reactions
      .filter(r => r.count > 0)
      .map(r => ({
        type: r.reaction_type,
        count: r.count,
        active: r.user_reacted,
        emoji: REACTION_META[r.reaction_type].emoji,
        label: REACTION_META[r.reaction_type].label,
      }));
  }

  // ── Replies ──
  toggleReplies(postId: string): void {
    this.feedService.toggleReplies(postId);
    if (this.activeReplyPostId() === postId) {
      this.activeReplyPostId.set(null);
    }
  }

  openReply(postId: string): void {
    this.activeReplyPostId.set(this.activeReplyPostId() === postId ? null : postId);
    if (this.activeReplyPostId() === postId) {
      this.feedService.toggleReplies(postId);
    }
    this.replyContent.set('');
  }

  submitReply(postId: string): void {
    const content = this.replyContent().trim();
    if (!content || this.isSendingReply()) return;

    this.isSendingReply.set(true);
    this.feedService.addReply(postId, { content }).subscribe({
      next: () => {
        this.replyContent.set('');
        this.isSendingReply.set(false);
        this.activeReplyPostId.set(null);
      },
      error: () => this.isSendingReply.set(false),
    });
  }

  // ── Helpers ──
  avatarColor(initial: string): string {
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
      '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
    ];
    const idx = initial.charCodeAt(0) % colors.length;
    return colors[idx];
  }

  friendStatusLabel(status: string): string {
    const map: Record<string, string> = {
      none: '+ Add',
      pending_sent: 'Pending',
      pending_received: 'Accept',
      accepted: 'Friends',
      blocked: 'Blocked',
    };
    return map[status] ?? '+ Add';
  }

  trackByPostId(_: number, post: ActivityPost): string {
    return post.id;
  }

  trackByFriendId(_: number, f: FriendListItem): string {
    return f.user_id;
  }
}
