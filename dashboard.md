# Ascendlyx Dashboard API

Dashboard module for the Ascendlyx backend — covers Habits, Streaks, Goals, weekly analytics, and AI productivity scoring.

## Base URL

```
http://localhost:3000/api/v1
```

All endpoints require `Authorization: Bearer <access_token>` header.

---

## Database Tables

| Table | Description |
|---|---|
| `habits` | User habits — category, soft-delete, optimistic locking via `version` |
| `habit_checkins` | Per-checkin records with composite index on `(habit_id, checked_at)` |
| `streaks` | 1:1 with habits — tracks `current_streak`, `longest_streak`, `last_checkin_date` |
| `goals` | User goals with `Decimal` target/current values and `is_completed` flag |
| `goal_progress_logs` | Delta-based log entry per progress update |
| `ai_scores` | AI score 0–100 with `JSONB` breakdown and `calculated_at` timestamp |
| `users.timezone` | Added column (default `"UTC"`) for streak timezone support |

---

## Habit Categories

```
fitness | study | mindfulness | reading | custom
```

---

## Habits

### List Habits
```
GET /habits
```
Returns all active (non-deleted) habits for the current user with streak info attached.

Response `200`:
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Morning Run",
    "category": "fitness",
    "reminder_time": "07:00:00",
    "duration_minutes": 30,
    "daily_target": 1,
    "is_active": true,
    "streak": {
      "current_streak": 5,
      "longest_streak": 12,
      "last_checkin_date": "2026-03-27"
    },
    "created_at": "2026-03-01T10:00:00Z",
    "updated_at": "2026-03-28T08:00:00Z"
  }
]
```

---

### Create Habit
```
POST /habits
```
```json
{
  "name": "Read 30 minutes",
  "category": "reading",
  "reminder_time": "21:00:00",
  "duration_minutes": 30,
  "daily_target": 1
}
```
Response `201`: `HabitResponse` (same shape as above, streak starts at 0)

---

### Update Habit
```
PATCH /habits/{habit_id}
```
All fields are optional — only send what you want to change.
```json
{
  "name": "Read 45 minutes",
  "reminder_time": "20:30:00",
  "is_active": false
}
```
Response `200`: updated `HabitResponse`

---

### Delete Habit (Soft Delete)
```
DELETE /habits/{habit_id}
```
Sets `deleted_at = now()` and `is_active = false`. Habit is hidden from list but data is preserved.

Response `204`: No content

---

### Check In on a Habit
```
POST /habits/{habit_id}/checkin
```
Records a check-in. Automatically updates the streak. Uses optimistic locking — if the habit was modified concurrently, returns `409`.
```json
{
  "note": "Felt great!",
  "checked_at": "2026-03-28T07:30:00Z"
}
```
Both fields are optional. `checked_at` defaults to now if omitted.

Response `201`:
```json
{
  "id": "uuid",
  "habit_id": "uuid",
  "user_id": "uuid",
  "checked_at": "2026-03-28T07:30:00Z",
  "note": "Felt great!",
  "created_at": "2026-03-28T07:30:01Z"
}
```

> `409 Conflict` if optimistic lock fails — retry the request.

---

### Get Check-Ins for a Habit
```
GET /habits/{habit_id}/checkins?from_date=&to_date=
```
Query params:

| Param | Type | Required | Description |
|---|---|---|---|
| `from_date` | datetime (ISO 8601) | No | Start of range (inclusive) |
| `to_date` | datetime (ISO 8601) | No | End of range (inclusive) |

Response `200`: array of `CheckinResponse`

---

## Goals

### List Goals
```
GET /goals?include_completed=false
```
| Param | Type | Default | Description |
|---|---|---|---|
| `include_completed` | bool | `false` | Set to `true` to include completed goals |

Response `200`:
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "title": "Run 100km this month",
    "target_value": "100.00",
    "current_value": "42.50",
    "unit": "km",
    "deadline": "2026-03-31",
    "category": "fitness",
    "is_completed": false,
    "progress_percentage": 42.5,
    "created_at": "2026-03-01T00:00:00Z",
    "updated_at": "2026-03-28T08:00:00Z"
  }
]
```

> `progress_percentage` is a computed field — not stored in DB.

---

### Create Goal
```
POST /goals
```
```json
{
  "title": "Read 10 books",
  "target_value": "10",
  "unit": "books",
  "deadline": "2026-12-31",
  "category": "reading"
}
```
Response `201`: `GoalResponse`

---

### Update Goal
```
PATCH /goals/{goal_id}
```
All fields are optional.
```json
{
  "title": "Read 12 books",
  "deadline": "2026-11-30"
}
```
Response `200`: updated `GoalResponse`

---

### Update Goal Progress
```
PATCH /goals/{goal_id}/progress
```
Adds a delta to `current_value`. Automatically sets `is_completed = true` when `current_value >= target_value`. Also writes a row to `goal_progress_logs`.
```json
{
  "delta": 5.5,
  "note": "Long run on Saturday"
}
```
`note` is optional.

Response `200`: updated `GoalResponse` (with new `current_value` and `progress_percentage`)

---

### Get Progress Logs
```
GET /goals/{goal_id}/progress-logs
```
Returns the history of all progress updates for a goal.

Response `200`:
```json
[
  {
    "id": "uuid",
    "goal_id": "uuid",
    "delta": "5.50",
    "note": "Long run on Saturday",
    "logged_at": "2026-03-28T10:00:00Z",
    "created_at": "2026-03-28T10:00:01Z"
  }
]
```

---

### Delete Goal
```
DELETE /goals/{goal_id}
```
Hard deletes the goal (and cascades to progress logs).

Response `204`: No content

---

## Dashboard

### Full Dashboard
```
GET /dashboard
```
Single call that returns the complete dashboard state — habits with streaks, goals with progress, AI score, and weekly analytics.

Response `200`:
```json
{
  "habits": [ /* HabitResponse[] */ ],
  "goals": [ /* GoalResponse[] */ ],
  "ai_score": {
    "id": "uuid",
    "user_id": "uuid",
    "score": 74,
    "breakdown": {
      "completion_rate": 0.857,
      "streak_consistency": 0.4,
      "goal_progress_rate": 0.667
    },
    "calculated_at": "2026-03-28T06:00:00Z"
  },
  "weekly_summary": {
    "week_start": "2026-03-23",
    "week_end": "2026-03-29",
    "days": [
      { "date": "2026-03-23", "checkins_count": 3, "habits_completed": 3 },
      { "date": "2026-03-24", "checkins_count": 2, "habits_completed": 2 },
      { "date": "2026-03-25", "checkins_count": 0, "habits_completed": 0 },
      { "date": "2026-03-26", "checkins_count": 3, "habits_completed": 3 },
      { "date": "2026-03-27", "checkins_count": 3, "habits_completed": 3 },
      { "date": "2026-03-28", "checkins_count": 1, "habits_completed": 1 },
      { "date": "2026-03-29", "checkins_count": 0, "habits_completed": 0 }
    ],
    "total_checkins": 12,
    "completion_rate": 57.1
  }
}
```

---

### Weekly Analytics Only
```
GET /dashboard/weekly
```
Same `WeeklySummary` object as inside the full dashboard — lighter call if you only need the weekly breakdown.

Response `200`:
```json
{
  "week_start": "2026-03-23",
  "week_end": "2026-03-29",
  "days": [ /* DaySummary[7] */ ],
  "total_checkins": 12,
  "completion_rate": 57.1
}
```

---

## AI Insights

### Get Latest AI Score
```
GET /ai-insights/score
```
Returns the most recently calculated AI productivity score. Returns `null` if none has been calculated yet.

Response `200`:
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "score": 74,
  "breakdown": {
    "completion_rate": 0.857,
    "streak_consistency": 0.4,
    "goal_progress_rate": 0.667
  },
  "calculated_at": "2026-03-28T06:00:00Z"
}
```

> `score` is 0–100. Higher = more consistent.

---

### Recalculate AI Score
```
POST /ai-insights/score/calculate
```
Triggers an on-demand AI score recalculation based on the current data.

**Scoring formula:**
| Factor | Weight | How it's measured |
|---|---|---|
| 7-day completion rate | 40% | Distinct days with any checkin / 7 |
| Streak consistency | 30% | `avg(current_streak)` across habits / 30, capped at 1.0 |
| Goal progress rate | 30% | Goals with ≥ 50% progress / total active goals |

Response `200`: `AIScoreResponse` (same shape as above, freshly computed)

---

## Error Responses

| Status | Code | Meaning |
|---|---|---|
| `401` | — | Missing or expired access token |
| `403` | — | Action not permitted on this resource |
| `404` | — | Habit or goal not found (or belongs to another user) |
| `409` | — | Optimistic lock conflict on checkin — retry |
| `422` | — | Validation error — response includes field-level detail |

---

## Angular Integration Notes

- All protected endpoints need `Authorization: Bearer <access_token>` — use an HTTP interceptor
- `PATCH /goals/{id}/progress` is additive (delta), not a set operation
- Use `GET /dashboard` on app launch for one-shot data loading; use individual endpoints for targeted updates
- After a `POST /habits/{id}/checkin`, refresh the habit list or streak display to show updated streak values
- After a `POST /ai-insights/score/calculate`, poll or subscribe to display the new score
