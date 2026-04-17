import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewChecked,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ChatService } from '../../core/services/chat.service';
import { Conversation, Message } from '../../core/models/chat.model';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [],
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatPage implements OnInit, OnDestroy, AfterViewChecked {
  protected readonly chatService = inject(ChatService);

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('msgInput') private messageInputRef!: ElementRef<HTMLTextAreaElement>;

  // ── Local UI state ──
  readonly messageInput = signal<string>('');
  readonly showNewConv = signal<boolean>(false);
  readonly deletingMsgId = signal<string | null>(null);

  // ── Shorthand aliases ──
  readonly conversations = this.chatService.conversations;
  readonly activeConversation = this.chatService.activeConversation;
  readonly activeConversationId = this.chatService.activeConversationId;
  readonly messages = this.chatService.messages;
  readonly hasMoreMessages = this.chatService.hasMoreMessages;
  readonly isLoadingConversations = this.chatService.isLoadingConversations;
  readonly isLoadingMessages = this.chatService.isLoadingMessages;
  readonly isLoadingOlder = this.chatService.isLoadingOlder;
  readonly isAiReplying = this.chatService.isAiReplying;
  readonly isLive = this.chatService.isLive;
  readonly chatError = this.chatService.chatError;
  readonly newConvUsername = this.chatService.newConvUsername;
  readonly isStartingConv = this.chatService.isStartingConv;
  readonly startConvError = this.chatService.startConvError;

  readonly canSend = computed<boolean>(() =>
    !!this.messageInput().trim() && !this.isAiReplying()
  );

  private shouldScrollToBottom = false;
  private lastMessageCount = 0;
  private typingDebounce: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.chatService.loadConversations();
    this.chatService.loadAiCoach();
    this.chatService.connectWebSocket();
  }

  ngOnDestroy(): void {
    this.chatService.disconnectWebSocket();
    if (this.typingDebounce) clearTimeout(this.typingDebounce);
  }

  ngAfterViewChecked(): void {
    const currentCount = this.messages().length;
    if (this.shouldScrollToBottom || currentCount !== this.lastMessageCount) {
      this.scrollToBottom();
      this.lastMessageCount = currentCount;
      this.shouldScrollToBottom = false;
    }
  }

  // ── Conversation actions ──
  selectConversation(conv: Conversation): void {
    this.shouldScrollToBottom = true;
    this.messageInput.set('');
    this.chatService.selectConversation(conv.id);
  }

  startNewConversation(): void {
    const username = this.newConvUsername().trim();
    if (!username) return;
    this.shouldScrollToBottom = true;
    this.chatService.startConversation(username);
    this.showNewConv.set(false);
  }

  // ── Message actions ──
  onInputChange(value: string): void {
    this.messageInput.set(value);
    const convId = this.activeConversationId();
    if (!convId) return;
    // Debounce typing event: send every 2s max
    if (this.typingDebounce) clearTimeout(this.typingDebounce);
    this.typingDebounce = setTimeout(() => {
      this.chatService.sendTyping(convId);
      this.typingDebounce = null;
    }, 500);
  }

  sendMessage(): void {
    const content = this.messageInput().trim();
    const conv = this.activeConversation();
    if (!content || !conv) return;

    this.messageInput.set('');
    this.shouldScrollToBottom = true;

    if (conv.is_ai_coach) {
      this.chatService.sendAiCoachMessage(conv.id, content);
    } else {
      this.chatService.sendMessage(conv.id, content);
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  deleteMessage(msg: Message): void {
    if (!msg.is_mine || msg.is_deleted || this.deletingMsgId() === msg.id) return;
    const conv = this.activeConversation();
    if (!conv) return;
    this.deletingMsgId.set(msg.id);
    this.chatService.deleteMessage(conv.id, msg.id);
    setTimeout(() => this.deletingMsgId.set(null), 1000);
  }

  // ── Infinite scroll ──
  onMessagesScroll(event: Event): void {
    const el = event.target as HTMLDivElement;
    if (el.scrollTop < 80 && this.hasMoreMessages() && !this.isLoadingOlder()) {
      this.chatService.loadOlderMessages();
    }
  }

  // ── Helpers ──
  formatTime(isoDate: string): string {
    const d = new Date(isoDate);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatConvTime(isoDate: string | null): string {
    if (!isoDate) return '';
    const d = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h`;
    return `${Math.floor(diffHrs / 24)}d`;
  }

  avatarColor(initial: string): string {
    const gradients = [
      'linear-gradient(135deg,#6C63FF,#00C2FF)',
      'linear-gradient(135deg,#22C55E,#00C2FF)',
      'linear-gradient(135deg,#FB923C,#F43F5E)',
      'linear-gradient(135deg,#8B5CF6,#EC4899)',
      'linear-gradient(135deg,#F59E0B,#EF4444)',
      'linear-gradient(135deg,#06B6D4,#6C63FF)',
      'linear-gradient(135deg,#10B981,#6C63FF)',
      'linear-gradient(135deg,#EC4899,#F59E0B)',
    ];
    return gradients[initial.charCodeAt(0) % gradients.length];
  }

  getPlaceholder(): string {
    const conv = this.activeConversation();
    if (!conv) return 'Select a conversation…';
    return conv.is_ai_coach ? 'Ask AI Coach…' : `Message ${conv.other_participant.name}…`;
  }

  trackByConvId(_: number, c: Conversation): string { return c.id; }
  trackByMsgId(_: number, m: Message): string { return m.id; }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch { /* ignore */ }
  }
}
