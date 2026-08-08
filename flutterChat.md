# Flutter Chat Reference — Ascendlyx

Reference document for implementing the **Chat** screen in the Ascendlyx Flutter mobile app. All information is derived directly from the Angular web frontend.

---

## Base URL

| Environment | Base URL |
|-------------|----------|
| Development | `http://localhost:3000/api/v1` |
| Production  | Replace with production domain |

All requests require `Authorization: Bearer <access_token>` header.

---

## API Endpoints

### 1. Get Conversations List

| Property | Value |
|----------|-------|
| Method   | `GET` |
| Endpoint | `/conversations` |
| Auth     | Bearer token required |

**Success response `200`:**
```json
[
  {
    "id": "uuid",
    "other_participant": {
      "user_id": "uuid",
      "name": "John Doe",
      "username": "johndoe",
      "avatar_url": null,
      "avatar_initial": "J",
      "is_online": true,
      "current_streak": 5
    },
    "last_message": {
      "content": "Hey! How are you?",
      "sender_id": "uuid",
      "sent_at": "2026-05-08T14:30:00Z",
      "is_deleted": false
    },
    "unread_count": 2,
    "last_message_at": "2026-05-08T14:30:00Z",
    "is_ai_coach": false
  },
  {
    "id": "uuid",
    "other_participant": {
      "user_id": "system",
      "name": "AI Coach",
      "username": "ai-coach",
      "avatar_url": null,
      "avatar_initial": "A",
      "is_online": true,
      "current_streak": 0
    },
    "last_message": {
      "content": "Great progress! Keep it up!",
      "sender_id": "system",
      "sent_at": "2026-05-08T10:00:00Z",
      "is_deleted": false
    },
    "unread_count": 0,
    "last_message_at": "2026-05-08T10:00:00Z",
    "is_ai_coach": true
  }
]
```

**Sorting:** AI Coach always first, then conversations sorted by `last_message_at` (most recent first).

**Error handling:**
- `error.detail` or `error.message` → display in error banner
- Fallback: `"Failed to load conversations"`

---

### 2. Get AI Coach Conversation

| Property | Value |
|----------|-------|
| Method   | `GET` |
| Endpoint | `/ai-coach` |
| Auth     | Bearer token required |

**Success response `200`:** Single `Conversation` object (AI Coach).

**Purpose:** Ensures AI Coach conversation exists in list. Called on component init.

---

### 3. Start Conversation

| Property | Value |
|----------|-------|
| Method   | `POST` |
| Endpoint | `/conversations` |
| Auth     | Bearer token required |

**Request body:**
```json
{
  "other_username": "johndoe"
}
```

**Field notes:**
- `other_username`: required, username of friend to message (trimmed)

**Success response `200`:** New `Conversation` object, added to conversations list and selected.

**Error handling:**
- User not found → `error.detail`
- Already have conversation → returns existing conversation
- Display error under start conversation form

---

### 4. Get Messages (Paginated with Cursor)

| Property | Value |
|----------|-------|
| Method   | `GET` |
| Endpoint | `/conversations/{conversationId}/messages` |
| Auth     | Bearer token required |

**Query parameters:**
- `page_size` — integer (default: 30)
- `cursor` — string, optional (cursor from previous page's first message's `created_at` timestamp)

**Success response `200`:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "conversation_id": "uuid",
      "sender_id": "uuid",
      "content": "Hey! How are you?",
      "is_deleted": false,
      "created_at": "2026-05-08T14:30:00Z",
      "client_timestamp": "2026-05-08T14:30:00Z",
      "is_mine": true,
      "read_by_other": true
    }
  ],
  "has_more": true
}
```

**Fields:**
- `messages`: array, ordered newest first (page 1 has latest messages)
- `has_more`: boolean — indicates if more older pages available
- `client_timestamp`: sent by client, may be null

**Pagination flow:**
1. Initial load: no cursor, returns latest 30 messages
2. Load older: cursor = `first_message.created_at` from previous response
3. Repeat until `has_more === false`

**Error handling:**
- Silently fail (don't load older messages if error)

---

### 5. Send Message

| Property | Value |
|----------|-------|
| Method   | `POST` |
| Endpoint | `/conversations/{conversationId}/messages` |
| Auth     | Bearer token required |

**Request body:**
```json
{
  "content": "Hey! How are you?",
  "idempotency_key": "uuid-v4",
  "client_timestamp": "2026-05-08T14:30:00Z"
}
```

**Field notes:**
- `content`: required, max 1000 characters (trimmed)
- `idempotency_key`: unique UUID per message sent; prevents duplicates if request retried
- `client_timestamp`: ISO 8601 timestamp when sent from client

**Success response `200`:**
```json
{
  "id": "uuid",
  "conversation_id": "uuid",
  "sender_id": "uuid",
  "content": "Hey! How are you?",
  "is_deleted": false,
  "created_at": "2026-05-08T14:30:00Z",
  "is_mine": true,
  "read_by_other": false
}
```

**Optimistic update:**
- Before sending: add temp message with `id: "temp-{key}"` and `pending: true` to messages list
- On success: replace temp message with real message (update id, set `pending: false`)
- On failure: mark message `failed: true`, keep in list with visual error state

**Message list update:** Append to messages list, scroll to bottom.

---

### 6. Delete Message

| Property | Value |
|----------|-------|
| Method   | `DELETE` |
| Endpoint | `/conversations/{conversationId}/messages/{messageId}` |
| Auth     | Bearer token required |

**Success response `200`:** Empty body.

**UI update:** Mark message `is_deleted: true`, replace content with `"This message was deleted"`.

**Permissions:** Only user's own messages can be deleted. Validated on backend.

---

### 7. Mark Conversation as Read

| Property | Value |
|----------|-------|
| Method   | `POST` |
| Endpoint | `/conversations/{conversationId}/read` |
| Auth     | Bearer token required |

**Request body:** Empty object `{}`

**Success response `200`:** Empty body.

**UI update:** Set conversation's `unread_count` to `0`.

**Automatic trigger:** Called after loading messages for active conversation.

---

### 8. Send Message to AI Coach

| Property | Value |
|----------|-------|
| Method   | `POST` |
| Endpoint | `/ai-coach/messages` |
| Auth     | Bearer token required |

**Request body:**
```json
{
  "content": "What should I do today?",
  "idempotency_key": "uuid-v4"
}
```

**Field notes:**
- `content`: required, max 1000 characters (trimmed)
- `idempotency_key`: UUID for idempotency

**Success response `200`:**
```json
[
  {
    "id": "user-msg-uuid",
    "conversation_id": "ai-coach-conv-id",
    "sender_id": "current-user-id",
    "content": "What should I do today?",
    "is_deleted": false,
    "created_at": "2026-05-08T14:30:00Z",
    "is_mine": true,
    "read_by_other": true
  },
  {
    "id": "ai-msg-uuid",
    "conversation_id": "ai-coach-conv-id",
    "sender_id": "system",
    "content": "Based on your habits and goals, I recommend...",
    "is_deleted": false,
    "created_at": "2026-05-08T14:30:01Z",
    "is_mine": false,
    "read_by_other": true
  }
]
```

**Returns:** Array of two messages: [user_message, ai_response]

**Optimistic update:**
- Show user message immediately with `pending: true`
- Set `isAiReplying = true` to disable send button and disable input
- On success: replace user message temp id, add AI response message, set `isAiReplying = false`
- On failure: mark user message `failed: true`, set `isAiReplying = false`

**UI behavior:** While `isAiReplying === true`, show typing indicator under AI Coach avatar.

---

## WebSocket Connection

### Connection

**Endpoint (WebSocket):**
```
ws://localhost:3000/api/v1/ws/messages?token={access_token}
```

(Use `wss://` for HTTPS environments)

**Token:** Access token from login, URL-encoded and passed as query parameter.

**Connection lifecycle:**
- On successful connection: `isLive = true` (show "Live" indicator in header)
- On disconnect/error: `isLive = false` (show "Connecting...")
- Auto-reconnect: Exponential backoff (1s, 2s, 4s, ... max 30s)
- Ping every 25 seconds to keep connection alive

---

### WebSocket Events

**Event structure:**
```json
{
  "type": "new_message" | "message_deleted" | "messages_read" | "typing" | "presence_update" | "pong",
  "conversation_id": "uuid",
  "message": { /* Message */ },
  "message_id": "uuid",
  "user_id": "uuid",
  "is_online": true | false
}
```

#### Event: `new_message`
- **Payload fields:** `type`, `conversation_id`, `message`
- **Action:** Add message to messages list (if viewing that conversation)
- **Action:** Update conversation's `last_message` and `last_message_at` (sort conversations)
- **UI update:** Message appears in real-time
- **Echo guard:** If `message.is_mine === true`, skip processing (self-sent, already in list)
- **Unread handling:** If viewing conversation, mark as read. If not viewing, increment `unread_count`

#### Event: `message_deleted`
- **Payload fields:** `type`, `conversation_id`, `message_id`
- **Action:** Mark message `is_deleted: true`, set content to `"This message was deleted"`
- **Action:** If deleted message was `last_message`, refresh conversation list to get new preview
- **UI update:** Message updates in-place or may reload conversation preview

#### Event: `messages_read`
- **Payload fields:** `type`, `conversation_id`
- **Action:** If viewing that conversation, mark all own messages as `read_by_other: true`
- **UI update:** Change all own message status icons to double-check (read receipt)

#### Event: `typing`
- **Payload fields:** `type`, `conversation_id`
- **Action:** Set conversation `typingIndicator: true`
- **Timer:** After 3 seconds of no new typing events, set `typingIndicator: false`
- **UI update:** Show "typing..." bubble under other participant's avatar
- **Debounce:** Client debounces sending typing events to max once per 500ms

#### Event: `presence_update`
- **Payload fields:** `type`, `user_id`, `is_online`
- **Action:** Update participant's `is_online` status in all conversations with that user
- **UI update:** Online/offline indicator in conversation list item and chat header

#### Event: `pong`
- **Payload fields:** `type`
- **Action:** Response to client's ping, no UI action
- **Purpose:** Keepalive/heartbeat confirmation

---

## Data Model Shapes

### Conversation
```json
{
  "id": "uuid",
  "other_participant": {
    "user_id": "uuid",
    "name": "John Doe",
    "username": "johndoe",
    "avatar_url": null,
    "avatar_initial": "J",
    "is_online": true,
    "current_streak": 5
  },
  "last_message": {
    "content": "Hey! How are you?",
    "sender_id": "uuid",
    "sent_at": "2026-05-08T14:30:00Z",
    "is_deleted": false
  },
  "unread_count": 2,
  "last_message_at": "2026-05-08T14:30:00Z",
  "is_ai_coach": false,
  "typingIndicator": false
}
```

**Client-side fields:**
- `typingIndicator`: boolean (added by UI, not from API)

---

### Message
```json
{
  "id": "uuid",
  "conversation_id": "uuid",
  "sender_id": "uuid",
  "content": "Hey! How are you?",
  "is_deleted": false,
  "created_at": "2026-05-08T14:30:00Z",
  "client_timestamp": "2026-05-08T14:30:00Z",
  "is_mine": true,
  "read_by_other": true,
  "pending": false,
  "failed": false,
  "idempotency_key": "uuid"
}
```

**Client-side fields:**
- `pending`: boolean — message being sent (temp message)
- `failed`: boolean — send failed, show error state
- `idempotency_key`: UUID used for send

---

### ConversationParticipant
```json
{
  "user_id": "uuid",
  "name": "John Doe",
  "username": "johndoe",
  "avatar_url": null,
  "avatar_initial": "J",
  "is_online": true,
  "current_streak": 5
}
```

---

### LastMessage
```json
{
  "content": "Hey! How are you?",
  "sender_id": "uuid",
  "sent_at": "2026-05-08T14:30:00Z",
  "is_deleted": false
}
```

---

### MessageCreate (Request)
```json
{
  "content": "Hey! How are you?",
  "idempotency_key": "uuid-v4",
  "client_timestamp": "2026-05-08T14:30:00Z"
}
```

---

### MessagesPageResponse
```json
{
  "messages": [ /* Message[] */ ],
  "has_more": true
}
```

---

## Screen Sections & Features

### 1. Left Panel — Conversations

**Header:**
- Title: "Messages"
- "New message" button (pencil icon) — toggles new conversation form

**Search Bar:**
- Placeholder: "Search messages..."
- Real-time search on input
- Search query filters conversations by:
  - Participant name (case-insensitive)
  - Participant username (case-insensitive)
  - Last message preview content (case-insensitive)

**New Conversation Form (collapsed by default):**
- Appears when user clicks "new message" button
- Input: placeholder "Username..."
- "Start" button: disabled if input empty or starting conversation
- Loading spinner while sending
- Error message below form if request fails
- Closes on success

**AI Coach Conversation (always pinned at top):**
- Avatar: 🤖
- Label: "AI Coach"
- Preview: typing indicator OR last message OR "Ask me anything!" (if no messages)
- Unread badge: shown if `unread_count > 0`
- Time: relative time (e.g., "2h")

**Direct Messages Section (below AI Coach):**
- Section label: "DIRECT MESSAGES"
- Lists friend conversations sorted by most recent message
- Also lists friends with no conversation yet (tappable to start conversation)

**Conversation Item (in list):**
- Avatar: colored initial (gradient) + online indicator (green dot)
- Name: participant name (bold)
- Time (right-aligned): relative time (e.g., "5m", "2h", "1d")
- Preview line: typing indicator OR last message content OR "No messages yet" (if empty)
- Unread badge: shown if `unread_count > 0` (white text on colored background)
- Active state: highlight background if conversation is currently selected

**Loading state:**
- Show 4 conversation skeleton placeholders with shimmer animation

**Empty state:**
- Show "No conversations yet"
- Show "Tap the edit icon to start one"

---

### 2. Right Panel — Chat (Main Area)

#### Chat Empty State (No conversation selected)
- Large chat bubble emoji: 💬
- Title: "Pick a conversation"
- Subtitle: "or start one with the edit button"

#### Chat Header (when conversation selected)

**Left section:**
- Avatar: colored initial (gradient) OR 🤖 if AI Coach
- Name: participant name or "AI Coach"
- Subtitle:
  - If friend: online/offline status + streak (e.g., "Online · 🔥 5 days" or "Offline")
  - If AI Coach: "Powered by Claude · Always here"

**Right section:**
- Action buttons (for friends only, not AI Coach):
  - ⏰ Send Reminder button
  - 📞 Call button
  - ⋮ More options button
- Live indicator (always shown):
  - Green dot + "Live" (if `isLive === true`)
  - Gray dot + "Connecting..." (if `isLive === false`)

---

#### Messages List (scrollable, infinite scroll up for older messages)

**Loading Older (at top):**
- Show spinner while loading
- "Load older messages" button: tappable, loads next page

**Message Items:**

**Your messages (align right):**
- Avatar not shown
- Bubble (right side, colored background):
  - Content text
  - Delete button (×) on right side of bubble (if message not deleted and not pending)
  - Italic gray text: "This message was deleted" (if deleted)
  - Pending/failed state: dimmed appearance if pending
- Footer below bubble:
  - Time: HH:MM format
  - Status icon (left of time):
    - 🕐 Pending (sending) — muted
    - ! Failed (error) — red color
    - ✓ Sent (delivered but not read) — blue
    - ✓✓ Read (other user read) — blue
    - (no icon if deleted)

**Other's messages (align left):**
- Avatar (left side, colored initial gradient)
- Bubble (left side, gray/light background):
  - Content text
  - Italic gray text: "This message was deleted" (if deleted)
- Footer below bubble:
  - Time: HH:MM format

**Typing Indicator (when other typing):**
- Avatar on left
- Bubble with 3 animated dots (typing animation)
- Label "Typing..." below bubble

---

#### Message Input Area (bottom)

**Layout:**
- Action button (left): 🎤 (voice message)
- Textarea (center, grows with content):
  - Placeholder: "Select a conversation…" (if no conv) OR "Ask AI Coach…" (if AI) OR "Message {name}…"
  - Max 1000 characters
  - Enter to send (without Shift)
  - Shift+Enter for new line
  - Disabled when `isAiReplying === true` (AI Coach reply pending)
  - Row height auto-grows
- Action button (right, friends only): ⏰ (send habit reminder)
- Send button (far right):
  - Airplane/send icon
  - Disabled if message input empty OR `isAiReplying === true`
  - On click: send message

---

### 3. Loading States

**Initial load (no conversation selected):**
- Show 5 message skeleton placeholders with shimmer

**Load older in progress:**
- Show spinner at top of message list

**AI replying:**
- Disable input
- Show typing indicator bubble
- Disable send button

---

## Screen States

| State | Behavior |
|-------|----------|
| **No conversation** | Show empty state in main area |
| **Conversation loaded** | Display chat header + messages + input |
| **Loading messages** | Show skeletons, disable scroll |
| **Loading older** | Show spinner at top |
| **Typing indicator active** | Show "typing..." bubble |
| **AI replying** | Disable input, show typing indicator, set isAiReplying |
| **Message pending** | Show 🕐 icon, dimmed appearance |
| **Message failed** | Show ! icon in red, keep in list |
| **Live connected** | Green dot + "Live" |
| **Disconnected** | Gray dot + "Connecting..." |

---

## Navigation & Interactions

```
/chat
  ├── [Search conversations] → filter by name/username/preview
  ├── [New message button] → toggle new conversation form
  ├── [Start button] → POST /conversations → select new conversation
  ├── [Conversation item] → GET /conversations/{id}/messages → load messages
  ├── [Friend in list] → POST /conversations (via startConversationByUsername)
  ├── [Message input] → validate + POST /conversations/{id}/messages
  ├── [Send to AI Coach] → POST /ai-coach/messages → get pair [user, ai]
  ├── [Delete message] → DELETE /conversations/{id}/messages/{msgId}
  ├── [Load older] → GET /conversations/{id}/messages?cursor={ts}
  ├── [Typing input] → debounce + send typing event via WS
  └── [WebSocket events] → handle new_message, typing, presence_update, etc.
```

---

## Typing Indicator Flow

**When user types message:**
1. On input change: debounce 500ms
2. After 500ms silence: send `{type: "typing", conversation_id: "..."}` via WebSocket
3. Frontend shows "typing..." under input
4. Other user receives WebSocket event with `type: "typing"`, shows typing indicator (animated dots)
5. Typing indicator stays visible for 3 seconds after last typing event
6. Auto-clears after 3s if no new typing event

---

## Presence Updates

**When user comes online/goes offline:**
- WebSocket event: `type: "presence_update"`, `user_id`, `is_online`
- Action: Update participant's `is_online` in all conversations with that user
- UI: Update online indicator (green/gray dot) in conversation list and chat header

---

## Message Status Flow

**Sending a message:**
1. User types + hits Enter or clicks Send
2. Optimistically add temp message: `id: "temp-{key}"`, `pending: true`
3. POST to `/conversations/{id}/messages`
4. On success: replace temp message with real message, `pending: false`
5. On failure: mark `failed: true`, show error state
6. WebSocket event `messages_read` when other user reads: `read_by_other: true`

**Message statuses (visual indicators):**
- **Pending (🕐):** Message being sent (still optimistic)
- **Sent (✓):** Message delivered to server, not yet read by other
- **Read (✓✓):** Other user has read the message (WebSocket `messages_read` event)
- **Failed (!):** Send failed, user can retry or delete

---

## Infinite Scroll (Load Older Messages)

**Trigger:** When user scrolls to top (scrollTop < 80px) and `hasMoreMessages === true`

**Action:**
1. Set `isLoadingOlder = true`
2. GET `/conversations/{id}/messages?cursor={firstMsgTimestamp}`
3. Prepend new messages to messages list (insert before existing messages)
4. Update `hasMoreMessages` from response
5. On error: silently fail, user can retry via "Load older" button

**Pagination:** Cursor is `created_at` timestamp of first message in current list.

---

## Conversation Sorting

**Algorithm:**
1. AI Coach conversation always first (if exists)
2. Friend conversations sorted by `last_message_at` (most recent first)

**Sorting triggered on:**
- New message received (via WS or sent)
- New conversation started
- Conversation selected

---

## Avatar Color Assignment

**Algorithm:**
```
gradients = [
  "linear-gradient(135deg, #6C63FF, #00C2FF)",
  "linear-gradient(135deg, #22C55E, #00C2FF)",
  "linear-gradient(135deg, #FB923C, #F43F5E)",
  "linear-gradient(135deg, #8B5CF6, #EC4899)",
  "linear-gradient(135deg, #F59E0B, #EF4444)",
  "linear-gradient(135deg, #06B6D4, #6C63FF)",
  "linear-gradient(135deg, #10B981, #6C63FF)",
  "linear-gradient(135deg, #EC4899, #F59E0B)"
]
charCode = first_letter.charCodeAt(0)
index = charCode % gradients.length
color = gradients[index]
```

Each user initial gets a consistent gradient avatar color across all screens.

---

## Relative Time Formatting

**Examples:**
- `formatConvTime()`: "now" (< 1 min), "5m" (< 60 min), "2h" (< 24 h), "3d" (≥ 24 h)
- `formatTime()`: "14:30" (HH:MM format)

---

## Error Handling

| Error | Handling |
|-------|----------|
| Load conversations failure | Show error in banner at top |
| Start conversation failure | Show error message under form |
| Send message failure | Mark message `failed: true`, show error state |
| Delete message failure | Show error, keep message visible, allow retry |
| Load messages failure | Silently fail, show loading state |
| Load older failure | Silently fail, allow retry via button |
| WebSocket disconnect | Show "Connecting..." indicator, auto-reconnect |
| Mark read failure | Silently fail (non-critical) |

---

## Performance Considerations

- **Message pagination:** Load 30 messages at a time, older messages loaded on demand
- **Cursor-based pagination:** More efficient than offset-based for real-time feeds
- **Typing debounce:** Send typing event max once per 500ms
- **Typing timer:** Clear 3-second timer on each new typing event
- **WebSocket keepalive:** Ping every 25 seconds
- **Infinite scroll:** Only load when scrolling near top (< 80px)
- **Optimistic updates:** Update UI immediately, sync on success
- **Conversation sorting:** Efficient sort on list update

---

## Security & Validation

- **Content validation:** Trim whitespace before sending
- **Max length:** 1000 chars for messages — enforce client-side
- **Permissions:** Only user can delete their own messages (server validates)
- **Token in WS URL:** Must be URL-encoded
- **Idempotency keys:** UUID per send prevents duplicate messages if request retried
- **No sensitive data in logs**: Don't log user IDs or message content in console
- **Input sanitization:** Escape/sanitize content for display (XSS prevention)

---

## Accessibility

- **ARIA labels:** All interactive elements have `aria-label` attributes
- **Keyboard navigation:** Enter to send (Shift+Enter for newline)
- **Focus management:** Focus message input after sending
- **Semantic HTML:** Use proper heading and button elements
- **Color contrast:** Message bubbles and buttons meet WCAG standards

---

## Recommended Implementation Order

1. Conversations list screen (GET /conversations, list UI)
2. Select conversation + load messages (GET /conversations/{id}/messages)
3. Send message (POST, optimistic update)
4. Delete message (DELETE, mark deleted)
5. AI Coach integration (GET /ai-coach, POST /ai-coach/messages)
6. WebSocket connection (new_message, typing, presence_update)
7. Mark as read flow (POST /read, messages_read event)
8. Start new conversation (POST /conversations)
9. Infinite scroll (load older messages)
10. Polish: typing indicator, message states, error handling, loading states

