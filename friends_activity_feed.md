# Friends & Activity Feed — Implementation Summary

## Overview

Extended the Ascendlyx backend with a full **Friends & Activity Feed** feature allowing users to create posts, react with emojis, reply to friends' posts, and receive auto-generated posts for streak milestones and goal completions. Includes real-time WebSocket support and friend search.

---

## New Files Created

| File | Purpose |
|------|---------|
| `app/models/activity_post.py` | `ActivityPost` model with `PostType` enum (manual, habit_checkin, goal_completed, streak_milestone), JSON metadata, soft delete |
| `app/models/reaction.py` | `PostReaction` model with `ReactionType` enum (fire, clap, strong, like, goals, read_it), unique constraint per user per post |
| `app/models/post_reply.py` | `PostReply` model with soft delete |
| `app/schemas/feed.py` | Pydantic schemas: `ActivityPostCreate`, `ActivityPostUpdate`, `ReactionRequest`, `ReplyCreate`, `ReactionSummary`, `PostAuthorResponse`, `ReplyResponse`, `ActivityPostResponse`, `FeedResponse`, `FriendListItem`, `FriendSearchResult` |
| `app/services/feed_service.py` | Core feed service: CRUD posts, reactions (toggle), replies, auto-post creation, friend feed with Redis cache (30s TTL) |
| `app/services/friend_feed_service.py` | Friend list & user search with friendship status |
| `app/api/v1/feed.py` | HTTP routes for feed, posts, reactions, replies, friends |
| `app/api/v1/ws_feed.py` | WebSocket endpoint (`/ws/feed`) with `ConnectionManager` (in-memory, JWT auth via query param) |
| `app/utils/time_utils.py` | `time_ago()` helper for human-readable relative timestamps |
| `app/utils/reaction_utils.py` | `REACTION_META` dict mapping reaction types to emoji/label |
| `alembic/versions/c3d4e5f6a7b8_add_activity_feed_tables.py` | Migration for 3 new tables |
| `tests/test_feed.py` | 31 test cases covering all endpoints |

## Modified Files

| File | Change |
|------|--------|
| `app/models/__init__.py` | Registered `ActivityPost`, `PostReaction`, `PostReply` |
| `app/api/router.py` | Added `feed` and `ws_feed` routers |
| `app/api/v1/feed.py` | All feed mutation routes (create/delete post, react, add/delete reply) now broadcast events via WebSocket `ConnectionManager` to relevant connected users |
| `app/services/feed_service.py` | Exposed `get_friend_ids()` and `get_post()` as public methods for route-level WebSocket broadcasting |
| `app/core/exceptions.py` | Added `PostNotFoundError`, `ReplyNotFoundError`, `PostNotVisibleError`, `SearchQueryTooShortError` |
| `app/services/habit_service.py` | Auto-post on streak milestones (every 10 days), accepts optional `redis` param |
| `app/services/goal_service.py` | Auto-post on goal completion (both progress-based and milestone-based) |
| `app/api/v1/habits.py` | Passes `redis` to `HabitService` in checkin endpoint |

---

## API Endpoints

### Feed

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/feed` | Get paginated friend activity feed |
| `POST` | `/api/v1/feed/posts` | Create a new manual post |
| `PATCH` | `/api/v1/feed/posts/{post_id}` | Edit a manual post (owner only) |
| `DELETE` | `/api/v1/feed/posts/{post_id}` | Soft-delete a post (owner only) |

### Reactions

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/feed/posts/{post_id}/react` | Toggle emoji reaction (fire/clap/strong/like/goals/read_it) |

### Replies

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/feed/posts/{post_id}/replies` | Add a reply (friends only) |
| `GET` | `/api/v1/feed/posts/{post_id}/replies` | List replies (paginated) |
| `DELETE` | `/api/v1/feed/posts/{post_id}/replies/{reply_id}` | Soft-delete own reply |

### Friends (Feed Context)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/feed/friends` | List accepted friends with streak info |
| `GET` | `/api/v1/feed/friends/search?q=` | Search users by name/username (min 2 chars) |

### WebSocket

| Protocol | Path | Description |
|----------|------|-------------|
| `WS` | `/api/v1/ws/feed?token=<JWT>` | Real-time feed updates (JWT auth via query param) |

---

## Key Design Decisions

- **Visibility**: Users can only see/interact with posts from accepted friends or themselves
- **Soft delete**: Posts and replies use `is_deleted` flag, never physically removed
- **Reaction toggle**: Same reaction type twice removes it; different type replaces
- **Auto-posts**: Wrapped in try/except so failures never break parent operations (checkin/goal progress)
- **Feed cache**: Redis with 30s TTL, invalidated on post create/update/delete
- **WebSocket**: In-memory `ConnectionManager` (swap to Redis pub/sub for multi-instance)
- **Real-time broadcasts**: All feed mutations (post, reply, reaction, delete) push WebSocket events to relevant users so their UI updates instantly without a manual refresh
- **JSON metadata**: Uses `sqlalchemy.types.JSON` (compatible with both PostgreSQL and SQLite for testing)

## WebSocket Real-Time Events

All events are sent as JSON via the `/api/v1/ws/feed?token=<JWT>` WebSocket connection.

| Event Type | Triggered By | Sent To | Payload |
|------------|-------------|---------|---------|
| `new_post` | Creating a post | All friends of the author | `{ type, post }` — full `ActivityPostResponse` |
| `post_deleted` | Deleting a post | All friends of the author | `{ type, post_id }` |
| `reaction_update` | Toggling a reaction | Post owner (if not self) | `{ type, post_id, reactor_id, reaction_type, reactions[] }` |
| `new_reply` | Adding a reply | Post owner (if not self) | `{ type, post_id, reply }` — full `ReplyResponse` |
| `reply_deleted` | Deleting a reply | Post owner (if not self) | `{ type, post_id, reply_id }` |

### Frontend Integration

1. Connect to `ws://host/api/v1/ws/feed?token=<access_token>` on app load
2. Listen for incoming JSON messages and switch on the `type` field
3. For `new_post` — prepend to the feed list
4. For `post_deleted` — remove the post from the feed list
5. For `reaction_update` — update the reaction summary on the matching post
6. For `new_reply` — append to the reply list on the matching post
7. For `reply_deleted` — remove the reply from the matching post

## Test Coverage

**31 new tests** covering:
- Post CRUD (create, update, delete, validation, auth)
- Feed (empty, own posts, friend posts, non-friend hidden, pagination)
- Reactions (add, toggle off, change type, friend visibility)
- Replies (add, list, delete, visibility)
- Friends list (empty, populated with streak data)
- Friend search (results, min query length, friendship status, excludes self)

**Total: 140 tests passing** (109 existing + 31 new)
