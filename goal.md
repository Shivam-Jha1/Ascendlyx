# Goals API — Implementation Documentation

## Overview

Full milestone-aware Goals API supporting dynamic, user-defined milestones (0 to N per goal).
Progress is auto-computed from either numeric `target_value` or milestone completion count.

---

## Files Changed / Created

### New Files

| File | Description |
|------|-------------|
| `app/models/goal_milestone.py` | `GoalMilestone` SQLAlchemy model |
| `alembic/versions/a1b2c3d4e5f6_add_goal_milestones.py` | Alembic migration |

### Modified Files

| File | What Changed |
|------|-------------|
| `app/models/goal.py` | Added `description`, `priority`, `deleted_at` columns; `milestones` relationship; computed properties |
| `app/schemas/goal.py` | Full rewrite — added `MilestoneCreate`, `MilestoneUpdate`, `MilestoneResponse`; updated all goal schemas |
| `app/services/goal_service.py` | Full rewrite — 6 service methods with milestone logic, caching, soft delete |
| `app/api/v1/goals.py` | Full rewrite — 7 endpoints including milestone toggle and single-goal GET |
| `app/models/__init__.py` | Added `GoalMilestone` import for SQLAlchemy table registration |
| `alembic/env.py` | Added `GoalMilestone` import for Alembic autogenerate detection |
| `tests/test_goals.py` | Full rewrite — 28 tests covering all scenarios |

---

## Database Schema

### `goal_milestones` table (new)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | default `uuid4` |
| `goal_id` | UUID FK → `goals.id` | `ON DELETE CASCADE`, not null |
| `label` | VARCHAR(200) | not null |
| `is_completed` | BOOLEAN | default `false`, not null |
| `sort_order` | INTEGER | default `0`, not null — preserves user-defined order |
| `created_at` | TIMESTAMPTZ | server default `now()` |
| `updated_at` | TIMESTAMPTZ | server default `now()` |

**Indexes:**
- `ix_goal_milestones_goal_sort` on `(goal_id, sort_order)` — ordered fetching
- `ix_goal_milestones_goal_completed` on `(goal_id, is_completed)` — fast progress aggregation

**RLS Policy:**
```sql
CREATE POLICY goal_milestones_user_isolation ON goal_milestones
USING (
    goal_id IN (
        SELECT id FROM goals WHERE user_id = current_setting('app.user_id')::uuid
    )
);
```

### `goals` table (modified columns)

| Column | Change |
|--------|--------|
| `description` | Added — TEXT, default `""` |
| `priority` | Added — VARCHAR(10), default `"medium"` |
| `deleted_at` | Added — TIMESTAMPTZ nullable (soft delete) |
| `target_value` | Changed from NOT NULL → nullable (milestone-only goals have no target) |
| `unit` | Changed from NOT NULL → nullable |

---

## Pydantic Schemas (`app/schemas/goal.py`)

### `MilestoneCreate`
```python
label: str  # min 1, max 200 chars, auto-stripped of whitespace
```

### `MilestoneResponse`
```python
id, goal_id, label, is_completed, sort_order, created_at
```

### `GoalCreate`
```python
title:        str             # required, min 1, max 200
description:  str             # default ""
priority:     "high"|"medium"|"low"  # default "medium"
deadline:     date | None
target_value: Decimal | None  # >= 0
unit:         str | None      # max 30 chars
category:     str             # default "general"
milestones:   list[MilestoneCreate]  # default [], case-insensitive dedup applied
```

### `GoalUpdate`
```python
# All fields optional. milestones=None → untouched. milestones=[] → all deleted.
title, description, priority, deadline, target_value, unit, category, milestones
```

### `GoalResponse`
```python
id, user_id, title, description, priority, deadline,
target_value, current_value, unit, category, is_completed, created_at,
milestones: list[MilestoneResponse],
progress_percentage: float,    # computed
completed_milestones: int,     # computed
total_milestones: int          # computed
```

---

## Progress Computation Logic

```
if goal.target_value > 0:
    progress = min(current_value / target_value * 100, 100.0)
elif len(milestones) > 0:
    progress = completed_milestones / total_milestones * 100
else:
    progress = 0.0
```

---

## API Endpoints

Base prefix: `/api/v1/goals`  
All endpoints require: `Authorization: Bearer <access_token>`

---

### `GET /api/v1/goals`

List all goals for the authenticated user.

**Query params:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `include_completed` | bool | `true` | Set `false` to hide completed goals |

**Response:** `200 OK` — `list[GoalResponse]`

Ordered by: priority (`high → medium → low`), then `created_at DESC`.  
Soft-deleted goals are always excluded.  
Result is Redis-cached for 5 minutes per user (`goals:{user_id}`).

---

### `POST /api/v1/goals`

Create a new goal with optional milestones.

**Body:** `GoalCreate`

```json
{
  "title": "Learn FastAPI",
  "description": "Complete the course",
  "priority": "high",
  "deadline": "2026-12-31",
  "target_value": null,
  "unit": null,
  "category": "education",
  "milestones": [
    { "label": "Read the docs" },
    { "label": "Build a project" },
    { "label": "Write tests" }
  ]
}
```

**Response:** `201 Created` — `GoalResponse`

- Milestone `sort_order` is assigned by position index (0-based)
- Duplicate milestone labels (case-insensitive) are automatically removed
- `milestones: []` creates a numeric-only goal

---

### `GET /api/v1/goals/{goal_id}`

Get a single goal by ID.

**Response:** `200 OK` — `GoalResponse`  
**Errors:** `404` if not found or soft-deleted

---

### `PATCH /api/v1/goals/{goal_id}`

Update a goal's fields and/or milestones.

**Body:** `GoalUpdate` (all fields optional)

```json
// Update title only — milestones untouched
{ "title": "New Title" }

// Replace all milestones (fresh start, all is_completed=false)
{ "milestones": [{ "label": "X" }, { "label": "Y" }] }

// Remove all milestones
{ "milestones": [] }
```

**Response:** `200 OK` — `GoalResponse`  
**Errors:** `404` if not found, `403` if owned by another user

**Milestone replacement rules:**
- `milestones` key **omitted** → existing milestones preserved
- `milestones: [...]` → all existing milestones deleted, replaced in order
- `milestones: []` → all milestones deleted; goal becomes numeric-only

---

### `DELETE /api/v1/goals/{goal_id}`

Soft-delete a goal (sets `deleted_at`, hides from all list/get responses).  
Milestone rows are **preserved** in the DB for audit purposes.

**Response:** `204 No Content`  
**Errors:** `404` if not found, `403` if owned by another user

---

### `PATCH /api/v1/goals/{goal_id}/milestones/{milestone_id}/toggle`

Toggle a milestone's `is_completed` status.

**Response:** `200 OK` — full `GoalResponse`  
Returns the complete goal so the client can update the progress bar and completion state in one response.

**Auto-progress update** (milestone-based goals only):
- Recomputes `current_value` as `completed / total * 100`
- Sets `goal.is_completed = true` when all milestones are completed
- Unsets `goal.is_completed` when any milestone is uncompleted

**Errors:**
- `404` if goal not found
- `403` if goal owned by another user
- `404` if `milestone_id` not found in this goal

---

### `PATCH /api/v1/goals/{goal_id}/progress`

Update numeric progress on a goal with a `target_value`.

**Body:**
```json
{ "delta": 25.5, "note": "Morning run" }
```

| Field | Type | Description |
|-------|------|-------------|
| `delta` | Decimal | Amount to add to `current_value` (can be negative) |
| `note` | str \| null | Optional log note |

**Response:** `200 OK` — `GoalResponse`

- `current_value` is clamped to `[0, target_value]`
- `is_completed` set to `true` when `current_value >= target_value`
- Progress update is logged to `goal_progress_logs` table

**Errors:**
- `422` if goal has no `target_value` (milestone-based goal — use toggle instead)
- `404` if not found, `403` if owned by another user

---

### `GET /api/v1/goals/{goal_id}/progress-logs`

Get all numeric progress log entries for a goal, ordered by `logged_at DESC`.

**Response:** `200 OK` — `list[GoalProgressLogResponse]`

```json
[
  { "id": "...", "goal_id": "...", "delta": 25.5, "note": "Morning run", "logged_at": "...", "created_at": "..." }
]
```

---

## Endpoint Summary Table

| Method | Path | Status | Description |
|--------|------|--------|-------------|
| `GET` | `/api/v1/goals` | `200` | List all user goals |
| `POST` | `/api/v1/goals` | `201` | Create goal with optional milestones |
| `GET` | `/api/v1/goals/{goal_id}` | `200` | Get single goal |
| `PATCH` | `/api/v1/goals/{goal_id}` | `200` | Update goal fields / replace milestones |
| `DELETE` | `/api/v1/goals/{goal_id}` | `204` | Soft-delete goal |
| `PATCH` | `/api/v1/goals/{goal_id}/milestones/{milestone_id}/toggle` | `200` | Toggle milestone + auto-update progress |
| `PATCH` | `/api/v1/goals/{goal_id}/progress` | `200` | Increment numeric progress |
| `GET` | `/api/v1/goals/{goal_id}/progress-logs` | `200` | Get progress log history |

---

## Redis Caching

| Cache Key | TTL | Invalidated By |
|-----------|-----|----------------|
| `goals:{user_id}` | 5 min | `create_goal`, `update_goal`, `delete_goal`, `toggle_milestone`, `update_progress` |

Cache misses fall through to PostgreSQL. All Redis errors are silently caught so the API stays available if Redis is down.

---

## Test Coverage (`tests/test_goals.py`)

28 tests across 7 test classes:

| Test | Assertion |
|------|-----------|
| `test_create_goal_no_milestones` | `milestones==[]`, `total_milestones==0`, `progress==0.0` |
| `test_create_goal_with_milestones` | 3 milestones, sort_orders `[0,1,2]`, all incomplete |
| `test_create_goal_deduplicates_milestones` | Case-insensitive dedup → 2 milestones from 3 |
| `test_create_goal_requires_auth` | 401 without token |
| `test_create_goal_missing_title_422` | 422 validation error |
| `test_list_goals_empty` | empty list |
| `test_list_goals_returns_created` | created goal appears |
| `test_get_goals_excludes_completed_when_filtered` | `include_completed=false` hides completed |
| `test_goals_ordered_by_priority_then_date` | high → medium → low ordering |
| `test_get_goal_by_id` | correct goal returned |
| `test_get_goal_not_found` | 404 |
| `test_toggle_milestone_increments_progress` | 1/4 → 25%, 2/4 → 50% |
| `test_toggle_milestone_completes_goal` | all toggled → `is_completed=true`, 100% |
| `test_toggle_milestone_uncomplete` | un-toggle → `is_completed=false`, 50% |
| `test_toggle_milestone_wrong_user_returns_403` | 403 cross-user |
| `test_toggle_milestone_wrong_goal_id_returns_404` | 404 fake goal |
| `test_milestone_sort_order_preserved` | labels in correct order |
| `test_update_goal_replaces_milestones` | old milestones gone, new ones fresh |
| `test_update_goal_empty_milestones_removes_all` | `milestones=[]` clears all |
| `test_update_goal_omit_milestones_preserves_existing` | title change leaves milestones intact |
| `test_update_goal_not_found` | 404 |
| `test_numeric_progress_update` | delta added correctly |
| `test_numeric_progress_clamps_at_100` | over-delta clamped, auto-completed |
| `test_numeric_progress_on_milestone_goal_returns_422` | 422 on milestone-only goal |
| `test_progress_not_found` | 404 |
| `test_progress_logs_after_update` | 2 log entries after 2 updates |
| `test_soft_delete_hides_goal` | goal absent from list after delete |
| `test_delete_goal_not_found` | 404 |
