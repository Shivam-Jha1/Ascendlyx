# Flutter Friends & Activity Feed Reference — Ascendlyx

Reference document for implementing the **Friends & Activity Feed** screen in the Ascendlyx Flutter mobile app. All information is derived directly from the Angular web frontend.

---

## Base URL

| Environment | Base URL |
|-------------|----------|
| Development | `http://localhost:3000/api/v1` |
| Production  | Replace with production domain |

All requests require `Authorization: Bearer <access_token>` header.

---

## API Endpoints

### 1. Get Activity Feed (Paginated)

| Property | Value |
|----------|-------|
| Method   | `GET` |
| Endpoint | `/feed` |
| Auth     | Bearer token required |

**Query parameters:**
- `page` — integer (default: 1)
- `per_page` — integer (default: 10)

**Success response `200`:**
```json
{
  "posts": [
    {
      "id": "uuid",
      "author": {
        "user_id": "uuid",
        "name": "John Doe",
        "username": "johndoe",
        "avatar_url": null,
        "avatar_initial": "J",
        "current_streak": 5
      },
      "content": "Just completed my morning run! 🏃",
      "post_type": "habit_checkin",
      "metadata": {},
      "created_at": "2026-05-08T09:30:00Z",
      "updated_at": "2026-05-08T09:30:00Z",
      "time_ago": "2 hours ago",
      "reactions": [
        {
          "reaction_type": "fire",
          "count": 3,
          "user_reacted": false
        }
      ],
      "reply_count": 1,
      "user_reaction": null,
      "can_edit": false,
      "can_delete": false
    }
  ],
  "total": 42,
  "page": 1,
  "page_size": 10,
  "per_page": 10,
  "has_more": true
}
```

**Fields:**
- `posts`: array of activity posts
- `has_more`: boolean — indicates if more pages available
- `page`: current page number
- `per_page`: items per page

**Error handling:**
- `error.message` → display error
- Fallback: `"Failed to load feed. Please try again."`

---

### 2. Create Post

| Property | Value |
|----------|-------|
| Method   | `POST` |
| Endpoint | `/feed/posts` |
| Auth     | Bearer token required |

**Request body:**
```json
{
  "content": "Just completed my morning run! 🏃",
  "post_type": "manual"
}
```

**Field notes:**
- `content`: required, max 1000 characters, trimmed
- `post_type`: optional, one of `"manual"`, `"habit_checkin"`, `"goal_completed"`, `"streak_milestone"` (default: `"manual"`)

**Success response `200`:** Created `ActivityPost` object (prepended to feed list).

---

### 3. Delete Post

| Property | Value |
|----------|-------|
| Method   | `DELETE` |
| Endpoint | `/feed/posts/{postId}` |
| Auth     | Bearer token required |

**Success response `200`:** Empty body. Post is removed from feed list.

---

### 4. Toggle Reaction

| Property | Value |
|----------|-------|
| Method   | `POST` |
| Endpoint | `/feed/posts/{postId}/react` |
| Auth     | Bearer token required |

**Request body:**
```json
{
  "reaction_type": "fire"
}
```

**Reaction types:** `"fire"` | `"clap"` | `"strong"` | `"like"` | `"goals"` | `"read_it"`

**Success response `200`:**
```json
{
  "id": "uuid",
  "author": { ... },
  "content": "...",
  "reactions": [
    {
      "reaction_type": "fire",
      "count": 3,
      "user_reacted": true
    }
  ],
  "user_reaction": "fire"
}
```

Toggles user's reaction on the post. If user already reacted with same type, removes reaction.

---

### 5. Get Post Replies

| Property | Value |
|----------|-------|
| Method   | `GET` |
| Endpoint | `/feed/posts/{postId}/replies` |
| Auth     | Bearer token required |

**Success response `200`:**
```json
[
  {
    "id": "uuid",
    "post_id": "uuid",
    "author": {
      "user_id": "uuid",
      "name": "Jane Smith",
      "username": "janesmith",
      "avatar_url": null,
      "avatar_initial": "J"
    },
    "content": "Amazing effort! Keep it up!",
    "created_at": "2026-05-08T10:00:00Z",
    "time_ago": "1 hour ago"
  }
]
```

---

### 6. Add Reply

| Property | Value |
|----------|-------|
| Method   | `POST` |
| Endpoint | `/feed/posts/{postId}/replies` |
| Auth     | Bearer token required |

**Request body:**
```json
{
  "content": "Amazing effort! Keep it up!"
}
```

**Field notes:**
- `content`: required, max 500 characters, trimmed

**Success response `200`:** Created `PostReply` object.

---

### 7. Delete Reply

| Property | Value |
|----------|-------|
| Method   | `DELETE` |
| Endpoint | `/feed/posts/{postId}/replies/{replyId}` |
| Auth     | Bearer token required |

**Success response `200`:** Empty body. Reply is removed from post's replies.

**Permissions:** Post owner OR reply author can delete. Validated on backend.

---

### 8. Get Friends List

| Property | Value |
|----------|-------|
| Method   | `GET` |
| Endpoint | `/feed/friends` |
| Auth     | Bearer token required |

**Success response `200`:**
```json
{
  "friends": [
    {
      "user_id": "uuid",
      "name": "John Doe",
      "username": "johndoe",
      "avatar_url": null,
      "avatar_initial": "J",
      "current_streak": 5,
      "longest_streak": 12,
      "membership_tier": "free"
    }
  ],
  "total": 42
}
```

Alternatively, may return array directly: `[ { user_id, name, ... } ]`

---

### 9. Search Users

| Property | Value |
|----------|-------|
| Method   | `GET` |
| Endpoint | `/feed/friends/search` |
| Auth     | Bearer token required |

**Query parameters:**
- `q` — search query (min 2 characters)

**Success response `200`:**
```json
[
  {
    "user_id": "uuid",
    "name": "Alice Johnson",
    "username": "alicejohnson",
    "avatar_url": null,
    "avatar_initial": "A",
    "friendship_status": "none"
  }
]
```

**Friendship status values:** `"none"` | `"pending_sent"` | `"pending_received"` | `"accepted"` | `"blocked"`

---

### 10. Send Friend Request

| Property | Value |
|----------|-------|
| Method   | `POST` |
| Endpoint | `/friends/request/{username}` |
| Auth     | Bearer token required |

**Request body:** Empty object `{}`

**Success response `200`:** Confirmation message.

Sets `friendship_status` to `"pending_sent"` for that user in search results.

---

### 11. Accept Friend Request

| Property | Value |
|----------|-------|
| Method   | `PATCH` |
| Endpoint | `/friends/request/{username}` |
| Auth     | Bearer token required |

**Request body:**
```json
{
  "action": "accept"
}
```

**Success response `200`:** Confirmation message.

Sets `friendship_status` to `"accepted"` and adds user to friends list.

---

## WebSocket Connection

### Connection

**Endpoint (WebSocket):**
```
ws://localhost:3000/api/v1/ws/feed?token={access_token}
```

(Use `wss://` for HTTPS environments)

**Token:** Access token from login, URL-encoded and passed as query parameter.

**Connection lifecycle:**
- On successful connection: `isLive = true` (show "Live updates" indicator)
- On disconnect/error: `isLive = false` (show "Connecting…")
- Auto-reconnect: Not implemented in frontend — user navigates away or WebSocket closes

---

### WebSocket Event Types

**Event structure:**
```json
{
  "type": "new_post" | "reaction_update" | "new_reply" | "post_deleted" | "reply_deleted",
  "post": { /* ActivityPost */ },
  "post_id": "uuid",
  "reactor_id": "uuid",
  "reaction_type": "fire",
  "reactions": [ /* ReactionSummary[] */ ],
  "reply": { /* PostReply */ },
  "reply_id": "uuid"
}
```

#### Event: `new_post`
- **Payload fields:** `type`, `post`
- **Action:** Prepend post to feed list (avoid duplicates)
- **UI update:** Post appears at top of feed in real-time

#### Event: `post_deleted`
- **Payload fields:** `type`, `post_id`
- **Action:** Remove post from feed
- **UI update:** Post disappears immediately

#### Event: `reaction_update`
- **Payload fields:** `type`, `reactor_id`, `reaction_type`, `reactions`
- **Action:** Update `post.reactions` with new counts
- **UI update:** Reaction counts update in real-time

#### Event: `new_reply`
- **Payload fields:** `type`, `reply`
- **Action:** Add reply to post's replies list (if post is in feed and replies visible)
- **Action:** Increment `post.reply_count`
- **UI update:** Reply appears in replies section, count updates

#### Event: `reply_deleted`
- **Payload fields:** `type`, `reply_id`
- **Action:** Remove reply from post's replies list
- **Action:** Decrement `post.reply_count`
- **UI update:** Reply disappears, count updates

---

## Data Model Shapes

### ActivityPost
```json
{
  "id": "uuid",
  "author": {
    "user_id": "uuid",
    "name": "John Doe",
    "username": "johndoe",
    "avatar_url": null,
    "avatar_initial": "J",
    "current_streak": 5
  },
  "content": "Just completed my morning run!",
  "post_type": "habit_checkin",
  "metadata": {},
  "created_at": "2026-05-08T09:30:00Z",
  "updated_at": "2026-05-08T09:30:00Z",
  "time_ago": "2 hours ago",
  "reactions": [
    { "reaction_type": "fire", "count": 3, "user_reacted": false }
  ],
  "reply_count": 1,
  "user_reaction": null,
  "can_edit": false,
  "can_delete": false,
  "replies": [],
  "showReplies": false,
  "replyLoading": false
}
```

### PostReply
```json
{
  "id": "uuid",
  "post_id": "uuid",
  "author": {
    "user_id": "uuid",
    "name": "Jane Smith",
    "username": "janesmith",
    "avatar_url": null,
    "avatar_initial": "J"
  },
  "content": "Amazing effort!",
  "created_at": "2026-05-08T10:00:00Z",
  "time_ago": "1 hour ago"
}
```

### FriendListItem
```json
{
  "user_id": "uuid",
  "name": "John Doe",
  "username": "johndoe",
  "avatar_url": null,
  "avatar_initial": "J",
  "current_streak": 5,
  "longest_streak": 12,
  "membership_tier": "free"
}
```

### FriendSearchResult
```json
{
  "user_id": "uuid",
  "name": "Alice Johnson",
  "username": "alicejohnson",
  "avatar_url": null,
  "avatar_initial": "A",
  "friendship_status": "none"
}
```

### ReactionSummary
```json
{
  "reaction_type": "fire",
  "count": 3,
  "user_reacted": true
}
```

### PostType (enum)
```
"manual" | "habit_checkin" | "goal_completed" | "streak_milestone"
```

### ReactionType (enum)
```
"fire" | "clap" | "strong" | "like" | "goals" | "read_it"
```

### FriendshipStatus (enum)
```
"none" | "pending_sent" | "pending_received" | "accepted" | "blocked"
```

### Reaction Metadata
```json
{
  "fire": { "emoji": "🔥", "label": "Fire" },
  "clap": { "emoji": "👏", "label": "Clap" },
  "strong": { "emoji": "💪", "label": "Strong" },
  "like": { "emoji": "👍", "label": "Like" },
  "goals": { "emoji": "🎯", "label": "Goals" },
  "read_it": { "emoji": "📖", "label": "Read it" }
}
```

---

## Screen Sections & Features

### 1. Search Bar (Top)

**Input:**
- Placeholder: "Find friends by username..."
- Real-time search as user types
- Minimum 2 characters to trigger search

**Clear button:**
- Appears when search query is not empty
- Clears search and results

**Dropdown results (below search):**
- Appears when results found
- Each result shows:
  - Avatar (colored initial)
  - Name + username (@ prefix)
  - Action button (see status buttons below)

---

### 2. Friend Status Buttons (in search results)

| Status | Button Label | Disabled | Color |
|--------|--------------|----------|-------|
| `none` | `+ Add` | No | Normal |
| `pending_sent` | `Pending` | Yes | Muted |
| `pending_received` | `Accept` | No | Accent |
| `accepted` | `Friends` | Yes | Muted |
| `blocked` | `Blocked` | Yes | Red/Danger |

**On click:**
- If status `none`: POST friend request
- If status `pending_received`: PATCH accept request
- Other statuses: disabled, no action

**Loading state:** Show spinner while request in-flight, disable button.

---

### 3. Page Header

```
Friends 👥
Stay accountable and motivated together
```

---

### 4. Main Layout (Two-panel)

#### LEFT PANEL: Friends List

**Header:**
- "My Friends · {total_count}" (e.g., "My Friends · 42")
- "+ Add" button (focuses search bar)

**Friends list:**
- Shows first 5 friends (visible)
- Each friend item displays:
  - Avatar (colored initial)
  - Name
  - Current streak: "🔥 {count} day streak"
  - Streak badge on right: "🔥 {count}"

**Loading state:**
- Show 3 skeleton placeholder rows

**View All button:**
- Shown if `friendsTotal > 5`
- Text: "View all {total} friends →"

---

#### RIGHT PANEL: Activity Feed

**Feed Header:**
- Title: "Activity Feed"
- Live indicator (left): animated dot (green when live)
- Live label (right): "Live updates" or "Connecting…"

**Create Post Section:**
- **Collapsed state:**
  - Button with pencil emoji: "✏️ Share something with your friends…"
  - Click to expand form

- **Expanded state:**
  - Textarea with placeholder: "What are you working on?"
  - Max 1000 characters
  - Character counter: "{current}/1000" (right)
  - Buttons:
    - Cancel (left)
    - Post (right, disabled if empty)
  - Show loading spinner while posting

**Error Banner:**
- Appears if feed fails to load
- Shows error message + "Retry" button

**Posts List:**
- Displays all paginated posts

**Load More Button:**
- Shown if `hasMore === true` and not loading
- On click: increments page and loads next batch

---

### 5. Post Card

**Structure:**

**Post Header:**
- Avatar (colored initial, clickable for user profile)
- Author name (bold)
- Author current streak: "🔥 {count} days" (small, secondary)
- Time posted: "{time_ago}" (right-aligned, e.g., "2 hours ago")

**Post Body:**
- Full post content (text, up to 1000 chars)

**Post Actions (buttons row):**
- One button per reaction type (only show if count > 0 in this post):
  - Format: "{emoji} {label}" (e.g., "🔥 Fire")
  - Active state: if `user_reacted === true` with this type
  - On click: toggle reaction
  
- Reply button:
  - Format: "💬 Reply" + optional count badge
  - Badge shows if `reply_count > 0`
  - Active state: if replying to this post
  - On click: open/close replies section

**Replies Section (expandable):**

Shown when `showReplies === true` OR `activeReplyPostId === postId`:

- **Loading state:** "Loading replies…"
- **Reply items:** Each reply displays:
  - Avatar (colored)
  - Author name
  - Time posted: "· {time_ago}"
  - Reply content
  - Delete button (trash 🗑) — visible if current user is post author OR reply author
    - Disabled while deleting, shows spinner

- **Reply input row:**
  - Shown when `activeReplyPostId === postId` (reply section open)
  - Text input: "Write a reply…" (max 500 chars)
  - "Send" button (disabled if empty)
  - Enter key sends reply
  - Show loading spinner while sending

---

### 6. Loading States

**Initial feed load:**
- Show 3 post skeleton placeholders (placeholder with shimmer effect)
- Each skeleton shows: avatar + name/time + content placeholder + actions

**Load more in progress:**
- Show spinner below posts while loading

**Reply loading:**
- Show "Loading replies…" message in replies section

---

## Screen States

| State | Behavior |
|-------|----------|
| **Initial loading** | Show post skeletons |
| **Feed loaded** | Display posts, enable interactions |
| **Error** | Show error banner with retry button |
| **Empty feed** | Show "No posts yet" or similar |
| **Live connected** | Show green dot + "Live updates" |
| **Disconnected** | Show gray dot + "Connecting…" |
| **Replying** | Show reply input field + existing replies |

---

## Local State Tracking

**To prevent duplicate WS echoes:**
- When user creates a post/reply: record its ID in a local set for 10 seconds
- When WS event arrives with that ID: skip processing (already handled optimistically)
- When user deletes a reply: record ID, ignore WS echo for 10 seconds

This prevents double-counting reactions and duplicate replies in the UI.

---

## Navigation & Interactions

```
/friends
  ├── [Search input] → POST /feed/friends/search (q param)
  ├── [Search result + Add button] → POST /friends/request/{username}
  ├── [Search result + Accept button] → PATCH /friends/request/{username}
  ├── [Create post button] → toggle form visibility
  ├── [Post button] → POST /feed/posts
  ├── [Reaction button] → POST /feed/posts/{id}/react
  ├── [Reply button] → GET /feed/posts/{id}/replies (if needed) → show replies section
  ├── [Send reply] → POST /feed/posts/{id}/replies
  ├── [Delete reply] → DELETE /feed/posts/{id}/replies/{replyId}
  ├── [Delete post] → DELETE /feed/posts/{id}
  ├── [Load more] → GET /feed?page={next}
  └── [Live indicator] → connected to WebSocket
```

---

## Error Handling Patterns

| Error | Handling |
|-------|----------|
| Load feed failure | Show error banner with retry |
| Create post failure | Show error (inline or modal), allow retry |
| Delete post failure | Silent failure or show toast, keep post visible |
| Reaction failure | Silent failure, revert UI optimistically |
| Send reply failure | Show error in reply section, keep input |
| Delete reply failure | Show error, keep reply visible |
| Load replies failure | Show error message in replies section |
| Search failure | Silently hide results, allow retry with different query |
| Friend request failure | Show error, revert status update |
| WebSocket disconnect | Show "Connecting…", attempt reconnect or show reconnect option |

---

## Pagination

**Default:** 10 items per page

**Behavior:**
1. Initial load: `page=1`
2. User clicks "Load more": `page++`
3. Append new posts to list
4. If `has_more === false`, hide "Load more" button

---

## Avatar Color Assignment

**Algorithm:**
```
colors = [#3B82F6, #10B981, #F59E0B, #EF4444, #8B5CF6, #EC4899, #06B6D4, #84CC16]
charCode = first_letter.charCodeAt(0)
index = charCode % colors.length
color = colors[index]
```

Consistent color per user initial across all screens.

---

## UI/UX Details

### Responsive Layout

**Desktop:**
- Two-column: 30% friends panel (left), 70% feed (right)
- Side-by-side scrolling

**Mobile:**
- Single column, stacked:
  - Search at top
  - Friends panel (collapsible or shortened)
  - Feed below

### Visual Feedback

- Active reaction: highlighted button color + filled emoji
- Hover states: buttons change background/border color
- Loading: spinner animation, disabled state
- Delete actions: optimistic removal or confirmation modal
- Live indicator: animated pulsing dot

### Typography & Spacing

- Post author: bold, larger text
- Author streak: smaller, secondary color
- Post content: body text size
- Time: small, muted color
- Reply author: slightly smaller than post author

---

## Performance Considerations

- **Lazy load replies**: Only fetch when user clicks "Reply"
- **Virtual scrolling**: If 100+ posts, implement virtual list
- **WebSocket debounce**: Batch rapid events to avoid excessive re-renders
- **Optimistic updates**: Update UI immediately, sync on success
- **Cache feed**: Store locally; reload fresh periodically
- **Pagination**: Load 10 posts per page; user controls pagination via "Load more"

---

## Security & Validation

- **Content validation:** Trim and validate content before sending
- **Max lengths:** Post 1000 chars, reply 500 chars — enforce client-side
- **Permissions:** Delete button shown only if user is author/post-owner (server validates)
- **Token in WS URL:** Must be URL-encoded and passed securely
- **No sensitive data in logs**: Don't log user IDs or tokens in console
