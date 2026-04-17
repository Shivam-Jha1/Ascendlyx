# Chat & Messaging — Backend Implementation

## Overview

Real-time private messaging between friends with an AI Coach powered by Anthropic Claude. Built on FastAPI with WebSocket support, Redis-based presence tracking, and cursor-based pagination.

---

## Database Tables (Migration `d4e5f6a7b8c9`)

| Table | Purpose |
|---|---|
| `conversations` | 1-to-1 threads; `participant_one < participant_two` (UUID lexicographic order); unique constraint on `(p1, p2)` |
| `messages` | Text messages with soft-delete, idempotency key (unique), max 1000 chars |
| `message_read_receipts` | Tracks which messages a user has read; unique `(message_id, reader_id)` |
| `ai_coach_sessions` | Per-user session metadata for AI Coach (message count, context refresh) |

A **system user** (`00000000-0000-4000-8000-000000000001`, username `ai_coach`) is seeded by the migration for AI Coach conversations.

---

## Services

### `MessagingService`
- Friendship & block checks on every operation
- Conversation creation with rate limit (10/hr via Redis sorted sets)
- Message sending with rate limit (30/min), HTML stripping, idempotency dedup
- Cursor-based pagination (oldest-first, ISO datetime cursor)
- Soft delete (sender-only)
- Bulk read receipt creation (skips own messages)

### `AICoachService`
- Auto-creates conversation + session on first use
- Rate limit: 20 messages/hr
- Builds context concurrently (streak, habits, goals, AI score)
- Calls Anthropic API (`claude-sonnet-4-20250514`, 10s timeout)
- Fallback message on any API error
- Returns `[user_message, ai_response]` pair

### `PresenceService`
- Redis keys with 35s TTL for online status
- `set_online`, `set_offline`, `refresh_presence`, `is_online`, `get_online_status_bulk` (pipelined)

---

## API Endpoints

Base path: `/api/v1`

### Conversations

| Method | Path | Status | Description |
|---|---|---|---|
| `GET` | `/conversations` | 200 | List all conversations with last message preview, unread count, online status |
| `POST` | `/conversations` | 201 | Start or get existing conversation with a friend (by username) |

### Messages

| Method | Path | Status | Description |
|---|---|---|---|
| `GET` | `/conversations/{id}/messages` | 200 | Paginated messages (cursor-based). Auto-marks conversation as read |
| `POST` | `/conversations/{id}/messages` | 201 | Send a message. Requires `idempotency_key` (UUID). HTML is stripped |
| `DELETE` | `/conversations/{id}/messages/{id}` | 204 | Soft-delete own message. Other user sees "This message was deleted" |

### Read Receipts

| Method | Path | Status | Description |
|---|---|---|---|
| `POST` | `/conversations/{id}/read` | 204 | Mark all messages in conversation as read |

### AI Coach

| Method | Path | Status | Description |
|---|---|---|---|
| `GET` | `/ai-coach` | 200 | Get or create AI Coach conversation |
| `POST` | `/ai-coach/messages` | 201 | Send message to AI Coach; returns `[user_msg, ai_reply]` |

---

## WebSocket

**Endpoint:** `ws://host/api/v1/ws/messages?token=<JWT>`

### Client → Server

| Type | Payload | Effect |
|---|---|---|
| `ping` | `{}` | Refreshes presence TTL; replies `pong` |
| `typing` | `{ conversation_id }` | Forwards typing indicator to other participant |

### Server → Client

| Type | Payload | Trigger |
|---|---|---|
| `pong` | `{}` | Response to ping |
| `new_message` | `{ conversation_id, message }` | Other user sent a message |
| `message_deleted` | `{ conversation_id, message_id }` | Other user deleted a message |
| `messages_read` | `{ conversation_id, reader_id, read_at }` | Other user read messages |
| `typing` | `{ conversation_id, user_id }` | Other user is typing |
| `presence_update` | `{ user_id, is_online }` | Friend came online/offline |

---

## Request/Response Schemas

### `ConversationCreate` (input)
```json
{ "other_username": "jane_doe" }
```

### `MessageCreate` (input)
```json
{
  "content": "Hello!",
  "idempotency_key": "550e8400-e29b-41d4-a716-446655440000",
  "client_timestamp": "2026-04-17T10:00:00Z"  // optional
}
```

### `ConversationResponse` (output)
```json
{
  "id": "uuid",
  "other_participant": {
    "user_id": "uuid",
    "name": "Jane Doe",
    "username": "jane_doe",
    "avatar_url": null,
    "avatar_initial": "JD",
    "is_online": true,
    "current_streak": 7
  },
  "last_message": {
    "content": "Hello!",
    "sender_id": "uuid",
    "sent_at": "2026-04-17T10:00:00Z",
    "is_deleted": false
  },
  "unread_count": 2,
  "last_message_at": "2026-04-17T10:00:00Z",
  "is_ai_coach": false
}
```

### `MessageResponse` (output)
```json
{
  "id": "uuid",
  "conversation_id": "uuid",
  "sender_id": "uuid",
  "content": "Hello!",
  "is_deleted": false,
  "created_at": "2026-04-17T10:00:00Z",
  "client_timestamp": null,
  "is_mine": true,
  "read_by_other": false
}
```

### `MessagesPageResponse` (output)
```json
{
  "messages": [ ... ],
  "has_more": true
}
```

Query params: `?cursor=<ISO datetime>&page_size=30` (max 50)

---

## Security

- JWT required on all endpoints + WebSocket (`?token=` query param)
- Friendship verified before conversation creation and messaging
- Block check on every message send
- HTML tags stripped from message content (XSS prevention)
- Rate limiting via Redis sliding-window sorted sets
- Idempotency keys prevent duplicate messages
- Soft delete preserves audit trail
- System user excluded from user search results

---

## Files Created

| File | Purpose |
|---|---|
| `app/models/conversation.py` | Conversation model |
| `app/models/message.py` | Message model |
| `app/models/read_receipt.py` | Read receipt model |
| `app/models/ai_coach_session.py` | AI Coach session model |
| `app/schemas/messaging.py` | Pydantic input/output schemas |
| `app/services/messaging_service.py` | Core messaging logic |
| `app/services/ai_coach_service.py` | AI Coach with Anthropic API |
| `app/services/presence_service.py` | Redis online presence |
| `app/api/v1/messaging.py` | HTTP routes |
| `app/api/v1/ws_messaging.py` | WebSocket endpoint + connection manager |
| `tests/test_messaging.py` | 16 tests (all passing) |
| `alembic/versions/d4e5f6a7b8c9_...py` | Migration + system user seed |
