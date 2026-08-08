# Flutter Dashboard Reference — Ascendlyx

Reference document for implementing the **Dashboard** screen in the Ascendlyx Flutter mobile app. All information is derived directly from the Angular web frontend.

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

This is the primary call that loads the entire dashboard in one request.

**Success response `200`:**
```json
{
  "habits": [ /* Habit[] — see Habit shape below */ ],
  "goals":  [ /* Goal[] — see Goal shape below */ ],
  "ai_score": 78,
  "weekly_summary": {
    "week_start": "2026-04-20",
    "week_end": "2026-04-26",
    "days": [
      { "date": "2026-04-20", "checkins_count": 3, "habits_completed": 3 },
      { "date": "2026-04-21", "checkins_count": 2, "habits_completed": 2 }
    ],
    "total_checkins": 14,
    "completion_rate": 0.87
  }
}
```

**Error handling:**
- `error.message` → `error.message` (from response body)
- `error.message` (from exception/network)
- Fallback: `"Failed to load dashboard"`

---

### 2. Get Weekly Summary

| Property | Value |
|----------|-------|
| Method   | `GET` |
| Endpoint | `/dashboard/weekly` |
| Auth     | Bearer token required |

**Success response `200`:**
```json
{
  "week_start": "2026-04-20",
  "week_end": "2026-04-26",
  "days": [
    { "date": "2026-04-20", "checkins_count": 3, "habits_completed": 3 }
  ],
  "total_checkins": 14,
  "completion_rate": 0.87
}
```

---

### 3. Get All Habits

| Property | Value |
|----------|-------|
| Method   | `GET` |
| Endpoint | `/habits` |
| Auth     | Bearer token required |

**Success response `200`:** Array of `Habit` objects (see Habit shape below).

---

### 4. Create Habit

| Property | Value |
|----------|-------|
| Method   | `POST` |
| Endpoint | `/habits` |
| Auth     | Bearer token required |

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
- `name`: required, max 100 characters
- `category`: one of `"fitness"`, `"study"`, `"mindfulness"`, `"reading"`, `"custom"`
- `reminder_time`: optional, format `"HH:mm:ss"` (the frontend appends `:00` to the `HH:mm` picker value)
- `expected_duration`: optional, integer minutes (1–480), omit if 0 or null

**Success response `200`:** The newly created `Habit` object.

**Error handling:**
- `error.message` → `error.detail`
- Fallback: `"Failed to create habit"`

After success: **reload the dashboard** (call `GET /dashboard` again).

---

### 5. Toggle Habit Completion

| Property | Value |
|----------|-------|
| Method   | `POST` |
| Endpoint | `/habits/{habitId}/toggle` |
| Auth     | Bearer token required |

**Query parameter (optional):**
- `date` — `YYYY-MM-DD` string. Omit to toggle for today.

**Request body:** none (empty / null body)

**Success response `200`:**
```json
{
  "habit_id": "uuid",
  "date": "2026-04-26",
  "is_completed": true,
  "streak": {
    "current_streak": 5,
    "longest_streak": 12,
    "last_checkin_date": "2026-04-26"
  }
}
```

---

### 6. Update Habit Log Entry

| Property | Value |
|----------|-------|
| Method   | `PUT` |
| Endpoint | `/habits/{habitId}/log/{logDate}` |
| Auth     | Bearer token required |

`logDate` format: `YYYY-MM-DD`

**Request body:**
```json
{
  "actual_duration": 45,
  "completed_at": "2026-04-26T09:45:00Z"
}
```

Both fields are optional — send only what needs updating.

**Success response `200`:** Updated `HabitLog` object.

---

### 7. Delete Habit Log Entry

| Property | Value |
|----------|-------|
| Method   | `DELETE` |
| Endpoint | `/habits/{habitId}/log/{logDate}` |
| Auth     | Bearer token required |

`logDate` format: `YYYY-MM-DD`

**Success response `200`:** Empty body.

---

### 8. Delete Habit

| Property | Value |
|----------|-------|
| Method   | `DELETE` |
| Endpoint | `/habits/{habitId}` |
| Auth     | Bearer token required |

**Success response `200`:** Empty body.

---

## Data Model Shapes

### Habit
```json
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
    "last_checkin_date": "2026-04-25"
  },
  "today_log": {
    "id": 1,
    "habit_id": "uuid",
    "user_id": "uuid",
    "date": "2026-04-26",
    "is_completed": false,
    "actual_duration": null,
    "completed_at": null,
    "created_at": "2026-04-26T00:00:00Z",
    "updated_at": "2026-04-26T00:00:00Z"
  },
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-04-26T00:00:00Z"
}
```

`today_log` is `null` if the user has not checked in yet today.

### Goal
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "Run 100km",
  "target_value": "100",
  "current_value": "42",
  "unit": "km",
  "deadline": "2026-06-30",
  "category": "fitness",
  "is_completed": false,
  "progress_percentage": 42.0,
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-04-26T00:00:00Z"
}
```

### HabitLog
```json
{
  "id": 1,
  "habit_id": "uuid",
  "user_id": "uuid",
  "date": "2026-04-26",
  "is_completed": true,
  "actual_duration": 35,
  "completed_at": "2026-04-26T09:35:00Z",
  "created_at": "2026-04-26T00:00:00Z",
  "updated_at": "2026-04-26T09:35:00Z"
}
```

### ToggleResponse
```json
{
  "habit_id": "uuid",
  "date": "2026-04-26",
  "is_completed": true,
  "streak": {
    "current_streak": 6,
    "longest_streak": 12,
    "last_checkin_date": "2026-04-26"
  }
}
```

### HabitCategory (enum)
```
"fitness" | "study" | "mindfulness" | "reading" | "custom"
```

---

## Screen Sections & Features

### 1. Greeting Section

Displayed at the top of the dashboard.

| Element | Logic |
|---------|-------|
| Greeting text | Time-based: `0–11h` → "Good morning", `12–16h` → "Good afternoon", `17–23h` → "Good evening" |
| User name | First word of `currentUser.name` from local storage. Fallback: `"there"` |
| Date line | Formatted as `"Wednesday, April 26 · Let's crush it today!"` |

---

### 2. This Week — Day Badges

7 circular badges showing Mon–Sun with completion state.

| Badge state | Condition |
|-------------|-----------|
| **Done** (checkmark ✓) | `day.habits_completed > 0` AND the day is not today |
| **Today** (highlighted ring) | `day.date == today (YYYY-MM-DD)` |
| **Default** (first letter of day) | future date or no completions |

Data source: `weekly_summary.days` from `GET /dashboard`.

---

### 3. Stat Cards (3 cards)

#### 🔥 Day Streak
- **Value**: Maximum `current_streak` across all habits
- **Badge**: `"↑ Personal Best"` — shown when any habit has `current_streak >= longest_streak` AND `current_streak > 0`
- **Color**: Green

#### ✅ Habits Today
- **Value**: `habitsCompletedToday / totalHabits` (e.g. `"3/5"`)
- **Badge**: `"↑ {pct}%"` where `pct = round(habitsCompletedToday / totalHabits * 100)`
- **Color**: Purple/gradient
- `habitsCompletedToday`: `habits_completed` from today's entry in `weekly_summary.days`
- `totalHabits`: `habits.length`

#### ⚡ AI Score
- **Value**: `ai_score` from dashboard response, or `"--"` if null
- **Badge**: `"↑ Score"` (only shown when score is non-null)
- **Color**: Blue

---

### 4. Weekly Productivity Bar Chart

A 7-bar chart, one bar per day of the week.

| Property | Logic |
|----------|-------|
| Bar height % | `min(100, round(day.habits_completed / totalHabits * 100))` |
| Future day | `day.date > today` → render at fixed 10% height, styled differently |
| Today | Highlighted bar color |
| Past days | Height from actual data |
| Label below | Short day name: `Sun, Mon, Tue, Wed, Thu, Fri, Sat` |

If `totalHabits == 0`, all bars render at 0%.

---

### 5. Today's Habits Ring Chart

A conic-gradient donut/ring showing today's completion percentage.

| Element | Value |
|---------|-------|
| Fill angle | `habitCompletionPct * 3.6` degrees |
| Center text | `{habitCompletionPct}%` |
| Sub-label | `"{habitsCompleted} of {totalHabits} completed"` |

Implement with a custom `CircularProgressIndicator` or `CustomPainter` in Flutter.

---

### 6. Goal Progress Section

Shows the **top 3 active (non-completed) goals**, sorted by `progress_percentage` descending.

Filter: `goal.is_completed == false`  
Sort: `progress_percentage` descending  
Limit: first 3

**Each goal row:**
- Goal title (left)
- Progress percentage (right, rounded to 0 decimal places)
- Progress bar filled to `progress_percentage`%

**Progress bar colors by index:**
| Index | Color |
|-------|-------|
| 0 | `ax-grad` (gradient) |
| 1 | `ax-blue` |
| 2 | `ax-green` |

**Empty state:** If no active goals exist, show an empty state with "No active goals yet. Set your first goal!" and an "Add Goal" button that navigates to `/goals`.

**"View All" button:** Navigates to `/goals`.

---

### 7. AI Coach Insight Widget

Only rendered when `ai_score` is non-null.

Tapping the widget navigates to `/ai-insights`.

**Insight text by score range:**

| Score range | Message |
|-------------|---------|
| ≥ 85 | "Your AI score is **{score}** — outstanding performance this week! Keep up the momentum." |
| ≥ 70 | "Your AI score is **{score}** — solid week! A little more consistency will push you to the top." |
| ≥ 50 | "Your AI score is **{score}** — good progress. Focus on checking in daily to boost your score." |
| < 50 | "Your AI score is **{score}** — there's room to grow. Try completing at least one habit every day this week." |

---

### 8. Add Habit — FAB & Modal

A floating action button (FAB) opens a bottom sheet / modal dialog.

#### Add Habit Form Fields

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| Habit Name | Text input | Required, max 100 chars | Trimmed before sending |
| Category | Chip selector | One of 5 categories | Default: `"fitness"` |
| Reminder Time | Time picker | Optional | Default: `09:00`. Sent as `"HH:mm:ss"` |
| Expected Duration | Number input | Optional, 1–480 | Integer minutes, default: `30`. Omit if 0 or null |

#### Category Chips
```
fitness | study | mindfulness | reading | custom
```
One chip is active/selected at a time.

#### Behavior
1. Validate: `name` must not be empty after trimming
2. Show loading state on Save button while request is in-flight
3. On success: close modal, reload dashboard (`GET /dashboard`)
4. On error: show error message inside modal (do not close)

#### Default form state (on open):
```dart
name: ''
category: 'fitness'
reminder_time: '09:00'
expected_duration: 30
```

---

## Screen States

| State | Behavior |
|-------|---------|
| **Loading** | Show full-screen loading indicator while `GET /dashboard` is in-flight |
| **Error** | Show error message with a **Retry** button that calls `GET /dashboard` again |
| **Empty habits** | Stat cards show `0/0`, bar chart all-zero, ring shows `0%` |
| **Empty goals** | Goal Progress section shows empty state with "Add Goal" CTA |
| **No AI score** | AI Score stat card shows `"--"`, AI Coach Insight widget is hidden |

---

## Navigation Map

```
/dashboard
  ├── [FAB]           → open Add Habit modal
  ├── [Goal "View All"] → /goals
  ├── [Goal empty state "Add Goal"] → /goals
  └── [AI Coach widget] → /ai-insights
```

---

## Local User Data

The user's display name is read from local storage key `currentUser` (set during login/signup):

```json
{
  "user_id": "uuid",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "handle": "@janedoe"
}
```

Only the **first word** of `name` is shown in the greeting (e.g. `"Jane"`). Fallback to `"there"` if no user found.

---

## Computed Values Reference

| Value | Formula |
|-------|---------|
| `bestStreak` | `max(habit.streak.current_streak)` across all habits |
| `isPersonalBest` | any habit where `current_streak >= longest_streak && current_streak > 0` |
| `habitsCompletedToday` | `weekly_summary.days[today].habits_completed` |
| `totalHabits` | `habits.length` |
| `habitCompletionPct` | `round(habitsCompletedToday / totalHabits * 100)` (0 if no habits) |
| `topGoals` | filter `is_completed == false`, sort by `progress_percentage` desc, take first 3 |
| Bar height % | `min(100, round(day.habits_completed / totalHabits * 100))` |
| AI insight tier | score ≥ 85 / ≥ 70 / ≥ 50 / < 50 |
