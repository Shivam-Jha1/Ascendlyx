# AI Insights — Implementation Reference

> **Design principle**: Compute once, serve many times.  
> A Celery beat task runs nightly and computes all insights for every active user, stores them in Postgres, and caches in Redis. AI enrichment (Ollama) is called per snapshot. Habit toggles trigger a high-priority per-user recompute immediately.

---

## Table of Contents

1. [New Database Models](#1-new-database-models)
2. [Alembic Migration](#2-alembic-migration)
3. [Pydantic Schemas](#3-pydantic-schemas)
4. [InsightsService](#4-insightsservice)
5. [Celery App & Workers](#5-celery-app--workers)
6. [API Endpoints](#6-api-endpoints)
7. [Modified Files](#7-modified-files)
8. [Exceptions Added](#8-exceptions-added)
9. [Metrics](#9-metrics)
10. [Tests](#10-tests)
11. [Architecture Flow](#11-architecture-flow)

---

## 1. New Database Models

### `app/models/daily_insight_snapshot.py`

One row per `(user_id, snapshot_date)`. Computed nightly and also after every habit toggle.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Auto-generated |
| `user_id` | UUID FK → users | Cascade delete |
| `snapshot_date` | Date | The day this snapshot covers |
| `habits_completed` | Integer | How many habits were completed that day |
| `habits_total` | Integer | Total habits that existed that day |
| `completion_rate` | Float | `habits_completed / habits_total` (0.0–1.0) |
| `avg_actual_duration` | Integer? | Mean minutes spent on completed habits |
| `most_productive_hour` | Integer? | 0–23 hour when most habits were completed |
| `computed_at` | DateTime TZ | When this snapshot was last computed |

Unique constraint: `(user_id, snapshot_date)`.

---

### `app/models/weekly_insight_snapshot.py`

Aggregated ISO week (Mon–Sun) snapshot, enriched by Ollama.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Auto-generated |
| `user_id` | UUID FK → users | Cascade delete |
| `week_start` | Date | Monday of the ISO week |
| `week_end` | Date | Sunday of the ISO week |
| `habits_completed` | Integer | Total completed habits this week |
| `habits_total_possible` | Integer | Total habit-log slots this week |
| `prev_week_habits_completed` | Integer | Completed habits the prior week |
| `consistency_score` | Float | Active days / 7 (0.0–1.0) |
| `avg_daily_completion` | Float | Mean daily completion rate (0.0–1.0) |
| `most_productive_time` | String? | Human label e.g. `"Morning (8am-12pm)"` |
| `goal_progress_score` | Float | Weighted goal + milestone progress (0.0–1.0) |
| `ai_productivity_score` | Integer? | 0–100 score from Ollama (null until enriched) |
| `ai_score_rating` | String? | `"Poor"` / `"Fair"` / `"Good"` / `"Great"` / `"Excellent"` |
| `ai_percentile` | Integer? | % of users with a lower score this week |
| `ai_coach_message` | String? | Short coaching message from Ollama (≤600 chars) |
| `smart_nudges` | JSON? | List of 2–3 actionable tips from Ollama |
| `is_stale` | Boolean | `True` until AI enrichment completes |
| `ai_computed_at` | DateTime TZ? | When Ollama last enriched this snapshot |
| `computed_at` | DateTime TZ | When the math aggregation last ran |

Unique constraint: `(user_id, week_start)`.

---

### `app/models/user_insight_streak.py`

Tracks how many consecutive weeks a user has had insight data computed.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Auto-generated |
| `user_id` | UUID FK → users | Unique, cascade delete |
| `current_streak` | Integer | Current consecutive weeks |
| `longest_streak` | Integer | All-time best |
| `last_active_week` | Date? | Monday of the most recent active week |
| `updated_at` | DateTime TZ | Last update timestamp |

---

## 2. Alembic Migration

**File**: `alembic/versions/h8i9j0k1l2m3_add_insight_tables.py`  
**Revision**: `h8i9j0k1l2m3`  
**Revises**: `g7h8i9j0k1l2`

### What it does

1. **Extends `criteriatype` enum** — adds `weekly_ai_score` value (PostgreSQL only).
2. **Creates `daily_insight_snapshots`** table with indexes.
3. **Creates `weekly_insight_snapshots`** table with indexes.
4. **Creates `user_insight_streaks`** table with unique index.
5. **Seeds 2 badge definitions** for `weekly_ai_score`:
   - `ai_achiever_bronze` — threshold 60 (🥉)
   - `ai_achiever_gold` — threshold 85 (🥇)

### Run it

```bash
alembic upgrade h8i9j0k1l2m3
# or simply:
alembic upgrade head
```

---

## 3. Pydantic Schemas

**File**: `app/schemas/insights.py`

| Schema | Used by |
|--------|---------|
| `DailyInsightResponse` | `GET /ai-insights/daily` |
| `WeeklyInsightResponse` | `GET /ai-insights/weekly`, `POST /ai-insights/refresh` |
| `InsightStreakResponse` | `GET /ai-insights/status` |
| `InsightStatusResponse` | `GET /ai-insights/status` |
| `InsightRefreshResponse` | `POST /ai-insights/refresh` |

---

## 4. InsightsService

**File**: `app/services/insights_service.py`

### Public methods

| Method | Description |
|--------|-------------|
| `compute_daily_snapshot(user_id, date)` | Upserts `DailyInsightSnapshot` for one user/day |
| `compute_weekly_snapshot(user_id, week_start)` | Aggregates daily snapshots for the week, upserts `WeeklyInsightSnapshot` |
| `enrich_with_ai(snap)` | Calls Ollama; falls back to mathematical score if unreachable |
| `manual_refresh(user_id, tz)` | Rate-limited full recompute + AI enrichment for current week |
| `run_nightly_for_user(user_id, tz)` | Full pipeline called by the nightly Celery task |
| `get_latest_weekly(user_id)` | Reads DB (Redis TTL hint) |
| `get_latest_daily(user_id)` | Reads DB |
| `get_insight_streak(user_id)` | Reads DB |

### Scoring formulas

**`goal_progress_score`** (0.0–1.0):
```
Each goal   = 5 points weight
Each milestone = 1 point weight
achieved_weight / total_weight   (capped at 1.0; 0.5 if no goals)
```

**`consistency_score`** (0.0–1.0):
```
days_with_at_least_1_completion / 7
```

**`avg_daily_completion`** (0.0–1.0):
```
total_habits_completed_this_week / total_habit_slots_this_week
```

**Mathematical AI fallback score** (when Ollama unavailable):
```
score = int((avg_daily_completion × 0.5 + consistency_score × 0.3 + goal_progress_score × 0.2) × 100)
```

**Rating thresholds**:

| Score | Rating |
|-------|--------|
| ≥ 90 | Excellent |
| ≥ 75 | Great |
| ≥ 55 | Good |
| ≥ 35 | Fair |
| < 35 | Poor |

### Redis cache

- **Key**: `insights:weekly:{user_id}:{week_start}`  
- **TTL**: 3600 seconds (1 hour)  
- Invalidated after every nightly run.

### Rate limit key

- **Key**: `insights:refresh_lock:{user_id}`  
- **TTL**: 7200 seconds (2 hours between manual refreshes)

### Ollama prompt structure

Calls `POST /api/chat` on the configured `OLLAMA_BASE_URL` with `format: "json"`. Expected JSON response:

```json
{
  "score": 78,
  "rating": "Great",
  "coach_message": "You're on a great trajectory!",
  "smart_nudges": ["Tip 1", "Tip 2", "Tip 3"]
}
```

Timeout: 15 seconds. Any exception triggers the mathematical fallback silently.

---

## 5. Celery App & Workers

### `app/tasks/celery_app.py` (replaced placeholder)

```python
celery_app = Celery("ascendlyx", broker=REDIS_URL, backend=REDIS_URL)
# Beat schedule: nightly at 00:30 UTC
beat_schedule = {
    "nightly-insights": {
        "task": "app.workers.insights_worker.compute_nightly_all_users",
        "schedule": crontab(hour=0, minute=30),
    }
}
```

### `app/workers/insights_worker.py`

| Task | Queue | Description |
|------|-------|-------------|
| `compute_nightly_all_users` | default | Fan-out: enqueues one `compute_nightly_for_user` per active user |
| `compute_nightly_for_user(user_id, tz)` | default | Runs full pipeline for one user (daily + weekly + AI + streak) |
| `recompute_today_snapshot(user_id, tz)` | `high_priority` | Triggered after every habit toggle; recomputes today's daily snapshot and marks weekly as stale |

### Starting workers

```bash
# Worker
celery -A app.tasks.celery_app.celery_app worker --loglevel=info -Q default,high_priority

# Beat scheduler
celery -A app.tasks.celery_app.celery_app beat --loglevel=info
```

---

## 6. API Endpoints

All endpoints require `Authorization: Bearer <access_token>`.

Base prefix: `/api/v1/ai-insights`

---

### `GET /ai-insights/weekly`

Returns the most recent `WeeklyInsightSnapshot` for the authenticated user.

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "week_start": "2026-04-20",
  "week_end": "2026-04-26",
  "habits_completed": 12,
  "habits_total_possible": 21,
  "prev_week_habits_completed": 9,
  "consistency_score": 0.857,
  "avg_daily_completion": 0.571,
  "most_productive_time": "Morning (8am-12pm)",
  "goal_progress_score": 0.6,
  "ai_productivity_score": 78,
  "ai_score_rating": "Great",
  "ai_percentile": 72,
  "ai_coach_message": "You're on a great trajectory!",
  "smart_nudges": ["Tip 1", "Tip 2", "Tip 3"],
  "is_stale": false,
  "computed_at": "2026-04-21T00:30:00Z",
  "ai_computed_at": "2026-04-21T00:31:05Z"
}
```

**Errors**:
- `401` — not authenticated
- `404` — no snapshot computed yet (run `/refresh` first)

---

### `GET /ai-insights/daily`

Returns the most recent `DailyInsightSnapshot` for the authenticated user.

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "snapshot_date": "2026-04-21",
  "habits_completed": 3,
  "habits_total": 5,
  "completion_rate": 0.6,
  "avg_actual_duration": 28,
  "most_productive_hour": 9,
  "computed_at": "2026-04-21T10:15:00Z"
}
```

**Errors**:
- `401` — not authenticated
- `404` — no snapshot computed yet

---

### `GET /ai-insights/status`

Returns insight streak + latest weekly snapshot in a single call.

**Response** `200 OK`:
```json
{
  "has_data": true,
  "streak": {
    "user_id": "uuid",
    "current_streak": 3,
    "longest_streak": 5,
    "last_active_week": "2026-04-20",
    "updated_at": "2026-04-21T00:30:00Z"
  },
  "latest_weekly": { "...WeeklyInsightResponse..." }
}
```

When no data exists yet: `{ "has_data": false, "streak": null, "latest_weekly": null }`

**Errors**:
- `401` — not authenticated

---

### `POST /ai-insights/refresh`

Manually triggers a full insight recompute for the current week.  
**Rate-limited** to once every 2 hours per user.

**Request body**: none

**Response** `200 OK`:
```json
{
  "message": "Insights refreshed successfully.",
  "snapshot": { "...WeeklyInsightResponse..." }
}
```

**Errors**:
- `401` — not authenticated
- `429` — refresh attempted within 2-hour cooldown

---

### `GET /ai-insights/score` *(legacy)*

Returns the latest `AIScore` record (unchanged from before).

**Response** `200 OK` or `null` if no score exists.

---

### `POST /ai-insights/score/calculate` *(legacy)*

Triggers a legacy AI score recalculation (unchanged from before).

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "score": 65,
  "breakdown": {
    "completion_rate": 0.714,
    "streak_consistency": 0.5,
    "goal_progress_rate": 0.5
  },
  "calculated_at": "2026-04-21T10:00:00Z"
}
```

---

## 7. Modified Files

### `app/models/__init__.py`

Added imports:
```python
from app.models.daily_insight_snapshot import DailyInsightSnapshot
from app.models.weekly_insight_snapshot import WeeklyInsightSnapshot
from app.models.user_insight_streak import UserInsightStreak
```

---

### `app/models/badge.py`

Added `WEEKLY_AI_SCORE` to `CriteriaType` enum:
```python
class CriteriaType(str, enum.Enum):
    ...
    WEEKLY_AI_SCORE = "weekly_ai_score"
```

---

### `app/services/badge_service.py`

- Added import: `from app.models.weekly_insight_snapshot import WeeklyInsightSnapshot`
- Extended `_compute_stats()` to query the latest `ai_productivity_score` from `weekly_insight_snapshots` and return it as `"weekly_ai_score"` in the stats dict.

---

### `app/services/habit_service.py`

In `toggle_habit_completion()`, after the streak update, added a fire-and-forget Celery dispatch:
```python
try:
    from app.workers.insights_worker import recompute_today_snapshot
    recompute_today_snapshot.delay(str(user_id), user_timezone)
except Exception:
    pass  # silently skip if Celery broker is unavailable
```

---

### `app/api/v1/ai_insights.py`

Added 4 new endpoints (`GET /weekly`, `GET /daily`, `GET /status`, `POST /refresh`) alongside the 2 existing legacy score endpoints.

---

### `app/core/exceptions.py`

Added 3 new exception classes:
```python
InsightSnapshotNotFoundException   # 404
InsightRefreshRateLimitException   # 429
AIInsightComputationException      # 500
```

---

## 8. Exceptions Added

| Class | HTTP Status | Default message |
|-------|-------------|-----------------|
| `InsightSnapshotNotFoundException` | 404 | "No insight snapshot found for this period" |
| `InsightRefreshRateLimitException` | 429 | "Insight refresh is rate-limited. Please try again in 2 hours." |
| `AIInsightComputationException` | 500 | "Failed to compute AI insight" |

---

## 9. Metrics

**File**: `app/core/metrics.py`

Lightweight in-process counters (no external Prometheus server required in dev/test).

| Constant | Type | Description |
|----------|------|-------------|
| `INSIGHT_NIGHTLY_RUNS` | counter | Total nightly batch runs |
| `INSIGHT_NIGHTLY_ERRORS` | counter | Failed nightly runs |
| `INSIGHT_AI_ENRICHMENTS` | counter | Successful Ollama calls |
| `INSIGHT_AI_FAILURES` | counter | Failed Ollama calls (fallback used) |
| `INSIGHT_MANUAL_REFRESHES` | counter | Successful manual refreshes |
| `INSIGHT_RATE_LIMITED` | counter | Refreshes blocked by rate limit |
| `INSIGHT_COMPUTE_SECONDS` | histogram | Time taken to compute a snapshot |

Usage:
```python
from app.core.metrics import increment, observe, INSIGHT_MANUAL_REFRESHES
increment(INSIGHT_MANUAL_REFRESHES)
```

---

## 10. Tests

**File**: `tests/test_insights.py` — **39 tests**, all passing.

| Test class | Count | What it covers |
|------------|-------|----------------|
| `TestPureFunctions` | 10 | `_week_bounds`, `_hour_to_label`, `_score_to_rating`, `_mathematical_ai_score` |
| `TestGetWeeklyInsight` | 4 | 404 when no data, snapshot fields, AI fields, auth check |
| `TestGetDailyInsight` | 4 | 404 when no data, fields present, completion rate, auth check |
| `TestGetInsightStatus` | 4 | `has_data=false`, `has_data=true`, streak init, auth check |
| `TestRefreshInsights` | 7 | Creates snapshot, AI score, rate limit 429, Ollama fallback, empty user, auth, percentile type |
| `TestInsightStreak` | 2 | Streak starts at 1, no double-increment same week |
| `TestHabitToggleEnqueuesWorker` | 2 | No raise without Celery, `.delay()` called when Celery available |
| `TestBadgeWeeklyAIScore` | 2 | `CriteriaType.WEEKLY_AI_SCORE` value, stats key present |
| `TestLegacyScoreEndpoints` | 4 | Legacy score endpoints still work (regression) |

Run:
```bash
pytest tests/test_insights.py -v
```

---

## 11. Architecture Flow

```
                          ┌─────────────────────────────┐
                          │   Celery Beat (00:30 UTC)    │
                          └──────────────┬──────────────┘
                                         │ compute_nightly_all_users
                                         ▼
                          ┌─────────────────────────────┐
                          │  compute_nightly_for_user   │  ×N users
                          │  (one Celery task per user) │
                          └──────────────┬──────────────┘
                                         │
                          ┌──────────────▼──────────────┐
                          │       InsightsService        │
                          │  1. compute_daily_snapshot  │
                          │  2. compute_weekly_snapshot  │
                          │  3. enrich_with_ai (Ollama) │
                          │  4. update_insight_streak    │
                          └──────────────┬──────────────┘
                                         │ flush + commit
                                    Postgres + Redis bust

──────────────────────────────────────────────────────────────

  User toggles habit
      │
      ▼
  habit_service.toggle_habit_completion()
      │
      ├─ updates HabitLog, Streak
      │
      └─ recompute_today_snapshot.delay()  ←── high_priority queue
              │
              ▼
         InsightsService.compute_daily_snapshot(today)
         + marks weekly snapshot is_stale=True

──────────────────────────────────────────────────────────────

  User calls POST /ai-insights/refresh
      │
      ├─ checks Redis rate-limit key (TTL 2h)  → 429 if present
      │
      └─ InsightsService.manual_refresh()
              │
              ├─ compute_daily_snapshot(today)
              ├─ compute_weekly_snapshot(week_start)
              ├─ enrich_with_ai()  ←── Ollama call (15s timeout)
              └─ update_insight_streak()
```
