# Habit System — Backend Changes (April 2026)

## Summary

Replaced the check-in system with a **HabitLog** model. Removed `daily_target` and `duration_minutes`. Added `expected_duration`. Analytics now use a **21-day** rolling window instead of 7 days.

---

## Removed Fields

| Field | Was on | Notes |
|---|---|---|
| `daily_target` | Habit create/update/response | No longer exists — remove from all forms and displays |
| `duration_minutes` | Habit create/update/response | Replaced by `expected_duration` |

## New / Renamed Fields

| Field | Type | On | Notes |
|---|---|---|---|
| `expected_duration` | `int \| null` (minutes, > 0) | HabitCreate, HabitUpdate, HabitResponse | Optional. Replaces `duration_minutes` |
| `today_log` | `HabitLogResponse \| null` | HabitResponse | Included when listing habits — shows today's log if one exists |

---

## New Endpoints

### `POST /api/v1/habits/{habit_id}/toggle`

**Primary way to mark a habit done/undone for a date.**

Query params:
- `date` (optional, `YYYY-MM-DD`) — defaults to today in user's timezone. **Cannot be a future date.**

Response (`ToggleResponse`):
```json
{
  "habit_id": "uuid",
  "date": "2026-04-20",
  "is_completed": true,
  "streak": {
    "current_streak": 5,
    "longest_streak": 12,
    "last_checkin_date": "2026-04-20"
  }
}
```

- Calling once → marks complete (`is_completed: true`)
- Calling again on same date → marks incomplete (`is_completed: false`)
- Streak updates bidirectionally (increments/decrements)
- Auto-posts milestone to social feed on streak milestones (7, 21, 30, 50, 100, 365)

### `PUT /api/v1/habits/{habit_id}/log/{log_date}`

**Update metadata on an existing log entry.**

Path params:
- `log_date` (`YYYY-MM-DD`)

Body (`HabitLogUpdate`):
```json
{
  "actual_duration": 45
}
```

Response: `HabitLogResponse`

---

## Changed Endpoints

### `GET /api/v1/habits`

New query param:
- `tz` (optional, string) — IANA timezone name (e.g. `"Asia/Kolkata"`). Falls back to user's saved timezone.

Response shape change:
- Removed: `daily_target`, `duration_minutes`
- Added: `expected_duration`, `today_log`

### `POST /api/v1/habits` (create)

Body change:
- Removed: `daily_target`, `duration_minutes`
- Added: `expected_duration` (optional, int > 0)

### `PATCH /api/v1/habits/{habit_id}` (update)

Body change:
- Removed: `daily_target`, `duration_minutes`
- Added: `expected_duration` (optional, int > 0)

### `GET /api/v1/dashboard` & `GET /api/v1/dashboard/weekly`

- `days` array now contains **21 entries** (was 7)
- `week_start` / `week_end` now span 21 days
- Uses user's timezone from their profile

---

## Deprecated Endpoints (still work but will be removed)

| Endpoint | Replacement |
|---|---|
| `POST /habits/{id}/checkin` | `POST /habits/{id}/toggle` |
| `GET /habits/{id}/checkins` | Use `today_log` on HabitResponse |

---

## Response Schemas

### HabitResponse
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Morning Run",
  "category": "fitness",
  "reminder_time": "07:00:00",
  "expected_duration": 30,
  "is_active": true,
  "streak": {
    "current_streak": 5,
    "longest_streak": 12,
    "last_checkin_date": "2026-04-20"
  },
  "today_log": {
    "id": 1,
    "habit_id": "uuid",
    "user_id": "uuid",
    "date": "2026-04-20",
    "is_completed": true,
    "actual_duration": 35,
    "completed_at": "2026-04-20T07:30:00Z",
    "created_at": "...",
    "updated_at": "..."
  },
  "created_at": "...",
  "updated_at": "..."
}
```

### HabitLogResponse
```json
{
  "id": 1,
  "habit_id": "uuid",
  "user_id": "uuid",
  "date": "2026-04-20",
  "is_completed": true,
  "actual_duration": 35,
  "completed_at": "2026-04-20T07:30:00Z",
  "created_at": "...",
  "updated_at": "..."
}
```

---

## Frontend Action Items

1. **Remove** all references to `daily_target` and `duration_minutes` from forms, state, and displays
2. **Add** `expected_duration` field to habit create/edit forms (optional, minutes)
3. **Replace** checkin button/action with a call to `POST /habits/{id}/toggle`
4. **Use `today_log`** from the habit list response to show completion state — no need for a separate checkin fetch
5. **Handle toggle idempotency** — tapping the same habit again undoes it
6. **Update dashboard** — `days` array is now 21 items; adjust charts/calendars accordingly
7. **Show `actual_duration`** if relevant — editable via `PUT /habits/{id}/log/{date}`
8. **Pass `tz` query param** on `GET /habits` if the user can override timezone in the UI
9. **Streak display** — the toggle response includes the updated streak; update UI optimistically
