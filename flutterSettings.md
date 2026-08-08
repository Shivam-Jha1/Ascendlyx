# Flutter Settings Reference — Ascendlyx

Reference document for implementing the **Settings** screen in the Ascendlyx Flutter mobile app. All information is derived directly from the Angular web frontend.

---

## Base URL

| Environment | Base URL |
|-------------|----------|
| Development | `http://localhost:3000/api/v1` |
| Production  | Replace with production domain |

All requests require `Authorization: Bearer <access_token>` header.

---

## API Endpoints

### 1. Get All Settings

| Property | Value |
|----------|-------|
| Method   | `GET` |
| Endpoint | `/settings` |
| Auth     | Bearer token required |

**Success response `200`:**
```json
{
  "appearance": {
    "theme": "dark",
    "accent_color": "blue",
    "compact_mode": false
  },
  "notifications": {
    "daily_habit_reminders": true,
    "streak_alerts": true,
    "friend_activity": false,
    "ai_coach_nudges": true,
    "leaderboard_updates": false,
    "email_notifications": true,
    "push_notifications": true,
    "quiet_hours_enabled": true,
    "quiet_hours_start": "22:00",
    "quiet_hours_end": "08:00"
  },
  "privacy": {
    "public_profile": true,
    "activity_feed_visible": true,
    "hide_specific_habits": false,
    "show_streaks_publicly": true,
    "share_habit_completions": true,
    "public_goal_visibility": true
  },
  "security": {
    "two_fa_enabled": false,
    "active_sessions_count": 2,
    "login_notifications_enabled": true
  },
  "subscription": {
    "tier": "free",
    "joined_at": "2025-01-15T10:30:00Z",
    "renews_at": null
  }
}
```

**Fields:**
- `appearance`: theme, accent color, compact mode
- `notifications`: 10 notification settings + quiet hours
- `privacy`: 6 privacy toggles
- `security`: 2FA status, session count, login alerts
- `subscription`: membership tier and dates

**Error handling:**
- Network error → `"Network error. Please check your connection."`
- HTTP error → `error.detail` or `"Error {status}: {statusText}"`

---

### 2. Update Appearance Settings

| Property | Value |
|----------|-------|
| Method   | `PATCH` |
| Endpoint | `/settings/appearance` |
| Auth     | Bearer token required |

**Request body:**
```json
{
  "theme": "light",
  "accent_color": "cyan",
  "compact_mode": true
}
```

**Field notes:**
- All fields optional (send only what's being updated)
- `theme`: one of `"dark"`, `"light"`
- `accent_color`: one of `"blue"`, `"cyan"`, `"green"`, `"red"`
- `compact_mode`: boolean (reduces spacing/sizes)

**Success response `200`:** Updated `AppearanceSettings` object.

**UI update:** 
- Apply theme immediately (toggle `theme-light` class, set `data-theme` attribute)
- Apply accent color immediately (set CSS variable `--accent-blue`)
- Update displayed toggle/radio states

**Optimistic update:**
- Update UI immediately
- On success: confirm (no action needed, already applied)
- On error: revert to previous values, show error message

---

### 3. Update Notification Settings

| Property | Value |
|----------|-------|
| Method   | `PATCH` |
| Endpoint | `/settings/notifications` |
| Auth     | Bearer token required |

**Request body:**
```json
{
  "daily_habit_reminders": true,
  "streak_alerts": false,
  "quiet_hours_enabled": true,
  "quiet_hours_start": "22:00",
  "quiet_hours_end": "08:00"
}
```

**Field notes:**
- All fields optional
- `quiet_hours_start` and `quiet_hours_end`: HH:MM format (24-hour)
- If `quiet_hours_enabled === true`, both start/end times required

**Success response `200`:** Updated `NotificationSettings` object.

**Optimistic update:**
- Update UI immediately
- On success: confirm
- On error: revert, show error message

---

### 4. Update Privacy Settings

| Property | Value |
|----------|-------|
| Method   | `PATCH` |
| Endpoint | `/settings/privacy` |
| Auth     | Bearer token required |

**Request body:**
```json
{
  "public_profile": true,
  "activity_feed_visible": false,
  "hide_specific_habits": true,
  "show_streaks_publicly": true,
  "share_habit_completions": false,
  "public_goal_visibility": true
}
```

**Field notes:**
- All fields optional
- Each toggle controls visibility of that aspect on public profile

**Success response `200`:** Updated `PrivacySettings` object.

---

### 5. Get Habit Privacy List

| Property | Value |
|----------|-------|
| Method   | `GET` |
| Endpoint | `/settings/privacy/habits` |
| Auth     | Bearer token required |

**Success response `200`:**
```json
[
  {
    "habit_id": "uuid",
    "habit_name": "Morning Meditation",
    "category": "Wellness",
    "is_hidden": false
  },
  {
    "habit_id": "uuid",
    "habit_name": "Journaling",
    "category": "Wellness",
    "is_hidden": true
  }
]
```

**Returns:** List of all user's habits with privacy status.

---

### 6. Update Individual Habit Privacy

| Property | Value |
|----------|-------|
| Method   | `PATCH` |
| Endpoint | `/settings/privacy/habits` |
| Auth     | Bearer token required |

**Request body:**
```json
{
  "habit_id": "uuid",
  "is_hidden": true
}
```

**Success response `200`:** Empty body.

**Purpose:** Hide specific habit from public profile/activity feed.

---

### 7. Update Login Notifications

| Property | Value |
|----------|-------|
| Method   | `PATCH` |
| Endpoint | `/settings/security/login-notifications` |
| Auth     | Bearer token required |

**Request body:**
```json
{
  "enabled": true
}
```

**Success response `200`:** Empty body.

**Purpose:** Enable/disable notifications when account is logged in from new device.

---

### 8. Get Active Sessions

| Property | Value |
|----------|-------|
| Method   | `GET` |
| Endpoint | `/settings/sessions` |
| Auth     | Bearer token required |

**Success response `200`:**
```json
[
  {
    "id": "session-uuid",
    "device_name": "Chrome on MacOS",
    "device_type": "desktop",
    "ip_address": "192.168.1.100",
    "location": "San Francisco, CA",
    "last_used_at": "2026-05-10T14:30:00Z",
    "is_current": true
  },
  {
    "id": "session-uuid",
    "device_name": "Safari on iPhone",
    "device_type": "mobile",
    "ip_address": "203.0.113.45",
    "location": "San Francisco, CA",
    "last_used_at": "2026-05-09T10:15:00Z",
    "is_current": false
  }
]
```

**Fields:**
- `id`: unique session identifier
- `device_name`: user-friendly device name (e.g., "Chrome on MacOS")
- `device_type`: one of `"mobile"`, `"desktop"`, `"tablet"`, `"unknown"`
- `ip_address`: IP address of the session
- `location`: geographic location (if available)
- `last_used_at`: ISO 8601 timestamp
- `is_current`: boolean (true for current session)

---

### 9. Revoke Single Session

| Property | Value |
|----------|-------|
| Method   | `DELETE` |
| Endpoint | `/settings/sessions/{sessionId}` |
| Auth     | Bearer token required |

**Success response `200`:** Empty body.

**Effect:** Session is immediately invalidated, user is logged out on that device.

**UI update:** Remove session from list, show toast "Session revoked".

---

### 10. Revoke All Other Sessions

| Property | Value |
|----------|-------|
| Method   | `DELETE` |
| Endpoint | `/settings/sessions` |
| Auth     | Bearer token required |

**Success response `200`:** Empty body.

**Effect:** All sessions except current are invalidated.

**UI update:** Keep only current session in list, show toast "All other sessions revoked".

---

### 11. Setup 2FA

| Property | Value |
|----------|-------|
| Method   | `POST` |
| Endpoint | `/settings/2fa/setup` |
| Auth     | Bearer token required |

**Request body:** Empty object `{}`

**Success response `200`:**
```json
{
  "secret": "JBSWY3DPEBLW64TMMQ======",
  "qr_code_url": "https://api.example.com/qr?secret=...",
  "backup_codes": [
    "ABCD-1234",
    "EFGH-5678",
    "IJKL-9012",
    ...
  ]
}
```

**Fields:**
- `secret`: base32-encoded TOTP secret
- `qr_code_url`: URL to QR code image for scanning in authenticator app
- `backup_codes`: 8-10 recovery codes, one-time use each

**UI flow:**
- Open 2FA setup modal
- Display QR code image
- Show recovery codes with "Download/Copy" option
- Input field for user to enter 6-digit TOTP code
- On submit: call endpoint #12 (confirm2FA)

---

### 12. Confirm 2FA Setup

| Property | Value |
|----------|-------|
| Method   | `POST` |
| Endpoint | `/settings/2fa/confirm` |
| Auth     | Bearer token required |

**Request body:**
```json
{
  "totp_code": "123456"
}
```

**Field notes:**
- `totp_code`: 6-digit code from authenticator app

**Success response `200`:** Empty body.

**Effect:** 2FA is enabled, settings updated with `two_fa_enabled: true`.

**UI update:**
- Close modal
- Update security section to show "2FA Enabled"
- Show toast "Two-factor authentication enabled"

---

### 13. Disable 2FA

| Property | Value |
|----------|-------|
| Method   | `POST` |
| Endpoint | `/settings/2fa/disable` |
| Auth     | Bearer token required |

**Request body:**
```json
{
  "password": "user_password",
  "totp_code": "123456"
}
```

**Field notes:**
- `password`: user's account password (required for security)
- `totp_code`: 6-digit code from authenticator app

**Success response `200`:** Empty body.

**Effect:** 2FA is disabled, settings updated with `two_fa_enabled: false`.

**UI update:**
- Close modal
- Update security section to show "2FA Disabled"
- Show toast "Two-factor authentication disabled"

---

### 14. Request Account Deletion

| Property | Value |
|----------|-------|
| Method   | `DELETE` |
| Endpoint | `/account` |
| Auth     | Bearer token required |

**Request body:**
```json
{
  "password": "user_password",
  "totp_code": "123456",
  "confirm_phrase": "delete my account"
}
```

**Field notes:**
- `password`: required, user's account password
- `totp_code`: required if 2FA enabled, 6-digit code
- `confirm_phrase`: exact phrase user must type to confirm

**Success response `200`:**
```json
{
  "message": "Account deletion requested successfully",
  "deletion_date": "2026-05-17T00:00:00Z",
  "grace_period_days": 7
}
```

**Fields:**
- `deletion_date`: ISO 8601 timestamp when account will be permanently deleted
- `grace_period_days`: number of days (e.g., 7) before permanent deletion

**UI flow:**
- Show confirmation modal
- Warn user about grace period (e.g., "Your account will be deleted in 7 days")
- Request password confirmation
- Request 2FA code (if 2FA enabled)
- Request confirmation phrase (user must type exact phrase)
- On success: show message with deletion date, display "Cancel Deletion" button
- Navigate away or show grace period countdown

---

### 15. Cancel Account Deletion

| Property | Value |
|----------|-------|
| Method   | `POST` |
| Endpoint | `/account/cancel-deletion` |
| Auth     | Bearer token required |

**Request body:** Empty object `{}`

**Success response `200`:** Empty body.

**Effect:** Account deletion request is cancelled, account remains active.

**UI update:**
- Remove deletion countdown/banner
- Show toast "Account deletion cancelled"

---

## Data Model Shapes

### FullSettings
```json
{
  "appearance": { /* AppearanceSettings */ },
  "notifications": { /* NotificationSettings */ },
  "privacy": { /* PrivacySettings */ },
  "security": { /* SecuritySummary */ },
  "subscription": { /* SubscriptionInfo */ }
}
```

---

### AppearanceSettings
```json
{
  "theme": "dark",
  "accent_color": "blue",
  "compact_mode": false
}
```

**Theme values:** `"dark"` | `"light"`

**Accent colors:** `"blue"` | `"cyan"` | `"green"` | `"red"`

---

### NotificationSettings
```json
{
  "daily_habit_reminders": true,
  "streak_alerts": true,
  "friend_activity": false,
  "ai_coach_nudges": true,
  "leaderboard_updates": false,
  "email_notifications": true,
  "push_notifications": true,
  "quiet_hours_enabled": true,
  "quiet_hours_start": "22:00",
  "quiet_hours_end": "08:00"
}
```

**Toggles:**
- `daily_habit_reminders`: get reminder to log habits
- `streak_alerts`: alerts when streak is about to break
- `friend_activity`: notifications about friends' activities
- `ai_coach_nudges`: messages from AI Coach
- `leaderboard_updates`: leaderboard/competition updates
- `email_notifications`: send notifications via email
- `push_notifications`: send push notifications to device
- `quiet_hours_enabled`: silence notifications during quiet hours
- `quiet_hours_start`: HH:MM (24-hour format)
- `quiet_hours_end`: HH:MM (24-hour format)

---

### PrivacySettings
```json
{
  "public_profile": true,
  "activity_feed_visible": true,
  "hide_specific_habits": false,
  "show_streaks_publicly": true,
  "share_habit_completions": true,
  "public_goal_visibility": true
}
```

**Toggles:**
- `public_profile`: profile is visible publicly
- `activity_feed_visible`: activity visible to friends
- `hide_specific_habits`: can hide individual habits (shows HabitPrivacyList)
- `show_streaks_publicly`: streaks visible on public profile
- `share_habit_completions`: habit completions shown in activity
- `public_goal_visibility`: goals visible on public profile

---

### SecuritySummary
```json
{
  "two_fa_enabled": false,
  "active_sessions_count": 2,
  "login_notifications_enabled": true
}
```

---

### ActiveSession
```json
{
  "id": "session-uuid",
  "device_name": "Chrome on MacOS",
  "device_type": "desktop",
  "ip_address": "192.168.1.100",
  "location": "San Francisco, CA",
  "last_used_at": "2026-05-10T14:30:00Z",
  "is_current": true
}
```

**Device types:** `"mobile"` | `"desktop"` | `"tablet"` | `"unknown"`

---

### SubscriptionInfo
```json
{
  "tier": "free",
  "joined_at": "2025-01-15T10:30:00Z",
  "renews_at": null
}
```

**Tier values:** `"free"` | `"pro"` | `"enterprise"`

---

### HabitPrivacyItem
```json
{
  "habit_id": "uuid",
  "habit_name": "Morning Meditation",
  "category": "Wellness",
  "is_hidden": false
}
```

---

### TwoFactorSetupData
```json
{
  "secret": "JBSWY3DPEBLW64TMMQ======",
  "qr_code_url": "https://api.example.com/qr?secret=...",
  "backup_codes": [
    "ABCD-1234",
    "EFGH-5678",
    "IJKL-9012",
    "MNOP-3456",
    "QRST-7890",
    "UVWX-2345",
    "YZAB-6789",
    "CDEF-0123"
  ]
}
```

---

## Screen Sections & Features

### 1. Settings Layout

**Two-panel layout:**
- **Left panel (sticky nav):** 6 navigation buttons for each section
- **Right panel (scrollable):** Settings sections with full width content

**Navigation sections:**
1. 🎨 Appearance
2. 🔔 Notifications
3. 🛡️ Privacy
4. 🔒 Security
5. 💳 Subscription
6. 🗑️ Delete Account (danger zone, red text)

---

### 2. Appearance Section

**Theme toggle:**
- Label: "Theme"
- Radio buttons or toggle: "Dark" / "Light"
- On change: apply immediately via CSS

**Accent color picker:**
- Label: "Accent Color"
- 4 color options with preview swatches:
  - Blue (default)
  - Cyan
  - Green
  - Red
- On change: apply immediately (set `--accent-blue` CSS variable)

**Compact mode toggle:**
- Label: "Compact Mode"
- Toggle switch: on/off
- Reduces spacing and sizes throughout app

**Save behavior:**
- Optimistic update (apply immediately)
- Send PATCH request
- On error: revert and show toast "Failed to save appearance"

---

### 3. Notifications Section

**Notification toggles (vertical list):**
1. Daily Habit Reminders
2. Streak Alerts
3. Friend Activity
4. AI Coach Nudges
5. Leaderboard Updates
6. Email Notifications
7. Push Notifications

**Quiet hours section:**
- Toggle: "Enable Quiet Hours"
- Time inputs (when enabled):
  - "Start time": HH:MM (24-hour)
  - "End time": HH:MM (24-hour)
  - E.g., "22:00" to "08:00" (10 PM to 8 AM)

**Save behavior:**
- Optimistic update
- Send PATCH request
- On error: revert and show error toast

---

### 4. Privacy Section

**Privacy toggles (vertical list):**
1. Public Profile — profile is visible publicly
2. Activity Feed Visible — activity visible to friends
3. Hide Specific Habits — show/hide individual habits
4. Show Streaks Publicly — streaks on public profile
5. Share Habit Completions — in activity feed
6. Public Goal Visibility — goals on profile

**Habit privacy management:**
- If "Hide Specific Habits" is enabled:
  - Show collapsible "Manage Habit Privacy" section
  - GET /settings/privacy/habits → list all habits
  - Each habit item shows:
    - Habit name
    - Category
    - Toggle: visible/hidden
  - On toggle: PATCH /settings/privacy/habits with habit_id + is_hidden
  - Saving state: show spinner on toggle

**Save behavior:**
- Optimistic update
- Send PATCH request
- On error: show error toast "Failed to save privacy"

---

### 5. Security Section

**2FA Setup:**
- Label: "Two-Factor Authentication"
- Status: "Enabled" (if two_fa_enabled) or "Not enabled"
- Button: "Enable" (if disabled) or "Disable" (if enabled)

**Enable 2FA flow:**
- Click "Enable" → open 2FA setup modal
- Modal displays:
  - QR code image (for scanning)
  - "Can't scan?" link to show secret key
  - Recovery codes with copy/download buttons
  - Input field: "Enter 6-digit code from authenticator"
  - "Confirm" button
- Validation: code must be exactly 6 digits
- On success: close modal, show toast "Two-factor authentication enabled"

**Disable 2FA flow:**
- Click "Disable" → open confirmation modal
- Modal requests:
  - Password input (required)
  - 6-digit code from authenticator (if 2FA enabled)
  - Checkbox: "I understand I won't be able to use 2FA until I set it up again"
- On success: close modal, show toast "Two-factor authentication disabled"

**Login notifications:**
- Label: "Login Notifications"
- Toggle: enabled/disabled
- Description: "Get alerts when you log in from a new device"
- On toggle: PATCH /settings/security/login-notifications
- Optimistic update, revert on error

**Active sessions:**
- Label: "Active Sessions"
- Description: "Manage devices that have access to your account"
- "Manage Sessions" button: loads session list
- Session list (when expanded):
  - Table/list with columns:
    - Device name (e.g., "Chrome on MacOS")
    - Device type icon (mobile/desktop/tablet)
    - IP address
    - Location (if available)
    - Last used: relative time (e.g., "5 minutes ago")
    - Badge: "Current" (if is_current)
    - Action: "Revoke" button (red/danger)
  - "Revoke all other sessions" button (bottom)
  - On revoke: DELETE /settings/sessions/{id}, remove from list, show toast

---

### 6. Subscription Section

**Subscription status:**
- Label: "Current Plan"
- Display: membership tier (Free, Pro, Enterprise)
- Joined date: "Member since {Month} {Year}"
- If Pro/Enterprise: renewal date "Renews on {date}"

**Upgrade prompt (for free tier):**
- "Upgrade to Pro" button or card
- Links to upgrade flow (may navigate to billing page)

**Billing:**
- Button: "Manage Billing" (if applicable)
- Link to billing portal or payment method management

---

### 7. Delete Account Section

**Warning section:**
- ⚠️ Icon
- Heading: "Delete Account"
- Description: "Permanently delete your account and all associated data"
- Red/danger styling

**Delete button:**
- Label: "Delete My Account"
- Red/danger styling
- On click: open delete account modal

**Delete account modal:**
- Heading: "Delete Account"
- Warning text: "This action cannot be undone. Your account will be permanently deleted in {grace_period} days."
- Form fields:
  1. Password input (required)
  2. 2FA code input (required if 2FA enabled): 6-digit field
  3. Confirmation text input: user must type exact phrase "delete my account"
- Character counter for confirmation phrase
- Buttons:
  - Cancel (closes modal)
  - Delete (red/danger, disabled until all fields valid)

**On delete success:**
- Show message: "Your account will be deleted on {deletion_date}"
- Display "Cancel Deletion" button (allows user to cancel within grace period)
- Show countdown timer to deletion date

**On delete error:**
- Show error message (e.g., "Invalid password" or "Verification code incorrect")
- Keep modal open, allow retry

---

### 8. Loading State

**Full-screen loading:**
- Spinner animation
- "Loading settings…" text
- All sections disabled

---

### 9. Error State

**Settings load failure:**
- Error message displayed
- "Retry" button
- On click: GET /settings again

---

### 10. Toast Notifications

**Auto-dismissing toasts (3-second display):**
- Position: bottom-right or top-center
- Examples:
  - "Appearance saved" (on appearance update success)
  - "Notifications saved" (on notification update success)
  - "Privacy settings saved" (on privacy update success)
  - "Two-factor authentication enabled" (on 2FA setup success)
  - "Session revoked" (on session revoke success)
  - "All other sessions revoked" (on revoke all success)
  - "{error message}" (on any error)

---

## Scroll Spy Navigation

**Feature:** Left navigation highlights active section as user scrolls

**Implementation:**
- IntersectionObserver tracks each section's visibility
- Active section updates dynamically
- Smooth scroll animation when clicking nav buttons
- Active nav button shows highlighting/background color

---

## Theme & Accent Application

**Theme application (immediate, no page reload):**
- Add/remove `theme-light` class to body
- Set `data-theme` attribute on documentElement
- Light theme: light backgrounds, dark text
- Dark theme: dark backgrounds, light text

**Accent color application:**
- Set CSS variable: `--accent-blue` to color hex value
  - Blue: `#58a6ff`
  - Cyan: `#39d2c0`
  - Green: `#3fb950`
  - Red: `#f85149`

---

## Responsive Design

**Desktop (≥768px):**
- Two-column layout (nav + content)
- Sticky left navigation
- Full-width sections on right

**Mobile (<768px):**
- Single column
- Collapsible/sticky navigation (hamburger menu or scroll-to-top)
- Sections stack vertically

---

## Optimistic Updates

**Pattern for all settings changes:**
1. Update local signal immediately
2. Apply visual changes (e.g., theme, CSS variables)
3. Send PATCH request to server
4. On success: keep UI as-is (already updated)
5. On error: revert to previous state, show error toast

**Revert strategy:**
- Store previous value before updating
- On error: restore previous value
- For theme/accent: reapply previous values to DOM

---

## Error Handling

| Error | Handling |
|-------|----------|
| Load settings failure | Show error banner with retry button |
| Appearance update failure | Revert theme/accent, show error toast |
| Notification update failure | Revert toggles, show error toast |
| Privacy update failure | Revert toggles, show error toast, may reload |
| Habit privacy update failure | Show error in habit list, allow retry |
| 2FA setup error | Show error in modal, allow retry |
| 2FA confirm error | Show "Invalid code" message, allow retry |
| 2FA disable error | Show "Invalid password/code" message, allow retry |
| Session revoke error | Show error toast, keep session visible |
| Account deletion error | Show error in modal, allow retry |
| Network error | Generic "Network error. Please check connection." |

---

## Permissions & Validation

- **2FA disable:** Requires password + 2FA code (user's own authentication)
- **Account deletion:** Requires password + 2FA code (if enabled) + exact confirmation phrase
- **Session revoke:** Can't revoke current session (API should prevent)
- **Quiet hours:** Both start and end times required if enabled

---

## Security Considerations

- **Password input:** Never echo/display password value
- **2FA codes:** 6-digit codes, numeric only
- **Recovery codes:** One-time use, can't be regenerated after setup
- **Backup codes:** User should save/print these codes
- **Account deletion:** 7-day grace period before permanent deletion
- **Login notifications:** Alerts user to unauthorized access attempts
- **Session revocation:** Immediately invalidates that session's tokens

---

## Accessibility

- **ARIA labels:** All inputs and buttons have descriptive labels
- **Color contrast:** All text meets WCAG AA standards
- **Keyboard navigation:** Tab through fields, Enter to submit forms
- **Semantic HTML:** Proper heading hierarchy and button elements
- **Focus management:** Modal focus trap for delete confirmation
- **Toggles:** Proper ARIA attributes for switch/checkbox elements
- **Toast messages:** `role="status"` with `aria-live="polite"`

---

## Recommended Implementation Order

1. Load settings (GET /settings) and display all sections
2. Appearance section: theme + accent color selection
3. Notification toggles (simple on/off)
4. Privacy toggles (simple on/off)
5. Quiet hours section with time pickers
6. Security section: 2FA toggle + status
7. Active sessions list with revoke buttons
8. Subscription section (display-only)
9. Delete account section with confirmation modal
10. Habit privacy management (if "Hide Specific Habits" enabled)
11. Scroll-spy navigation
12. Toast notifications and error handling
13. Polish: animations, responsive layout, theme persistence

