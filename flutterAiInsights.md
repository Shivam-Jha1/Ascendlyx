# Flutter AI Insights Reference — Ascendlyx

Reference document for implementing the **AI Insights** screen in the Ascendlyx Flutter mobile app. All information is derived directly from the Angular web frontend.

---

## Base URL

| Environment | Base URL |
|-------------|----------|
| Development | `http://localhost:3000/api/v1` |
| Production  | Replace with production domain |

All requests require `Authorization: Bearer <access_token>` header.

---

## API Endpoints

### 1. Get Weekly Insights

| Property | Value |
|----------|-------|
| Method   | `GET` |
| Endpoint | `/ai-insights/weekly` |
| Auth     | Bearer token required |

Fetches the latest weekly AI insights snapshot for the current user.

**Success response `200`:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "week_start": "2026-05-05",
  "week_end": "2026-05-11",
  "habits_completed": 18,
  "habits_total_possible": 25,
  "prev_week_habits_completed": 15,
  "consistency_score": 0.85,
  "avg_daily_completion": 0.72,
  "most_productive_time": "09:00",
  "goal_progress_score": 0.68,
  "ai_productivity_score": 78.5,
  "ai_score_rating": "Great",
  "ai_percentile": 82,
  "ai_coach_message": "You're making excellent progress! Keep up your morning routine...",
  "smart_nudges": [
    "Consider starting habits earlier in the morning for better consistency",
    "Your Friday completion rate is lower—try scheduling a planning session"
  ],
  "is_stale": false,
  "computed_at": "2026-05-08T12:00:00Z",
  "ai_computed_at": "2026-05-08T12:00:00Z"
}
```

**Response fields:**
- `week_start` / `week_end`: ISO date strings (`YYYY-MM-DD`)
- `habits_completed`: integer count of completed habits this week
- `habits_total_possible`: total possible completions (habits × days)
- `prev_week_habits_completed`: for week-over-week comparison
- `consistency_score`: 0.0–1.0 decimal (multiply by 100 for percentage)
- `avg_daily_completion`: 0.0–1.0 decimal (multiply by 100 for percentage)
- `most_productive_time`: HH:mm string or null if not computed
- `goal_progress_score`: 0.0–1.0 decimal (multiply by 100 for percentage)
- `ai_productivity_score`: 0–100 numeric score or null
- `ai_score_rating`: `"Poor"` | `"Fair"` | `"Good"` | `"Great"` | `"Excellent"` or null
- `ai_percentile`: 0–100 percentile rank or null
- `ai_coach_message`: string or null
- `smart_nudges`: array of strings or null
- `is_stale`: boolean — true if AI computation is in progress
- `computed_at`: timestamp when insights were computed
- `ai_computed_at`: timestamp when AI analysis completed (may be null if stale)

**Error handling:**
- HTTP `404`: No insights yet — show "no data" state
- Other errors: Show error message with "Retry" button

---

### 2. Get Insights Status

| Property | Value |
|----------|-------|
| Method   | `GET` |
| Endpoint | `/ai-insights/status` |
| Auth     | Bearer token required |

Checks the current status of insights computation and returns the latest available snapshot if ready.

**Success response `200`:**
```json
{
  "has_data": true,
  "streak": {
    "user_id": "uuid",
    "current_streak": 5,
    "longest_streak": 12,
    "last_active_week": "2026-05-01",
    "updated_at": "2026-05-08T12:00:00Z"
  },
  "latest_weekly": {
    "id": "uuid",
    "user_id": "uuid",
    "week_start": "2026-05-05",
    "week_end": "2026-05-11",
    ...
  }
}
```

**Use case:** Called on a polling interval (every 10 seconds) while `is_stale === true` to check if AI has finished computing. When `latest_weekly.is_stale === false`, stop polling and fetch fresh data via `GET /ai-insights/weekly`.

---

### 3. Refresh Insights

| Property | Value |
|----------|-------|
| Method   | `POST` |
| Endpoint | `/ai-insights/refresh` |
| Auth     | Bearer token required |

Triggers manual refresh of AI insights. May fail with HTTP `429` if refreshed too recently (rate limit: 1 refresh per 2 hours).

**Request body:** Empty / null

**Success response `200`:**
```json
{
  "message": "Insights refreshed successfully",
  "snapshot": {
    "id": "uuid",
    "user_id": "uuid",
    ...
  }
}
```

**Error responses:**
- HTTP `429`: Rate-limited. Show toast: `"Insights were refreshed recently. Please try again in 2 hours."`
- Other errors: Show toast: `"Failed to refresh insights. Please try again later."`

---

## Polling Behavior

**When insights are stale (`is_stale === true`):**
1. Display stale banner: "✨ AI is analyzing your week… refreshes automatically"
2. Start polling `GET /ai-insights/status` every 10 seconds
3. On each status poll, check if `latest_weekly.is_stale === false`
4. When AI is ready (not stale):
   - Stop polling
   - Fetch fresh data via `GET /ai-insights/weekly`
   - Update UI with new snapshot
5. Destroy polling on component unmount

---

## Data Model Shapes

### WeeklyInsightResponse
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "week_start": "2026-05-05",
  "week_end": "2026-05-11",
  "habits_completed": 18,
  "habits_total_possible": 25,
  "prev_week_habits_completed": 15,
  "consistency_score": 0.85,
  "avg_daily_completion": 0.72,
  "most_productive_time": "09:00",
  "goal_progress_score": 0.68,
  "ai_productivity_score": 78.5,
  "ai_score_rating": "Great",
  "ai_percentile": 82,
  "ai_coach_message": "...",
  "smart_nudges": ["...", "..."],
  "is_stale": false,
  "computed_at": "2026-05-08T12:00:00Z",
  "ai_computed_at": "2026-05-08T12:00:00Z"
}
```

### InsightStatusResponse
```json
{
  "has_data": true,
  "streak": {
    "user_id": "uuid",
    "current_streak": 5,
    "longest_streak": 12,
    "last_active_week": "2026-05-01",
    "updated_at": "2026-05-08T12:00:00Z"
  },
  "latest_weekly": { /* WeeklyInsightResponse */ }
}
```

### InsightRefreshResponse
```json
{
  "message": "Insights refreshed successfully",
  "snapshot": { /* WeeklyInsightResponse */ }
}
```

### ProductivityDayPoint (frontend-derived)
```json
{
  "date": "2026-05-05",
  "day_name": "Sun",
  "productivity_score": 80,
  "habits_completed": 4,
  "habits_total": 5,
  "is_today": false
}
```

---

## Screen Sections & Features

### 1. Page Header

**Left section:**
```
AI Insights 🤖
Your personalized performance analysis
```

**Right section:**
- **Refresh button**
  - Icon: Clockwise arrow when idle
  - Icon: Hourglass when loading
  - Disabled while `isRefreshing() === true`
  - On click: calls `POST /ai-insights/refresh`
  - On success: updates insights snapshot, stops polling if stale becomes false
  - On HTTP 429: shows toast "Insights were refreshed recently. Please try again in 2 hours."
  - On other error: shows toast "Failed to refresh insights. Please try again later."

---

### 2. Toast Message Banner

Display logic:
- Shown when `toastMessage()` is not null
- Auto-dismisses after 4 seconds
- Used for rate limit and error messages from refresh endpoint

---

### 3. Stale Banner

Display logic:
- Show when `isStale() === true` AND `!isLoading()`
- Text: "✨ AI is analyzing your week… refreshes automatically"
- Includes animated pulse indicator
- Triggers polling in background (`GET /ai-insights/status` every 10 seconds)

---

### 4. Error State

Display logic:
- Show when `error()` is not null AND `!isLoading()`
- Display error message
- Show "Retry" button that calls `refresh()`

---

### 5. No Data State

Display logic:
- Show when `hasNoData() === true` AND `!isLoading()`
- Title: "No insights computed yet."
- Subtitle: "Click the refresh button to generate your first report."
- **Triggered by:** HTTP 404 when calling `GET /ai-insights/weekly`

---

### 6. Main Content Grid (Two-column layout)

Displayed when not in error state.

#### LEFT COLUMN

##### 6.1 Productivity Chart Component

**Data source:** Derived from `GET /dashboard` weekly_summary

**Chart type:** 7-bar chart (one per day of week)

**For each day:**
```
bar_height_percent = (habits_completed / total_habits) * 100
day_name: Sun, Mon, Tue, Wed, Thu, Fri, Sat
productivity_score: 0–100
```

**Visual:**
- Bar height represents productivity percentage
- Today's bar: highlighted color
- Past bars: standard color
- Labels below each bar: day short name

**Loading:** Show placeholder while `isLoading() || dashboardLoading()`

---

##### 6.2 Weekly Report Component

**Data source:** `WeeklyInsightResponse`

**Displays:**

| Section | Fields |
|---------|--------|
| **This Week** | Habits completed: `{habits_completed} / {habits_total_possible}` |
| **vs Last Week** | Compare `habits_completed` vs `prev_week_habits_completed` — show difference with up/down indicator |
| **Consistency** | `{consistency_score * 100}%` (formatted as 0 decimals) |
| **Avg Daily** | `{avg_daily_completion * 100}%` (formatted as 0 decimals) |
| **Peak Time** | `{most_productive_time}` or "Not available" if null |

**Loading:** Show placeholder while `isLoading()`

---

##### 6.3 Smart Nudges Component

**Data source:** `insight().smart_nudges` (array of strings or null)

**Display:**
- List of actionable suggestions
- Each nudge as a card or list item
- Icon: lightbulb or similar

**States:**
- **Loading**: Show placeholder while `isLoading()`
- **Stale & not ready**: Show dim/faded state + message "AI computing..."
- **Empty nudges**: Show "No suggestions yet"
- **With nudges**: Display all nudges

---

#### RIGHT COLUMN

##### 6.4 AI Score Card Component

**Data source:** `WeeklyInsightResponse`

**Displays:**

| Element | Value |
|---------|-------|
| **Large score number** | `ai_productivity_score` (0–100) or "--" if null |
| **Score rating** | `ai_score_rating` (Poor / Fair / Good / Great / Excellent) or "Computing..." |
| **Percentile** | `ai_percentile`th percentile (e.g., "82nd percentile") or "Computing..." |

**Visual:**
- Prominent large number in center
- Color-coded by rating:
  - Excellent (90–100): Green
  - Great (70–89): Blue
  - Good (50–69): Yellow/Orange
  - Fair (30–49): Orange
  - Poor (0–29): Red

**Loading/Stale states:**
- Show placeholder while `isLoading()`
- Show dim state while `isStale() && !isAIReady()`

---

##### 6.5 AI Coach Component

**Data source:** `insight().ai_coach_message` (string or null)

**Displays:**
- Personalized coaching message
- Styled as a card with AI/coach icon
- Text may contain formatting (bold, lists, etc.)

**States:**
- **Loading**: Show placeholder while `isLoading()`
- **Stale & not ready**: Show "AI Coach thinking..." or dim state
- **No message**: Show default message or empty placeholder
- **With message**: Display full message

---

### 7. Loading State (Full Page)

Show when `isLoading() === true` at initial load.

- Loader message: "Loading your insights..."
- All sections show placeholders

---

## Screen State Transitions

```
Initial Load
  ↓
isLoading = true
  ↓
GET /ai-insights/weekly
  ↓
  ├─→ 404 (no data)
  │    ↓
  │    hasNoData = true
  │    Show "No insights yet" state + refresh button
  │
  ├─→ Error
  │    ↓
  │    error = message
  │    Show error state + retry button
  │
  └─→ Success
       ↓
       insights = response
       isLoading = false
       ├─→ if is_stale:
       │    ↓
       │    isStale = true
       │    Show stale banner
       │    Start polling GET /ai-insights/status every 10s
       │    When is_stale becomes false:
       │      ↓
       │      Stop polling
       │      Fetch fresh data
       │      Update UI
       │
       └─→ if not is_stale:
            ↓
            isStale = false
            Display all insights normally
```

---

## Computed Values

| Value | Formula |
|-------|---------|
| Consistency % | `consistency_score * 100` (rounded to 0 decimals) |
| Avg Daily % | `avg_daily_completion * 100` (rounded to 0 decimals) |
| Goal Progress % | `goal_progress_score * 100` (rounded to 0 decimals) |
| Productivity day score | `(habits_completed / total_habits) * 100` |
| Week-over-week change | `habits_completed - prev_week_habits_completed` |

---

## AI Score Rating Tiers

| Rating | Score Range | Color | Meaning |
|--------|-------------|-------|---------|
| Excellent | 90–100 | Green | Exceptional performance |
| Great | 70–89 | Blue | Strong progress |
| Good | 50–69 | Yellow/Orange | Solid performance |
| Fair | 30–49 | Orange | Room for improvement |
| Poor | 0–29 | Red | Needs attention |

---

## Refresh Flow

**User clicks Refresh button:**
1. `isRefreshing.set(true)` — disable button, show hourglass icon
2. `POST /ai-insights/refresh`
3. On success:
   - Update `insights` with new snapshot
   - Set `hasNoData = false`
   - If `is_stale` → start polling, else display normally
   - `isRefreshing = false`
4. On HTTP 429:
   - Show toast: "Insights were refreshed recently. Please try again in 2 hours."
   - Toast auto-dismisses after 4 seconds
   - `isRefreshing = false`
5. On other error:
   - Show toast: "Failed to refresh insights. Please try again later."
   - Toast auto-dismisses after 4 seconds
   - `isRefreshing = false`

---

## Polling Details (While Stale)

**Trigger:** `is_stale === true` after fetching insights

**Behavior:**
1. Start interval: `GET /ai-insights/status` every 10 seconds
2. Check `latest_weekly?.is_stale`
3. If `is_stale === false`:
   - Stop polling
   - `isAIReady.set(true)`
   - `isStale.set(false)`
   - Fetch fresh insights via `GET /ai-insights/weekly`
   - Update UI with new data
4. If still stale: Continue polling
5. On poll error: Silently continue polling (don't show error)

**Stop polling when:**
- AI ready (is_stale becomes false)
- User navigates away (onDestroy)
- Component is destroyed

---

## Layout (Desktop vs Mobile)

### Desktop
- Two-column grid:
  - Left column (60%): Chart, Weekly Report, Smart Nudges
  - Right column (40%): AI Score, AI Coach
- Side-by-side, scrollable independently

### Mobile
- Single-column stacked:
  - Chart
  - Weekly Report
  - AI Score
  - AI Coach
  - Smart Nudges
- Vertically scrollable

---

## Error Handling Patterns

| Error | Handling |
|-------|----------|
| Load insights 404 | Show "No data yet" state + refresh CTA |
| Load insights other error | Show error message + retry button |
| Refresh 429 | Show rate-limit toast (auto-dismiss 4s) |
| Refresh other error | Show error toast (auto-dismiss 4s) |
| Polling request failure | Silent retry (no UI feedback) |

---

## Performance Considerations

- **Cache insights locally**: Show cached data while fetching fresh
- **Stop polling on unmount**: Prevent background polling after user leaves
- **Debounce refresh**: Prevent accidental multiple clicks (disabled state handles this)
- **Lazy load AI components**: Load heavy chart/calculation components when visible (optional optimization)
- **Memoize derived values**: Cache chart data transformation to avoid recalculation

---

## UI/UX Details

### Refresh Button
- Disabled while `isRefreshing() === true`
- Icon changes: arrow → hourglass during loading
- Tooltip: "Refresh insights"

### Stale Banner
- Animated pulse indicator on left
- Auto-refreshes in background via polling
- Reassuring message with emoji
- Dismissed when AI ready

### Toast Messages
- Appear at top or bottom
- Auto-dismiss after 4 seconds
- Used only for refresh feedback (no other toasts)

### Loading Placeholders
- Show skeleton loaders or shimmer effect for:
  - Chart bars
  - Report stats
  - Score card
  - Coach message
  - Nudges list

### Color Scheme
- Score rating colors (green/blue/yellow/orange/red)
- Consistency/productivity: blue bars
- Error: red banner
- Warning (stale): yellow/amber banner
- Success: green highlights

