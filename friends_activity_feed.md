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
- **JSON metadata**: Uses `sqlalchemy.types.JSON` (compatible with both PostgreSQL and SQLite for testing)

## Test Coverage

**31 new tests** covering:
- Post CRUD (create, update, delete, validation, auth)
- Feed (empty, own posts, friend posts, non-friend hidden, pagination)
- Reactions (add, toggle off, change type, friend visibility)
- Replies (add, list, delete, visibility)
- Friends list (empty, populated with streak data)
- Friend search (results, min query length, friendship status, excludes self)

**Total: 140 tests passing** (109 existing + 31 new)
