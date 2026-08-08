# Flutter Goals Reference — Ascendlyx

Reference document for implementing the **Goals** screen in the Ascendlyx Flutter mobile app. All information is derived directly from the Angular web frontend.

---

## Base URL

| Environment | Base URL |
|-------------|----------|
| Development | `http://localhost:3000/api/v1` |
| Production  | Replace with production domain |

All requests require `Authorization: Bearer <access_token>` header.

---

## API Endpoints

### 1. Get All Goals

| Property | Value |
|----------|-------|
| Method   | `GET` |
| Endpoint | `/goals` |
| Auth     | Bearer token required |

**Query parameters:**
- `include_completed` — `true` | `false` (default: `true`). When `false`, filters out completed goals.

**Success response `200`:** Array of `GoalResponse` objects.

```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "title": "Run a Marathon",
    "description": "Complete a full marathon by summer",
    "priority": "high",
    "deadline": "2026-08-31T00:00:00Z",
    "target_value": "42.2",
    "current_value": "15.3",
    "unit": "km",
    "category": "fitness",
    "is_completed": false,
    "created_at": "2026-01-01T00:00:00Z",
    "milestones": [
      {
        "id": "uuid",
        "goal_id": "uuid",
        "label": "Run 10km",
        "is_completed": true,
        "sort_order": 0,
        "created_at": "2026-01-01T00:00:00Z"
      }
    ],
    "progress_percentage": 36.2,
    "completed_milestones": 1,
    "total_milestones": 2
  }
]
```

**Error handling:**
- `error.detail` → display error message
- Fallback: `"Failed to load goals"`

---

### 2. Get Single Goal

| Property | Value |
|----------|-------|
| Method   | `GET` |
| Endpoint | `/goals/{goalId}` |
| Auth     | Bearer token required |

**Success response `200`:** Single `GoalResponse` object (same shape as above).

---

### 3. Create Goal

| Property | Value |
|----------|-------|
| Method   | `POST` |
| Endpoint | `/goals` |
| Auth     | Bearer token required |

**Request body:**
```json
{
  "title": "Run a Marathon",
  "description": "Complete a full marathon by summer",
  "priority": "high",
  "deadline": "2026-08-31",
  "target_value": "42.2",
  "unit": "km",
  "category": "fitness",
  "milestones": [
    { "label": "Run 10km" },
    { "label": "Run 21km (half marathon)" }
  ]
}
```

**Field notes:**
- `title`: required, max 200 characters, trimmed
- `description`: optional, max 500 characters, trimmed
- `priority`: optional, one of `"high"`, `"medium"`, `"low"` (default: `"medium"`)
- `deadline`: optional, format `"YYYY-MM-DD"` or null
- `target_value`: optional, numeric value as string (e.g., `"42.2"` for 42.2 km), or null
- `unit`: optional, string up to 30 chars (e.g., `"km"`, `"books"`, `"hours"`), or null
- `category`: optional, one of 8 categories (default: `"general"`)
- `milestones`: optional, array of `{ label: string }` objects

**Success response `200`:** Newly created `GoalResponse` object.

**Error handling:**
- `error.detail` → display error message
- Fallback: `"Failed to create goal. Please try again."`

---

### 4. Update Goal

| Property | Value |
|----------|-------|
| Method   | `PATCH` |
| Endpoint | `/goals/{goalId}` |
| Auth     | Bearer token required |

**Request body:** Same shape as Create, but all fields optional.

```json
{
  "title": "Run a Marathon",
  "priority": "medium",
  "milestones": [
    { "label": "New milestone" }
  ]
}
```

**Important:** Milestones replaces the existing list entirely. To add/remove milestones, send the full desired list.

**Success response `200`:** Updated `GoalResponse` object.

**Error handling:**
- `error.detail` → display error message
- Fallback: `"Failed to update goal. Please try again."`

---

### 5. Delete Goal

| Property | Value |
|----------|-------|
| Method   | `DELETE` |
| Endpoint | `/goals/{goalId}` |
| Auth     | Bearer token required |

**Success response `200`:** Empty body.

---

### 6. Toggle Milestone

| Property | Value |
|----------|-------|
| Method   | `PATCH` |
| Endpoint | `/goals/{goalId}/milestones/{milestoneId}/toggle` |
| Auth     | Bearer token required |

**Request body:** Empty object `{}`

Toggles `is_completed` for a milestone.

**Success response `200`:** Updated `GoalResponse` object (with toggled milestone).

---

### 7. Update Goal Progress (Add Delta)

| Property | Value |
|----------|-------|
| Method   | `PATCH` |
| Endpoint | `/goals/{goalId}/progress` |
| Auth     | Bearer token required |

**Request body:**
```json
{
  "delta": 5.5,
  "note": "Morning run session"
}
```

**Field notes:**
- `delta`: required, numeric value (positive or negative increment)
- `note`: optional, string up to ~200 chars describing the progress

Increments `current_value` by `delta`. Does NOT check if goal is completed; frontend should disable this button if goal is already completed.

**Success response `200`:** Updated `GoalResponse` object with new `current_value` and `progress_percentage`.

**Error handling:**
- `error.detail` → display error message
- Fallback: `"Failed to update progress."`

---

### 8. Get Goal Progress Logs

| Property | Value |
|----------|-------|
| Method   | `GET` |
| Endpoint | `/goals/{goalId}/progress-logs` |
| Auth     | Bearer token required |

Returns all progress update logs for a goal.

**Success response `200`:**
```json
[
  {
    "id": "uuid",
    "goal_id": "uuid",
    "delta": 5.5,
    "note": "Morning run session",
    "logged_at": "2026-05-08T09:30:00Z",
    "created_at": "2026-05-08T09:30:00Z"
  }
]
```

---

## Data Model Shapes

### GoalResponse
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "Run a Marathon",
  "description": "Optional description",
  "priority": "high",
  "deadline": "2026-08-31T00:00:00Z",
  "target_value": "42.2",
  "current_value": "15.3",
  "unit": "km",
  "category": "fitness",
  "is_completed": false,
  "created_at": "2026-01-01T00:00:00Z",
  "milestones": [
    {
      "id": "uuid",
      "goal_id": "uuid",
      "label": "Run 10km",
      "is_completed": true,
      "sort_order": 0,
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "progress_percentage": 36.2,
  "completed_milestones": 1,
  "total_milestones": 2
}
```

### MilestoneResponse
```json
{
  "id": "uuid",
  "goal_id": "uuid",
  "label": "Run 10km",
  "is_completed": true,
  "sort_order": 0,
  "created_at": "2026-01-01T00:00:00Z"
}
```

### GoalPriority (enum)
```
"high" | "medium" | "low"
```

### Categories (enum)
```
"general" | "fitness" | "study" | "mindfulness" | "reading" | "finance" | "career" | "health"
```

### GoalProgressLogResponse
```json
{
  "id": "uuid",
  "goal_id": "uuid",
  "delta": 5.5,
  "note": "Morning run",
  "logged_at": "2026-05-08T09:30:00Z",
  "created_at": "2026-05-08T09:30:00Z"
}
```

---

## Screen Sections & Features

### 1. Page Header

**Left section:**
```
My Goals 🎯
Set ambitious goals and track every milestone
```

**Right section (buttons):**
- **Filter button**: Shows either "All Goals" or "Active Only" based on state
  - Click toggles `includeCompleted`
  - When toggled, reloads goals list with new filter
  - Button has `.active` class when `includeCompleted === false`
  
- **Add Goal button**: Opens Add Goal modal

---

### 2. Empty State

Shown when no goals match the current filter.

- Icon: 🎯
- Message: `"No goals yet. Set your first ambitious goal!"`
- Action: "+ Add Goal" button

---

### 3. Goals Grid

Responsive grid layout displaying goal cards.

#### Goal Card Structure

**Header (within card):**
- Priority badge (left) — colored based on priority level
  - HIGH PRIORITY (red/danger color)
  - MEDIUM (yellow/warning)
  - LOW (gray/secondary)
- Deadline (if set) — formatted as "MMM d, y" (e.g., "Aug 31, 2026")
- Edit button (pencil icon) — opens Edit Goal modal
- Delete button (trash icon) — calls DELETE immediately (no confirmation)

**Title & Description:**
- Large bold goal title
- Optional description text (if present)

**Progress Section:**
- Progress label row:
  - "Progress" text (left)
  - Progress percentage (e.g., "36.2%") (right)
  - If milestones exist: Add "· {completed_milestones}/{total_milestones}" milestone count
  - If target_value set: Add "· {current_value}/{target_value} {unit}" progress ratio
- Progress bar:
  - Height represents `progress_percentage`
  - Color based on progress:
    - ≥ 80%: Green (`.bar-green`)
    - 40–79%: Blue (`.bar-blue`)
    - < 40%: Orange (`.bar-orange`)

**Milestones Section (if any):**
Each milestone displayed as a row with:
- Checkbox (left) — toggles milestone completion
  - Unchecked: empty checkbox
  - Checked: checkmark ✓
  - While toggling: spinning arrow icon + disabled
- Label text (center)
- Row is strikethrough or faded when `is_completed === true`

**Log Progress Button (if numeric goal + not completed):**
- Button text: "+ Log Progress"
- Icon: plus-circle
- Click → opens Log Progress modal

**Completed Badge (if is_completed):**
- Icon: check-circle-fill
- Text: "Completed"
- Card background may be faded/grayed out

---

### 4. Add Goal Modal

**Title:** "Add New Goal 🎯"

**Fields:**

| Field | Type | Validation | Max length |
|-------|------|------------|------------|
| Goal Title * | Text input | Required, trimmed | 200 |
| Description | Textarea | Optional, trimmed | 500 |
| Priority | Dropdown select | Optional, default "medium" | — |
| Category | Dropdown select | Optional, default "general" | — |
| Deadline | Date input | Optional | — |
| Target Value | Number input | Optional, min 0 | — |
| Unit | Text input | Optional | 30 |
| Milestones | Add input + chips | Optional | — |

**Milestone input:**
- Text field + "Add" button (plus icon)
- Press Enter or click "+" to add
- Displays as removable chips below
- Each chip has "X" button to remove

**Buttons:**
- Cancel (closes modal, discards form)
- Create Goal (disabled while saving, shows "Saving..." while in-flight)

**Behavior:**
1. Validate: title must not be empty after trimming
2. If invalid: show error "Title is required."
3. If valid: POST `/goals` with all fields
4. On success: close modal, prepend new goal to list, reload list
5. On error: show error message, allow retry

---

### 5. Edit Goal Modal

**Title:** "Edit Goal ✏️"

Same fields as Add Goal modal, but:
- All fields pre-filled with current goal values
- Deadline field: slice to `YYYY-MM-DD` format
- Target value: parsed as float (may be decimal)
- Milestones: extracted as string array of labels
- **Important note:** "Milestones (replaces existing)" — indicates that sending milestones will replace all existing ones

**Buttons:**
- Cancel (closes modal, discards edits)
- Save Changes (disabled while saving, shows "Saving..." while in-flight)

**Behavior:**
1. Validate: title must not be empty after trimming
2. If invalid: show error "Title is required."
3. If valid: PATCH `/goals/{goalId}` with updated fields
4. On success: close modal, update goal in list
5. On error: show error message, allow retry

---

### 6. Log Progress Modal

**Title:** "Log Progress 📈"

**Context display:**
- Goal title (e.g., "Run a Marathon")
- Current progress: "Current: {current_value} / {target_value} {unit}" (e.g., "Current: 15.3 / 42.2 km")

**Fields:**

| Field | Type | Validation |
|-------|------|------------|
| Amount to add * | Number input | Required, must be valid number (can be negative) |
| Note | Text input | Optional, max 200 chars |

**Buttons:**
- Cancel (closes modal)
- Log Progress (disabled while saving, shows "Saving..." while in-flight)

**Behavior:**
1. Validate: delta must be a valid number
2. If invalid: show error "Enter a valid number."
3. If valid: PATCH `/goals/{goalId}/progress` with delta + note
4. On success: close modal, update goal in list with new current_value and progress_percentage
5. On error: show error message, allow retry

---

## Computed Values

| Value | Formula |
|-------|---------|
| Progress percentage | Provided by backend (`goal.progress_percentage`) |
| Completed milestones | Count of milestones where `is_completed === true` |
| Total milestones | `goal.milestones.length` |
| Progress bar height % | `goal.progress_percentage` (0–100) |
| Progress bar color | ≥ 80% green, 40–79% blue, < 40% orange |

---

## Screen States

| State | Behavior |
|-------|----------|
| **Loading** | Full-screen loader: "Loading your goals..." |
| **Error** | Error message with "Retry" button that calls `GET /goals` again |
| **Empty goals** | Empty state card with "Add Goal" CTA |
| **With goals** | Display goals grid, show filter + add buttons |

---

## Navigation & Link Map

```
/goals
  ├── [Add Goal button] → open Add Goal modal
  ├── [Goal card (edit icon)] → open Edit Goal modal
  ├── [Goal card (delete icon)] → DELETE /goals/{id} immediately
  ├── [Milestone checkbox] → PATCH /goals/{id}/milestones/{mId}/toggle
  ├── [Log Progress button] → open Log Progress modal
  └── [Filter button] → toggle includeCompleted, reload goals
```

---

## Filter Behavior

**Include Completed toggle:**
- Default state: `includeCompleted = true` → shows all goals (active + completed)
- Button text: "All Goals" when true, "Active Only" when false
- Clicking toggle:
  1. Inverts `includeCompleted` value
  2. Calls `GET /goals?include_completed={new_value}`
  3. Reloads goals list
  4. Updates button text and style (`.active` class when false)

---

## Priority Colors & Labels

| Priority | Label | Color | Class |
|----------|-------|-------|-------|
| high | HIGH PRIORITY | Red/Danger | `.priority-high` |
| medium | MEDIUM | Yellow/Warning | `.priority-medium` |
| low | LOW | Gray/Secondary | `.priority-low` |

---

## Progress Bar Color Coding

| Percentage | Color | Class | Meaning |
|------------|-------|-------|---------|
| ≥ 80% | Green | `.bar-green` | Near completion |
| 40–79% | Blue | `.bar-blue` | Good progress |
| < 40% | Orange | `.bar-orange` | Early stage |

---

## Error Handling Patterns

| Error | Handling |
|-------|----------|
| Load goals failure | Show error page with retry button |
| Create goal failure | Show error in modal, allow retry |
| Update goal failure | Show error in modal, allow retry |
| Delete goal failure | Log error silently, remove from UI (optimistic) or reload |
| Toggle milestone failure | Log error, silently reload goal |
| Log progress failure | Show error in modal, allow retry |

---

## UI/UX Details

### Layout (Desktop)

Grid layout with responsive columns:
- 1 column on small screens
- 2–3 columns on medium/large screens

### Layout (Mobile)

Single-column stack, scrollable vertically.

### Scrolling

- Goals list: scrollable if content exceeds viewport
- Modals: scrollable if form content exceeds modal height

### Interaction

- Click goal card background: no action (just visual feedback)
- Click edit icon: open Edit modal (stop propagation)
- Click delete icon: DELETE immediately (stop propagation, no confirmation)
- Click milestone checkbox: toggle (with loading state)
- Click "Log Progress": open modal
- Click "Add Goal" / "Add Goal" in header: open Add modal
- Click filter button: toggle filter and reload

### Visual Feedback

- Completed goals: card background is faded/grayed
- Completed milestones: row is strikethrough or faded
- Loading states: disabled buttons with "Saving..." text
- Milestone toggle: spinning arrow icon during toggle
- Delete: optimistic removal or reload on failure

---

## Performance Considerations

- Cache goals locally; show cached data while fetching fresh
- Optimize re-renders when toggling milestones (update only affected goal)
- Lazy load progress logs if clicking into a goal detail view (future feature)
- Pagination: if 100+ goals exist, consider paginating or lazy loading
