# Profile & Social — Implementation Reference

## Overview

Extends the Ascendlyx backend with a full **User Profile** screen, **badge system**, **privacy controls**, **friend connections**, and **focus session tracking**. All endpoints live under `/api/v1/` and require JWT auth unless noted otherwise.

---

## Database Tables (6 new)

| Table | Purpose |
|---|---|
| `user_profiles` | Extended profile (username, bio, location, avatar, membership tier, is_public) — 1:1 with `users` |
| `privacy_settings` | Per-user visibility toggles (streaks, habits, goals, AI score, friends count, productivity) — 1:1 with `users` |
| `badge_definitions` | Static reference table of earnable badges (slug, criteria type/threshold, icon) |
| `user_badges` | Join table tracking which badges a user has earned and when |
| `friendships` | Directional friend requests with status (pending/accepted/blocked) |
| `focus_sessions` | Pomodoro/focus time logs (duration, start/end, optional habit link) |

Auto-created on signup: `user_profiles` row (username derived from email) + `privacy_settings` row (all defaults `true`).

---

## Endpoints

### Profile

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/profile` | ✅ | Get own full profile with stats, badges, goals, privacy |
| `PATCH` | `/profile` | ✅ | Update profile fields (username, bio, location, avatar_url) |
| `PATCH` | `/profile/privacy` | ✅ | Update privacy toggles |
| `GET` | `/users/{username}` | Optional | View public profile (privacy-gated, shows friendship status if authed) |

#### `GET /profile` — Own Profile

Returns the complete profile aggregation:

```json
{
  "user_id": "uuid",
  "name": "John Doe",
  "username": "johndoe",
  "bio": "...",
  "location": "NYC",
  "avatar_url": null,
  "avatar_initial": "J",
  "membership_tier": "free",
  "joined_at": "2026-01-15T...",
  "quick_stats": {
    "current_streak": 12,
    "ai_score": 78,
    "friends_count": 5,
    "consistency_percent": 85.0
  },
  "productivity_stats": {
    "habits_done_total": 142,
    "active_goals_count": 3,
    "books_read_count": 2,
    "longest_streak_days": 30,
    "focus_time_hours": 18.5,
    "badges_earned_count": 2
  },
  "consistency": {
    "percentage": 85.0,
    "rating": "Excellent",
    "percentile": 72
  },
  "public_goals": [
    { "id": "uuid", "title": "Read 10 books", "progress_percentage": 40.0, "priority": "high", "unit": null }
  ],
  "badges": [
    { "slug": "streak_king", "name": "Streak King", "description": "...", "icon_value": "🔥", "earned": true, "earned_at": "..." }
  ],
  "privacy": {
    "show_streaks_publicly": true,
    "share_habit_completions": true,
    "public_goal_visibility": true,
    "show_ai_score_publicly": true,
    "show_friends_count": true,
    "show_productivity_stats": true
  }
}
```

Cached in Redis for 2 minutes (`profile:own:{user_id}`). Cache invalidated on profile/privacy updates, friend changes, and focus sessions.

#### `PATCH /profile` — Update Profile

```json
{
  "username": "newname",
  "bio": "Hello world",
  "location": "San Francisco",
  "avatar_url": "https://..."
}
```

All fields optional. Username must be 3-30 chars, alphanumeric + underscore, unique (case-insensitive). Returns full `OwnProfileResponse`. **409** if username is taken.

#### `PATCH /profile/privacy` — Update Privacy

```json
{
  "show_streaks_publicly": false,
  "show_ai_score_publicly": false
}
```

All fields optional — only provided fields are updated. Returns `PrivacySettingsResponse`.

#### `GET /users/{username}` — Public Profile

- **No auth**: Basic profile info only. Stats/goals/badges hidden based on target user's privacy settings.
- **With auth**: Same as above, plus `friendship_status` field (`none | pending_sent | pending_received | accepted | blocked`).
- **Private account** (`is_public = false`): Returns **404**.

Privacy gates applied:
- `show_streaks_publicly` / `show_ai_score_publicly` / `show_friends_count` → `quick_stats` (null if all off)
- `show_productivity_stats` → `productivity_stats` (null if off)
- `public_goal_visibility` → `public_goals` (null if off)

---

### Friends

All friend endpoints require auth. Users are identified by **username** in the URL.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/friends` | ✅ | List accepted friends |
| `GET` | `/friends/requests` | ✅ | List pending incoming friend requests |
| `POST` | `/friends/request/{username}` | ✅ | Send friend request → **201** |
| `PATCH` | `/friends/request/{requester_username}` | ✅ | Accept, decline, or block a request |
| `DELETE` | `/friends/{username}` | ✅ | Remove friend → **204** |

#### `POST /friends/request/{username}` — Send Request

No body required. Returns `FriendResponse` with `status: "pending_sent"`.

Error codes:
- **422** — Sending request to yourself
- **409** — Already friends or request already pending
- **404** — Username not found

#### `PATCH /friends/request/{requester_username}` — Respond

```json
{ "action": "accept" }
```

`action` must be one of: `accept`, `decline`, `block`. Returns `FriendResponse` with updated status.

#### `FriendResponse` shape

```json
{
  "user_id": "uuid",
  "username": "janedoe",
  "name": "Jane Doe",
  "avatar_url": null,
  "avatar_initial": "J",
  "membership_tier": "free",
  "status": "accepted"
}
```

---

### Badges

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/badges` | ✅ | Get all badges with earned/locked status |

#### Seeded Badge Definitions

| Slug | Name | Icon | Criteria | Threshold |
|---|---|---|---|---|
| `streak_king` | Streak King | 🔥 | `streak_days` | 30 |
| `peak_score` | Peak Score | ⚡ | `ai_score` | 90 |
| `bookworm` | Bookworm | 📚 | `books_read` | 5 |
| `century_club` | Century Club | 🏆 | `habits_done` | 100 |

Badges are evaluated **automatically** after: habit checkin, goal progress update, milestone toggle, and focus session logging. Evaluation is idempotent — awarding the same badge twice is a no-op.

#### `BadgeResponse` shape

```json
{
  "slug": "streak_king",
  "name": "Streak King",
  "description": "Maintain a 30-day streak",
  "icon_value": "🔥",
  "earned": true,
  "earned_at": "2026-03-20T..."
}
```

---

### Focus Sessions

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/focus-sessions` | ✅ | Log a focus session → **201** |

#### `POST /focus-sessions`

```json
{
  "duration_minutes": 25,
  "started_at": "2026-04-01T10:00:00Z",
  "habit_id": null,
  "note": "Deep work block"
}
```

- `duration_minutes`: 1–480 (required)
- `started_at`: ISO datetime, cannot be in the future (required)
- `habit_id`: Optional link to a habit
- `note`: Optional text

Returns `FocusSessionResponse` with computed `ended_at`. Triggers badge evaluation.

---

## New Files

| Path | Purpose |
|---|---|
| `app/models/user_profile.py` | UserProfile model |
| `app/models/privacy_settings.py` | PrivacySettings model |
| `app/models/badge.py` | BadgeDefinition + UserBadge models |
| `app/models/friendship.py` | Friendship model |
| `app/models/focus_session.py` | FocusSession model |
| `app/schemas/profile.py` | All Pydantic schemas for profile features |
| `app/services/profile_service.py` | Profile aggregation, stats computation, caching |
| `app/services/badge_service.py` | Badge evaluation and award logic |
| `app/services/friendship_service.py` | Friend request lifecycle |
| `app/services/focus_service.py` | Focus session logging |
| `app/api/v1/profile.py` | All route handlers |
| `alembic/versions/b1c2d3e4f5a6_add_profile_badge_social_tables.py` | Migration (6 tables + badge seed data) |
| `tests/test_profile.py` | 19 test cases |

## Modified Files

| Path | Change |
|---|---|
| `app/models/user.py` | Added `profile` relationship to UserProfile |
| `app/models/__init__.py` | Added imports for all new models |
| `app/api/router.py` | Registered profile router |
| `app/services/auth_service.py` | Auto-create UserProfile + PrivacySettings on signup |
| `app/api/v1/habits.py` | Badge evaluation trigger after checkin |
| `app/api/v1/goals.py` | Badge evaluation trigger after progress update / milestone toggle |
| `app/core/exceptions.py` | 6 new exception classes |

## Tests (19 cases)

- Own profile returns all sections
- Username update + duplicate username 409
- Privacy toggles update
- Public profile respects privacy gates
- Private account returns 404
- Send / accept / decline friend request
- Self-request 422, duplicate request 409
- Remove friend
- Badge awarded on threshold, no duplication, unearned show locked
- Focus session logging + invalid duration 422
- Consistency percentile comparison
- Public profile shows friendship status
