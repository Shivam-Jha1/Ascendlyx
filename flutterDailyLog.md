# Flutter Daily Log Reference — Ascendlyx

Reference document for implementing the **Daily Log** (habits tracking) screen in the Ascendlyx Flutter mobile app. All information is derived directly from the Angular web frontend.

---

## Base URL

| Environment | Base URL |
|-------------|----------|
| Development | `http://localhost:3000/api/v1` |
| Production  | Replace with production domain |

All requests require `Authorization: Bearer <access_token>` header.

---

## API Endpoints

### 1. Get Full Dashboard

| Property | Value |
|----------|-------|
| Method   | `GET` |
| Endpoint | `/dashboard` |
| Auth     | Bearer token required |

This endpoint is called to load all habits and weekly summary for today's tracking.

**Success response `200`:**
```json
{
  "habits": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "Morning Run",
      "category": "fitness",
      "reminder_time": "09:00:00",
      "expected_duration": 30,
      "is_active": true,
      "streak": {
        "current_streak": 5,
        "longest_streak": 12,
        "last_checkin_date": "2026-05-07"
      },
      "today_log": {
        "id": 1,
        "habit_id": "uuid",
        "user_id": "uuid",
        "date": "2026-05-08",
        "is_completed": true,
        "actual_duration": 35,
        "completed_at": "2026-05-08T09:35:00Z",
        "created_at": "2026-05-08T00:00:00Z",
        "updated_at": "2026-05-08T09:35:00Z"
      },
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-05-08T00:00:00Z"
    }
  ],
  "goals": [],
  "ai_score": null,
  "weekly_summary": {
    "week_start": "2026-05-05",
    "week_end": "2026-05-11",
    "days": [
      { "date": "2026-05-05", "checkins_count": 3, "habits_completed": 3 },
      { "date": "2026-05-06", "checkins_count": 2, "habits_completed": 2 }
    ],
    "total_checkins": 14,
    "completion_rate": 0.87
  }
}
```

`today_log` is `null` if the user has not checked in for that habit yet today.

**Error handling:**
- `error.message` → display error message
- Fallback: `"Failed to load habits"`

---

### 2. Toggle Habit Completion

| Property | Value |
|----------|-------|
| Method   | `POST` |
| Endpoint | `/habits/{habitId}/toggle` |
| Auth     | Bearer token required |

Toggles habit completion for a specific date (or today by default).

**Query parameter (optional):**
- `date` — `YYYY-MM-DD` string. If omitted, toggles for today.

**Request body:** none (empty / null body)

**Success response `200`:**
```json
{
  "habit_id": "uuid",
  "date": "2026-05-08",
  "is_completed": true,
  "streak": {
    "current_streak": 6,
    "longest_streak": 12,
    "last_checkin_date": "2026-05-08"
  }
}
```

**Use cases:**
1. **Complete a new habit**: Call toggle → habit becomes `is_completed: true` → then optionally call `PUT /habits/{id}/log/{date}` to update duration/time
2. **Uncomplete a habit**: Call toggle → habit becomes `is_completed: false`

---

### 3. Update Habit Log Entry

| Property | Value |
|----------|-------|
| Method   | `PUT` |
| Endpoint | `/habits/{habitId}/log/{logDate}` |
| Auth     | Bearer token required |

`logDate` format: `YYYY-MM-DD`

Updates an existing habit log entry with actual duration and completion time.

**Request body:**
```json
{
  "actual_duration": 35,
  "completed_at": "2026-05-08T09:35:00Z"
}
```

Both fields are optional — send only what needs updating.

**Success response `200`:** Updated `HabitLog` object.

```json
{
  "id": 1,
  "habit_id": "uuid",
  "user_id": "uuid",
  "date": "2026-05-08",
  "is_completed": true,
  "actual_duration": 35,
  "completed_at": "2026-05-08T09:35:00Z",
  "created_at": "2026-05-08T00:00:00Z",
  "updated_at": "2026-05-08T09:35:00Z"
}
```

---

### 4. Delete Habit Log Entry

| Property | Value |
|----------|-------|
| Method   | `DELETE` |
| Endpoint | `/habits/{habitId}/log/{logDate}` |
| Auth     | Bearer token required |

`logDate` format: `YYYY-MM-DD`

Deletes a habit log entry for a specific date. This is called when user clicks "Cancel" on an already-completed habit and wants to uncomplete it.

**Success response `200`:** Empty body.

---

### 5. Delete Habit

| Property | Value |
|----------|-------|
| Method   | `DELETE` |
| Endpoint | `/habits/{habitId}` |
| Auth     | Bearer token required |

Permanently deletes a habit and all its logs/streaks.

**Success response `200`:** Empty body.

---

### 6. Create Habit

| Property | Value |
|----------|-------|
| Method   | `POST` |
| Endpoint | `/habits` |
| Auth     | Bearer token required |

Creates a new habit.

**Request body:**
```json
{
  "name": "Morning Run",
  "category": "fitness",
  "reminder_time": "09:00:00",
  "expected_duration": 30
}
```

**Field notes:**
- `name`: required, max 100 characters, trimmed before sending
- `category`: one of `"fitness"`, `"study"`, `"mindfulness"`, `"reading"`, `"custom"`
- `reminder_time`: optional, format `"HH:mm:ss"`. Omit if not provided
- `expected_duration`: optional, integer minutes (1–480). Omit if 0 or null

**Success response `200`:** The newly created `Habit` object.

**Error handling:**
- `error.message` or `error.detail` → display error
- Fallback: `"Failed to create habit"`

---

## Daily Log Workflow

### Completing a New Habit (Not yet checked in today)

**Flow:**
1. User clicks on an uncompleted habit
2. Open "Complete Habit ✅" modal
3. User enters:
   - Actual duration (required, min 1 min)
   - Completed time (required, HH:mm format)
4. Click "Mark Complete ✓"
5. **Backend sequence:**
   - `POST /habits/{id}/toggle?date=YYYY-MM-DD` → mark complete
   - `PUT /habits/{id}/log/YYYY-MM-DD` → update actual_duration + completed_at
6. On success: close modal, reload dashboard
7. On error: show error in modal, retry or cancel

**Behavior on toggle error:** If toggle fails, reload entire dashboard to sync UI with backend state.

---

### Editing an Existing Log (Already checked in today)

**Flow:**
1. User clicks on an already-completed habit
2. Open "Edit Log ✏️" modal (pre-filled with current values)
3. User updates:
   - Actual duration
   - Completed time
4. Click "Update ✓"
5. **Backend:**
   - `PUT /habits/{id}/log/YYYY-MM-DD` → update only
6. On success: close modal, reload dashboard
7. On error: show error in modal, retry or cancel

---

### Uncompleting a Habit (Reverting from completed)

**Flow:**
1. User clicks "Cancel" on an already-completed habit modal (before saving edits)
2. Confirmation: delete the log entry
3. **Backend:**
   - `DELETE /habits/{id}/log/YYYY-MM-DD` → uncomplete
4. On success: close modal, reload dashboard
5. On error: silently reload to sync state

---

### Deleting a Habit

**Flow:**
1. User clicks delete (trash icon) on a habit card
2. Open "Delete Habit 🗑️" confirmation modal
3. Show warning: "Are you sure? This will remove all logs and streaks. Cannot be undone."
4. Click "Delete"
5. **Backend:**
   - `DELETE /habits/{id}` → delete habit and all logs
6. On success: close modal, reload dashboard
7. On error: log error, silently close modal and reload

---

## Screen Sections & Features

### 1. Page Header

```
My Habits 🔥
Track your daily habits and build lasting streaks
```

---

### 2. Toolbar

**Search box:**
- Real-time search as user types
- Filters habits by:
  - Habit name (case-insensitive partial match)
  - Category (case-insensitive partial match)
- Placeholder: "Search habits..."

**Add Habit button:**
- Opens Add Habit modal

---

### 3. Habits List Section (Left Column on Desktop)

#### Header
- **Today — {DayName}** (e.g. "Today — Thursday")
- **{n}/{total} done** (e.g. "3/5 done")

#### Habit Card (per habit)

**Layout:**
- Checkbox (left) → toggles complete/uncomplete OR opens edit modal
- Info section (center, clickable) → opens edit modal
  - Habit name (bold)
  - Category badge + reminder time + expected duration (if set)
- Streak badge (right) → shows `🔥 {current_streak}`
- Delete button (far right) → opens delete confirmation

**States:**
- **Uncompleted**: checkbox is empty circle, habit name is normal text
- **Completed**: checkbox shows checkmark ✓, habit name is struck-through or faded

**Click behavior:**
- Clicking checkbox or info section → opens edit modal (for new completion or editing existing log)
- Delete button → opens delete confirmation modal

**Category badges:** Display as colored tags
- `fitness` → green
- `study` → blue
- `mindfulness` → purple
- `reading` → yellow/orange
- `custom` → gray

**Time format:** 24-hour → convert to 12-hour AM/PM (e.g., "14:30" → "2:30 PM")

#### Empty State

**If no habits exist:**
- Icon: 📝
- Message: "No habits yet. Create your first habit!"
- Action: "Add Habit" button

**If search returns no results:**
- Icon: 📝
- Message: "No habits match your search"
- Action: (none)

---

### 4. Statistics Section (Right Column on Desktop)

#### Completion Rate Card

**Ring Chart (donut/conic gradient):**
- Center shows `{todayCompletionPct}%`
- Sub-label: "Today"
- Ring filled to percentage of today's completed habits

**Formula:**
```
todayCompletionPct = round(habitsCompletedToday / totalHabits * 100)
= round(count of completed habits today / total active habits * 100)
```

**Stats below ring:**
- **Weekly avg**: Shows `{weeklyAvg}%`
- Progress bar filled to weekly average (blue color)

**Weekly avg calculation:**
```
completion_rate = from weekly_summary
if completion_rate <= 1:
  weeklyAvg = round(completion_rate * 100)
else:
  weeklyAvg = round(completion_rate)
cap to 0–100%
```

---

#### Streak Heatmap Card

**Title:** "Streak Heatmap"  
**Subtitle:** "Last 84 days"

**Grid:** 12 columns × 7 rows (84 cells = 12 weeks of daily tracking)
- Outer dimension: 7 rows for each day of week (Sun–Sat)
- Inner dimension: 12 columns for each week
- Grid covers most recent 84 days, ending on today (Saturday of current week)

**Cell coloring by completion level:**
| Level | Condition | Color |
|-------|-----------|-------|
| 0 (empty) | No habits completed OR date in future | Light gray / transparent |
| 1 | 1–25% habits completed | Light shade |
| 2 | 26–50% habits completed | Medium shade |
| 3 | 51–75% habits completed | Dark shade |
| 4 | 76–100% habits completed | Darkest shade |

**Calculation per cell:**
```
pct = (habits_completed on date / totalHabits) * 100

if date > today:
  level = 0, inRange = false
else if pct == 0:
  level = 0
else if pct <= 25:
  level = 1
else if pct <= 50:
  level = 2
else if pct <= 75:
  level = 3
else:
  level = 4
```

**Interactivity:**
- Clicking a cell (if in range) → shows tooltip: `{date} {day}, {month} {day} — {n}/{total} habits`
- Can click again to hide tooltip
- Hovering should show title/tooltip with same info

**Legend below heatmap:**
```
Less [empty cell] [L1] [L2] [L3] [L4 darkest] More
```

---

### 5. Statistics (Computed from data)

| Statistic | Formula |
|-----------|---------|
| Best streak | `max(habit.streak.current_streak)` across all active habits |
| Habits completed today | Count of habits where `today_log?.is_completed === true` |
| Total habits | Count of active habits (`is_active === true`) |
| Today completion % | `round(habitsCompletedToday / totalHabits * 100)` |
| Weekly average % | `round(weekly_summary.completion_rate * 100)` (capped 0–100) |

---

### 6. Complete Habit Modal (New Habit Check-in)

**Title:** "Complete Habit ✅"

**Read-only fields:**
- **Habit**: Displays habit name

**Optional read-only field:**
- **Expected Duration**: Displays habit's expected duration in minutes (only if set)

**Input fields:**

| Field | Type | Validation | Default |
|-------|------|------------|---------|
| Actual Duration | Number input | Required, 1–480 min | habit.expected_duration or empty |
| Completed At | Time picker | Required, HH:mm format | Current time |

**Field validation (on submit):**
- Actual Duration: must be > 0
- Completed At: must be valid HH:mm format

**Error display:**
- Show errors below each field only after submit attempt
- Error message: "Actual duration is required." or "Completed time is required."
- General error (from API): show at top

**Buttons:**
- Cancel (closes modal, deletes log if created)
- Mark Complete ✓ (saves and closes)
  - Disabled while saving
  - Shows "Saving..." while request in-flight

---

### 7. Edit Log Modal (Already completed)

**Title:** "Edit Log ✏️"

Same fields and validation as "Complete Habit Modal", but:
- Pre-filled with current `today_log` values
- Button text: "Update ✓" instead of "Mark Complete ✓"
- If Cancel before saving: calls `DELETE /habits/{id}/log/{date}` to uncomplete

---

### 8. Delete Habit Confirmation Modal

**Title:** "Delete Habit 🗑️"

**Message:**
```
Are you sure you want to delete {habit.name}?
This will also remove all logs and streaks for this habit. This action cannot be undone.
```

**Buttons:**
- Cancel (closes modal)
- Delete (red/danger button, disabled while deleting, shows "Deleting..." while in-flight)

---

### 9. Add Habit Modal

**Title:** "Add New Habit ✨"

**Fields:**

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| Habit Name | Text input | Required, max 100 chars, trimmed | Placeholder: "e.g. Morning Run, Read 30 pages..." |
| Category | Chip selector | One of 5 categories | Default: `"fitness"`, all 5 chips displayed |
| Reminder Time | Time picker | Optional | Default: `09:00` |
| Expected Duration | Number input | Optional, 1–480 | Default: `30` minutes, suffix "min" |

**Category chips:**
```
fitness | study | mindfulness | reading | custom
```

One chip selected at a time.

**Buttons:**
- Cancel (closes modal)
- Save Habit ✓ (disabled while saving, shows "Saving..." while in-flight)

**Behavior:**
1. Validate name not empty after trimming
2. If invalid: show error "Habit name is required."
3. If valid: POST `/habits` with payload
4. On success: close modal, reload dashboard
5. On error: show error message, allow retry

---

## Screen States

| State | Behavior |
|-------|----------|
| **Loading** | Full-screen loader: "Loading your habits..." |
| **Error** | Error message with "Retry" button that calls `GET /dashboard` again |
| **Empty habits** | Empty state with "Add Habit" CTA |
| **With habits** | Show habit list + stats + heatmap |

---

## Navigation & Link Map

```
/daily-log
  ├── [Add Habit button/FAB] → open Add Habit modal
  ├── [Habit card] → open Edit/Complete modal
  ├── [Delete icon] → open Delete Confirmation
  └── [Search] → filter habits in-place
```

---

## Local Data & Constants

**Today's date:**
- Used to determine which heatmap cells are "in range" (past/today)
- Used to load `today_log` for each habit
- Formatted as `YYYY-MM-DD`

**Day name:** Formatted as full weekday name (e.g., "Thursday")

**Active habits filter:** Only display habits where `is_active === true`

---

## UI/UX Details

### Layout (Desktop)

Two-column layout:
- **Left column (60%)**: Habit list with search + add
- **Right column (40%)**: Completion rate + heatmap

### Layout (Mobile)

Single-column stacked:
- Toolbar (search + add)
- Habit list
- Completion rate card
- Heatmap card

### Scrolling

- Habit list: scrollable independent of right column (desktop)
- Heatmap: scrollable horizontally if needed (84-day view)

### Colors & Styling

- Active habit card: normal background
- Completed habit: muted background or strikethrough text
- Heatmap empty: light gray
- Heatmap L1–L4: progressively darker green/blue
- Error messages: red/danger color
- Success feedback: toast/snackbar after successful actions

---

## Error Handling Patterns

| Error | Handling |
|-------|----------|
| Toggle failure | Reload entire dashboard |
| Update log failure | Show error in modal, allow retry |
| Delete log failure | Silently reload, close modal |
| Delete habit failure | Log error, reload |
| Create habit failure | Show error in modal, allow retry |
| Load habits failure | Show error page with retry |

---

## Performance Considerations

- **Lazy load heatmap**: Only render visible cells if on very large screens
- **Search debounce**: Debounce search input (e.g., 300ms) to avoid excessive re-renders
- **Pagination**: If habits list grows very large, consider pagination or virtual scrolling
- **Cache dashboard**: Cache the dashboard response locally; show cached data while fetching fresh
