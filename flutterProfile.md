# Flutter Profile Reference — Ascendlyx

Reference document for implementing the **Profile** screen in the Ascendlyx Flutter mobile app. All information is derived directly from the Angular web frontend.

---

## Base URL

| Environment | Base URL |
|-------------|----------|
| Development | `http://localhost:3000/api/v1` |
| Production  | Replace with production domain |

All requests require `Authorization: Bearer <access_token>` header.

---

## API Endpoints

### 1. Get Own Profile

| Property | Value |
|----------|-------|
| Method   | `GET` |
| Endpoint | `/profile` |
| Auth     | Bearer token required |

**Success response `200`:**
```json
{
  "user_id": "uuid",
  "name": "John Doe",
  "username": "johndoe",
  "bio": "Passionate about personal growth and habit building",
  "location": "San Francisco, CA",
  "avatar_url": null,
  "avatar_initial": "J",
  "membership_tier": "free",
  "joined_at": "2025-01-15T10:30:00Z",
  "quick_stats": {
    "current_streak": 5,
    "ai_score": 75,
    "friends_count": 12,
    "consistency_percent": 82
  },
  "productivity_stats": {
    "habits_done_total": 345,
    "active_goals_count": 3,
    "books_read_count": 7,
    "longest_streak_days": 28,
    "focus_time_hours": 42.5,
    "badges_earned_count": 8
  },
  "consistency": {
    "percentage": 82,
    "rating": "Good",
    "percentile": 72
  },
  "public_goals": [
    {
      "id": "uuid",
      "title": "Read 12 books this year",
      "progress_percentage": 58,
      "priority": "high",
      "unit": "books",
      "target_value": 12
    }
  ],
  "badges": [
    {
      "slug": "first-week",
      "name": "First Week",
      "description": "Completed habits for 7 consecutive days",
      "icon_value": "🏁",
      "earned": true,
      "earned_at": "2025-01-22T10:30:00Z",
      "criteria": "7 consecutive days of habit completion"
    },
    {
      "slug": "speed-demon",
      "name": "Speed Demon",
      "description": "Complete 10 habits in a single day",
      "icon_value": "⚡",
      "earned": false,
      "earned_at": null,
      "criteria": "10 habits in one day"
    }
  ],
  "privacy": {
    "show_streaks_publicly": true,
    "share_habit_completions": false,
    "public_goal_visibility": true,
    "show_ai_score_publicly": true,
    "show_friends_count": true,
    "show_productivity_stats": false
  }
}
```

**Fields:**
- `user_id`: unique user identifier
- `username`: unique username handle
- `bio`: user bio (optional, can be empty)
- `location`: user location (optional)
- `avatar_url`: URL to avatar image (null if not set)
- `avatar_initial`: first letter of name for avatar fallback
- `membership_tier`: one of `"free"`, `"pro"`, `"enterprise"`
- `joined_at`: ISO 8601 timestamp
- `quick_stats`: 4 key metrics displayed in header
- `productivity_stats`: 6 lifetime/current stats
- `consistency`: percentage, rating tier, and percentile rank
- `public_goals`: array of goals marked as public
- `badges`: all badges with earned/locked status
- `privacy`: 6 boolean toggles for public visibility

**Error handling:**
- `error.detail` → display error message
- Fallback: `"Failed to load profile. Please try again."`

---

### 2. Update Profile

| Property | Value |
|----------|-------|
| Method   | `PATCH` |
| Endpoint | `/profile` |
| Auth     | Bearer token required |

**Request body:**
```json
{
  "username": "johndoe",
  "bio": "Passionate about personal growth",
  "location": "San Francisco, CA",
  "avatar_url": "https://example.com/avatars/john.jpg"
}
```

**Field notes:**
- All fields optional (send only fields being updated)
- `username`: unique, alphanumeric + underscore
- `bio`: max 500 characters
- `location`: max 100 characters
- `avatar_url`: valid HTTPS URL or null to remove

**Success response `200`:** Updated `OwnProfile` object (full profile with changes applied).

**Error handling:**
- `error.detail` → username already taken, invalid URL, etc.
- Show error message in edit modal, allow retry

---

### 3. Update Privacy Settings

| Property | Value |
|----------|-------|
| Method   | `PATCH` |
| Endpoint | `/profile/privacy` |
| Auth     | Bearer token required |

**Request body:**
```json
{
  "show_streaks_publicly": true,
  "share_habit_completions": false,
  "public_goal_visibility": true,
  "show_ai_score_publicly": true,
  "show_friends_count": true,
  "show_productivity_stats": false
}
```

**Field notes:**
- All fields optional (send only toggles being changed)
- Each field controls visibility of that metric on public profile

**Success response `200`:**
```json
{
  "show_streaks_publicly": true,
  "share_habit_completions": false,
  "public_goal_visibility": true,
  "show_ai_score_publicly": true,
  "show_friends_count": true,
  "show_productivity_stats": false
}
```

**Updated object:** Returned privacy settings, merged into profile's `privacy` field.

**Optimistic update:**
- Update UI immediately with new toggle state
- On success: confirm (no action needed)
- On error: reload full profile to restore server state, show error message

---

## Data Model Shapes

### OwnProfile
```json
{
  "user_id": "uuid",
  "name": "John Doe",
  "username": "johndoe",
  "bio": "Passionate about personal growth",
  "location": "San Francisco, CA",
  "avatar_url": null,
  "avatar_initial": "J",
  "membership_tier": "free",
  "joined_at": "2025-01-15T10:30:00Z",
  "quick_stats": { /* QuickStats */ },
  "productivity_stats": { /* ProductivityStats */ },
  "consistency": { /* ConsistencyData */ },
  "public_goals": [ /* PublicGoal[] */ ],
  "badges": [ /* Badge[] */ ],
  "privacy": { /* PrivacySettings */ }
}
```

---

### QuickStats
```json
{
  "current_streak": 5,
  "ai_score": 75,
  "friends_count": 12,
  "consistency_percent": 82
}
```

Displayed in hero card as 4 stat cards:
- "🔥 5" (current streak)
- "⭐ 75" (AI score 0-100)
- "👥 12" (friends)
- "📊 82%" (consistency)

---

### ProductivityStats
```json
{
  "habits_done_total": 345,
  "active_goals_count": 3,
  "books_read_count": 7,
  "longest_streak_days": 28,
  "focus_time_hours": 42.5,
  "badges_earned_count": 8
}
```

Displayed as:
- "345 Habits Completed"
- "3 Active Goals"
- "7 Books Read"
- "28-Day Best Streak"
- "42.5 Hours Focused"
- "8 Badges Earned"

---

### ConsistencyData
```json
{
  "percentage": 82,
  "rating": "Good",
  "percentile": 72
}
```

**Rating values:** `"Excellent"` | `"Good"` | `"Average"` | `"Needs Work"`

**Color mapping:**
- Excellent: green
- Good: blue
- Average: orange
- Needs Work: red

**Display:**
- Gauge chart: circular progress from 0-100%
- Center text: "{percentage}% · {rating}"
- Bottom: "Top {percentile}% of users"

---

### PublicGoal
```json
{
  "id": "uuid",
  "title": "Read 12 books this year",
  "progress_percentage": 58,
  "priority": "high",
  "unit": "books",
  "target_value": 12
}
```

**Priority colors:**
- `high`: red
- `medium`: orange/yellow
- `low`: gray

**Display:**
- Title text
- Progress bar: color coded by priority
- Progress: "{progress_percentage}%"
- Unit (if available): "{current_value}/{target_value} {unit}"

---

### Badge
```json
{
  "slug": "first-week",
  "name": "First Week",
  "description": "Completed habits for 7 consecutive days",
  "icon_value": "🏁",
  "earned": true,
  "earned_at": "2025-01-22T10:30:00Z",
  "criteria": "7 consecutive days of habit completion"
}
```

**Display:**
- Emoji icon: large (icon_value)
- Name: badge name
- Description: what the badge represents
- Earned badge: colored, clickable for details
- Locked badge: grayed out, dimmed opacity
- On tap: show popup with description + criteria + earned date (if earned)

---

### PrivacySettings
```json
{
  "show_streaks_publicly": true,
  "share_habit_completions": false,
  "public_goal_visibility": true,
  "show_ai_score_publicly": true,
  "show_friends_count": true,
  "show_productivity_stats": false
}
```

Each field is a toggle switch:

| Field | Label | Description |
|-------|-------|-------------|
| `show_streaks_publicly` | Show Streaks | Make your streak visible on public profile |
| `share_habit_completions` | Share Habit Completions | Show completed habits in activity feed |
| `public_goal_visibility` | Public Goals | Make goals visible on public profile |
| `show_ai_score_publicly` | Show AI Score | Display productivity score on profile |
| `show_friends_count` | Show Friends Count | Display friend count on profile |
| `show_productivity_stats` | Productivity Stats | Show all stats on public profile |

---

### UpdateProfilePayload (Request)
```json
{
  "username": "johndoe",
  "bio": "Passionate about growth",
  "location": "San Francisco, CA",
  "avatar_url": "https://example.com/avatars/john.jpg"
}
```

All fields optional.

---

### UpdatePrivacyPayload (Request)
```json
{
  "show_streaks_publicly": true,
  "show_ai_score_publicly": false
}
```

All fields optional (only send toggles being changed).

---

### MembershipTier (enum)
```
"free" | "pro" | "enterprise"
```

---

## Screen Sections & Features

### 1. Loading State

**Shown during initial profile load:**
- Full-screen skeleton loader with profile layout
- Animated shimmer effect on each section
- All interactive elements disabled

---

### 2. Error State

**Shown if profile load fails:**
- Error banner at top: "{error_message}"
- "Retry" button below message
- On click: retry GET /profile

---

### 3. Hero Card Section

**Profile Header (top of hero card):**
- Avatar: large emoji or image (160x160 px)
- Name (bold, large text): "{name}"
- Username (secondary, small): "@{username}"
- Bio (if present): "{bio}" (italic, 2-3 lines max)
- Location (if present): "📍 {location}" (secondary text)
- Membership badge: "PRO" or "ENTERPRISE" (if not free tier)
- Joined date (secondary): "Joined {month} {year}" (e.g., "Joined January 2025")
- Edit button (top right): pencil icon or "Edit Profile"

**Quick Stats (below header, 4-column grid):**
- Stat cards with icon, number, and label:
  - "🔥" + {current_streak} + "Current Streak"
  - "⭐" + {ai_score} + "AI Score" (0-100)
  - "👥" + {friends_count} + "Friends"
  - "📊" + {consistency_percent}% + "Consistency"

**On Edit Click:**
- Open edit profile modal (see section below)

---

### 4. Edit Profile Modal

**Form fields:**
- Name (text input): "{name}", max 100 chars
- Username (text input): "@{username}", max 50 chars (alphanumeric + underscore)
- Bio (textarea): "{bio}", max 500 chars, shows char counter
- Location (text input): "{location}", max 100 chars
- Avatar (optional, not editable in simple modal; may link to upload)

**Buttons:**
- Cancel (left): closes modal without saving
- Save (right): validates and POSTs PATCH /profile
  - Disabled while saving
  - Shows loading spinner while saving

**Validation:**
- Username: required, alphanumeric + underscore only
- Bio: max 500 chars
- Location: max 100 chars

**Error handling:**
- Show error message below form
- Username taken: specific error message
- Other errors: "{error.detail}"
- Keep modal open, allow retry

**Success:**
- Close modal
- Update profile display with new values

---

### 5. Productivity Stats Section (Left Column)

**Grid layout (2 columns):**
- Each stat as a card:
  - Icon + number (large text)
  - Label (small text)
  - Click for details (optional)

**Stat cards:**
1. "📚 345" + "Habits Completed"
2. "🎯 3" + "Active Goals"
3. "📖 7" + "Books Read"
4. "📈 28" + "Best Streak (days)"
5. "⏱ 42.5" + "Focus Time (hours)"
6. "🏆 8" + "Badges Earned"

**On tap:** May navigate to detail view (optional implementation).

---

### 6. Consistency Gauge Section (Right Column)

**Visual:**
- Circular progress gauge (conic-gradient):
  - Center: {percentage}% in large text + rating label in smaller text
  - Ring: colored by rating (green/blue/orange/red)
  - Angle: {percentage} * 3.6 degrees
  - Percentile below: "Top {percentile}% of users"

**Color by rating:**
- Excellent: green (#10B981)
- Good: blue (#3B82F6)
- Average: orange (#F59E0B)
- Needs Work: red (#EF4444)

**Interaction:**
- Tap for more details (optional tooltip)

---

### 7. Public Goals Section (Left Column)

**Header:**
- "Public Goals" + count badge: "({count})"
- May have "View all" button

**Goal items (list or compact grid):**
- Title: "{title}"
- Priority badge (colored): "high" / "medium" / "low"
- Progress bar: {progress_percentage}% (color-coded by priority)
- Progress text (right): "{progress_percentage}%" or "{current}/{target} {unit}"

**Priority colors:**
- high: red
- medium: orange
- low: gray

**On tap:** Navigate to goal detail or open in read-only mode.

**Empty state:** "No public goals yet"

---

### 8. Badges Grid Section (Right Column)

**Header:**
- "Achievements" or "Badges"
- Show earned count: "{earned_count} earned" below title

**Grid layout (4-6 columns depending on screen size):**

**Earned badges (colored):**
- Large emoji icon (center)
- Name below (small text)
- Click to see details (modal or popover):
  - Emoji + name (bold)
  - Description
  - Date earned: "Earned {month} {day}, {year}"
  - Criteria (small text)

**Locked badges (grayed out):**
- Large emoji icon with low opacity
- Name below (muted text)
- Click to see details:
  - Emoji + name (muted)
  - Description
  - "Locked — Not earned yet"
  - Criteria + progress toward unlocking
  - Example: "Get 28-day streak (current: 5 days)"

**Scrollable if many badges** (typically 10-20 total).

---

### 9. Privacy Settings Section (Right Column, Bottom)

**Header:**
- "Privacy" icon + label

**Toggle switches (vertical stack):**
1. "Show Streaks" — toggle {show_streaks_publicly}
2. "Share Completions" — toggle {share_habit_completions}
3. "Public Goals" — toggle {public_goal_visibility}
4. "AI Score" — toggle {show_ai_score_publicly}
5. "Friends Count" — toggle {show_friends_count}
6. "Productivity Stats" — toggle {show_productivity_stats}

**Each toggle:**
- Label (left): readable name
- Toggle switch (right): on/off state
- On toggle change: optimistic update + PATCH /profile/privacy
- Saving state: show spinner while request in-flight
- On success: confirm (no UI change needed)
- On error: revert toggle, show error message, reload profile

**Error message:** "Failed to update privacy settings. Please try again."

---

## Screen States

| State | Behavior |
|-------|----------|
| **Loading** | Show skeleton loader (no interaction) |
| **Error** | Show error banner with retry button |
| **Loaded** | Display all sections, enable interactions |
| **Edit modal open** | Disable main content, show modal |
| **Saving privacy** | Show spinner on toggle, disable toggle |
| **Edit saving** | Show loading state in modal, disable buttons |

---

## Navigation & Interactions

```
/profile
  ├── [Edit button] → open edit profile modal
  ├── [Edit modal Save] → PATCH /profile → update profile display
  ├── [Edit modal Cancel] → close modal without saving
  ├── [Privacy toggle] → PATCH /profile/privacy → update toggle state
  ├── [Goal item] → navigate to goal detail (optional)
  ├── [Badge item] → show badge detail popup/modal
  ├── [Retry button] → GET /profile → reload profile
  └── [Section headers] → may expand/collapse details (optional)
```

---

## Computed Values & Formatting

### Consistency Rating Color

Map from rating string to color:

```
"Excellent" → green (#10B981)
"Good" → blue (#3B82F6)
"Average" → orange (#F59E0B)
"Needs Work" → red (#EF4444)
Default → gray
```

### Consistency Gauge Angle

```
angle = (consistency.percentage / 100) * 360
```

Use conic-gradient for circular progress: `conic-gradient(color 0deg, color {angle}deg, gray {angle}deg, gray 360deg)`

### Joined Date Formatting

```
"Joined {MMMM} {YYYY}"
Example: "Joined January 2025"
```

### Earned Badges Filter

```
earned_badges = badges.filter(b => b.earned === true)
locked_badges = badges.filter(b => b.earned === false)
```

---

## Error Handling

| Error | Handling |
|-------|----------|
| Load profile failure | Show error banner with retry button |
| Update profile failure | Show error in modal, allow retry |
| Username already taken | Show specific error message in modal |
| Update privacy failure | Show error toast, reload profile to restore state |
| Network error | Generic "Network error" message |

---

## Optimistic Updates

### Privacy Settings
- Update toggle state immediately in UI
- PATCH to server in background
- On success: no action (already updated)
- On failure: revert toggle to previous state, reload profile

### Edit Profile
- Close modal on save, don't update display yet
- Wait for PATCH response
- Update display with response data
- On error: show error in modal, keep modal open

---

## Membership Tier Display

**Free tier:**
- No special badge/indicator
- May show "Upgrade to Pro" button/banner

**Pro tier:**
- "PRO" badge: blue or purple color
- May show additional features/stats

**Enterprise tier:**
- "ENTERPRISE" badge: gold/premium color
- May show additional features/analytics

---

## Avatar Display

**Fallback order:**
1. If `avatar_url` present: load image from URL
2. Else: display colored initial circle with {avatar_initial} character

**Avatar colors:** Same gradient algorithm as other modules (avatar_initial charCode % 8 gradients)

---

## Responsive Layout

**Desktop (≥768px):**
- Hero card: full width
- Content grid: 2 columns (left + right), side-by-side

**Mobile (<768px):**
- Hero card: full width
- Content grid: single column (stack vertically)
  - Left column sections
  - Right column sections below

---

## Performance Considerations

- **Lazy load images:** Load avatar image only when visible
- **Skeleton loader:** Show during initial load (smooth UX)
- **Optimistic updates:** Update UI before server confirms (faster perceived performance)
- **Debounce privacy toggles:** Prevent multiple requests if user toggles rapidly
- **Error recovery:** Reload on error rather than complex error states

---

## Security & Validation

- **Content validation:** Trim and sanitize bio, location, username before sending
- **Max lengths:** Bio 500 chars, location 100 chars, username 50 chars — enforce client-side + server
- **Username format:** Alphanumeric + underscore only, no spaces or special chars
- **Avatar URL:** Validate HTTPS URL format before sending
- **No sensitive data in logs:** Don't log user ID, bio, or other personal info
- **XSS prevention:** Escape/sanitize user-provided text (name, bio, location) for display

---

## Accessibility

- **ARIA labels:** All buttons and toggles have descriptive labels
- **Color contrast:** All text meets WCAG AA standards
- **Keyboard navigation:** Focus management in edit modal, Enter to submit
- **Semantic HTML:** Use proper heading and button elements
- **Toggle switch:** Proper ARIA attributes for accessibility (checked state, role)

---

## Recommended Implementation Order

1. Load and display profile GET /profile (basic layout)
2. Display all sections with data (hero, stats, consistency, goals, badges, privacy)
3. Error handling + retry flow
4. Edit profile modal (PATCH /profile)
5. Privacy settings toggles (PATCH /profile/privacy)
6. Badge detail modal/popover
7. Polish: animations, responsive layout, loading states
8. Optimization: image lazy loading, caching

