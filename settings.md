# Settings Feature — Implementation Reference

## Overview

Full user-settings backend for the Ascendlyx habit-tracker, covering appearance preferences, notification controls, privacy toggles, TOTP-based two-factor authentication, session management, and GDPR-compliant account deletion with a 30-day grace period.

---

## New Files Created

| File | Purpose |
|------|---------|
| `app/models/appearance_settings.py` | Theme / accent-color / compact-mode preferences (one-to-one with User) |
| `app/models/notification_settings.py` | Per-type notification toggles + quiet hours |
| `app/models/two_factor_auth.py` | 2FA state: encrypted TOTP secret, bcrypt-hashed backup codes |
| `app/models/habit_privacy.py` | Per-habit visibility toggle |
| `app/models/login_event.py` | Security audit log (9 event types) |
| `app/schemas/settings.py` | 20+ Pydantic request/response models |
| `app/services/settings_service.py` | CRUD for appearance / notifications / privacy |
| `app/services/two_factor_service.py` | Full TOTP lifecycle + brute-force protection |
| `app/services/session_service.py` | Active session listing (placeholder — stateless JWT) |
| `app/services/account_deletion_service.py` | Soft-delete + grace-period logic |
| `app/tasks/deletion_worker.py` | Hard-delete worker (18-step FK-safe cascade) |
| `app/utils/encryption.py` | AES-256-GCM encrypt / decrypt for TOTP secrets |
| `app/api/v1/settings.py` | Settings + Account router (13 endpoints) |
| `alembic/versions/f6a7b8c9d0e1_add_settings_security_tables.py` | Migration: 5 new tables + 2 column additions |
| `tests/test_settings.py` | 22 test cases across 7 test classes |

## Modified Files

| File | Change |
|------|--------|
| `app/models/user.py` | Added `deleted_at: datetime \| None` column |
| `app/models/privacy_settings.py` | Added `activity_feed_visible` and `hide_specific_habits` columns |
| `app/models/__init__.py` | Added imports for 5 new models |
| `alembic/env.py` | Added imports for 5 new models |
| `app/config.py` | Added `ENCRYPTION_KEY: str` setting |
| `app/core/exceptions.py` | Added 9 new exception classes for 2FA / settings / deletion |
| `app/services/auth_service.py` | 2FA login flow (pre-auth token), settings row creation on signup, login event logging |
| `app/api/v1/auth.py` | Login returns dynamic shape (tokens or pre-auth), added `POST /auth/2fa/verify` |
| `app/api/router.py` | Registered settings router |
| `tests/conftest.py` | Added `ENCRYPTION_KEY` env var |

---

## Database Changes

### New Tables

#### `appearance_settings`
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | UUID | auto | PK (from Base) |
| `user_id` | UUID | — | UNIQUE FK → `users.id` ON DELETE CASCADE |
| `theme` | Enum(`dark`, `light`) | `dark` | |
| `accent_color` | Enum(`blue`, `cyan`, `green`, `red`) | `blue` | |
| `compact_mode` | Boolean | `false` | |
| `created_at` | DateTime | now | (from Base) |
| `updated_at` | DateTime | now | (from Base) |

#### `notification_settings`
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | UUID | auto | PK |
| `user_id` | UUID | — | UNIQUE FK → `users.id` ON DELETE CASCADE |
| `daily_habit_reminders` | Boolean | `true` | |
| `streak_alerts` | Boolean | `true` | |
| `friend_activity` | Boolean | `true` | |
| `ai_coach_nudges` | Boolean | `true` | |
| `leaderboard_updates` | Boolean | `false` | |
| `email_notifications` | Boolean | `true` | |
| `push_notifications` | Boolean | `true` | |
| `quiet_hours_enabled` | Boolean | `false` | |
| `quiet_hours_start` | Time | `null` | nullable |
| `quiet_hours_end` | Time | `null` | nullable |

#### `two_factor_auth`
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | UUID | auto | PK |
| `user_id` | UUID | — | UNIQUE FK → `users.id` ON DELETE CASCADE |
| `is_enabled` | Boolean | `false` | |
| `secret_encrypted` | Text | `null` | AES-256-GCM encrypted TOTP secret |
| `backup_codes` | JSON | `null` | List of bcrypt hashes |
| `enabled_at` | DateTime(tz) | `null` | |
| `last_used_at` | DateTime(tz) | `null` | |

#### `habit_privacy`
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | UUID | auto | PK |
| `habit_id` | UUID | — | UNIQUE FK → `habits.id` ON DELETE CASCADE |
| `user_id` | UUID | — | FK → `users.id` ON DELETE CASCADE, indexed |
| `is_hidden` | Boolean | `false` | |

#### `login_events`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `users.id` ON DELETE CASCADE |
| `event_type` | Enum | 9 values (see below) |
| `ip_address` | String(45) | nullable |
| `user_agent` | String(500) | nullable |
| `device_hint` | String(200) | nullable |
| `created_at` | DateTime | |

**Composite indexes:** `(user_id, created_at)`, `(user_id, event_type)`

**Login event types:** `login_success`, `login_failed`, `2fa_success`, `2fa_failed`, `password_changed`, `2fa_enabled`, `2fa_disabled`, `session_revoked`, `account_deletion_requested`

### Altered Tables

- **`users`** — added `deleted_at: DateTime(tz) | None` for soft-delete grace period
- **`privacy_settings`** — added `activity_feed_visible: bool (default true)`, `hide_specific_habits: bool (default false)`

### Migration

- **Revision:** `f6a7b8c9d0e1`
- **Down revision:** `e5f6a7b8c9d0`
- Backfills `appearance_settings`, `notification_settings`, `two_factor_auth` rows for all existing users on upgrade

---

## API Endpoints

All endpoints require `Authorization: Bearer <token>` unless noted.

### Settings

| Method | Path | Summary | Request Body | Response |
|--------|------|---------|--------------|----------|
| `GET` | `/api/v1/settings` | Get all user settings | — | `FullSettingsResponse` |
| `PATCH` | `/api/v1/settings/appearance` | Update appearance | `AppearanceUpdate` | `AppearanceSettingsResponse` |
| `PATCH` | `/api/v1/settings/notifications` | Update notifications | `NotificationSettingsUpdate` | `NotificationSettingsResponse` |
| `PATCH` | `/api/v1/settings/privacy` | Update privacy | `PrivacyExtendedUpdate` | `PrivacyFullResponse` |
| `PATCH` | `/api/v1/settings/privacy/habits` | Toggle habit visibility | `HabitPrivacyUpdate` | `HabitPrivacyResponse` |

### Sessions

| Method | Path | Summary | Response |
|--------|------|---------|----------|
| `GET` | `/api/v1/settings/sessions` | List active sessions | `ActiveSessionResponse[]` |
| `DELETE` | `/api/v1/settings/sessions/{session_id}` | Revoke a session | `204 No Content` |
| `DELETE` | `/api/v1/settings/sessions` | Revoke all other sessions | `204 No Content` |

> **Note:** Session endpoints return empty results — full implementation requires a `refresh_tokens` DB table (currently stateless JWT + Redis blacklist).

### Two-Factor Authentication

| Method | Path | Summary | Request Body | Response |
|--------|------|---------|--------------|----------|
| `POST` | `/api/v1/settings/2fa/setup` | Initiate 2FA setup | — | `TwoFactorSetupResponse` (secret, QR URL, 8 backup codes) |
| `POST` | `/api/v1/settings/2fa/confirm` | Confirm setup with TOTP | `TwoFactorVerifyRequest` | `{ message }` |
| `POST` | `/api/v1/settings/2fa/disable` | Disable 2FA | `TwoFactorDisableRequest` (password + TOTP) | `204 No Content` |
| `POST` | `/api/v1/settings/2fa/backup-codes/verify` | Use a backup code | `BackupCodeRequest` | `BackupCodeResponse` |

### 2FA Login Flow (Auth Router)

| Method | Path | Summary | Request Body | Response |
|--------|------|---------|--------------|----------|
| `POST` | `/api/v1/auth/login` | Login (may return pre-auth) | `LoginRequest` | `TokenResponse` or `{ requires_2fa, pre_auth_token }` |
| `POST` | `/api/v1/auth/2fa/verify` | Complete 2FA login | `TwoFactorLoginRequest` | `TokenResponse` |

### Account Deletion

| Method | Path | Summary | Request Body | Response |
|--------|------|---------|--------------|----------|
| `DELETE` | `/api/v1/account` | Request deletion (30-day grace) | `DeleteAccountRequest` | `DeleteAccountResponse` |
| `POST` | `/api/v1/account/cancel-deletion` | Cancel during grace period | — | `CancelDeletionResponse` |

---

## Request / Response Schemas

### AppearanceUpdate
```json
{
  "theme": "dark" | "light",          // optional
  "accent_color": "blue" | "cyan" | "green" | "red",  // optional
  "compact_mode": true                 // optional
}
```

### NotificationSettingsUpdate
```json
{
  "daily_habit_reminders": true,
  "streak_alerts": true,
  "friend_activity": true,
  "ai_coach_nudges": true,
  "leaderboard_updates": false,
  "email_notifications": true,
  "push_notifications": true,
  "quiet_hours_enabled": false,
  "quiet_hours_start": "22:00:00",     // nullable
  "quiet_hours_end": "08:00:00"        // nullable
}
```
All fields optional (PATCH semantics).

### PrivacyExtendedUpdate
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

### HabitPrivacyUpdate
```json
{ "habit_id": "uuid", "is_hidden": true }
```

### TwoFactorSetupResponse
```json
{
  "secret": "BASE32SECRET",
  "qr_code_url": "otpauth://totp/Ascendlyx:user@example.com?...",
  "backup_codes": ["code1", "code2", ..., "code8"]
}
```

### TwoFactorVerifyRequest
```json
{ "totp_code": "123456" }
```

### TwoFactorDisableRequest
```json
{ "password": "...", "totp_code": "123456" }
```

### BackupCodeRequest / Response
```json
// Request
{ "backup_code": "ABCD1234EFGH" }

// Response
{ "verified": true, "remaining_codes": 7 }
```

### DeleteAccountRequest
```json
{
  "password": "...",
  "totp_code": "123456",            // optional — required if 2FA enabled
  "confirm_phrase": "DELETE MY ACCOUNT"
}
```

### DeleteAccountResponse
```json
{
  "message": "Account scheduled for deletion",
  "deletion_date": "2026-05-18T...",
  "grace_period_days": 30
}
```

### FullSettingsResponse
```json
{
  "appearance": { "theme": "dark", "accent_color": "blue", "compact_mode": false },
  "notifications": { ... },
  "privacy": { ... },
  "security": {
    "two_fa_enabled": false,
    "active_sessions_count": 0,
    "login_notifications_enabled": true
  },
  "subscription": { "tier": "free", "joined_at": "..." }
}
```

### TwoFactorLoginRequest (Auth)
```json
{
  "pre_auth_token": "jwt...",
  "totp_code": "123456",    // one of totp_code / backup_code required
  "backup_code": null
}
```

---

## Security Details

### TOTP (RFC 6238)
- Library: `pyotp`
- Secret: 32-char Base32 random, encrypted at rest with AES-256-GCM (`app/utils/encryption.py`)
- Verification window: ±1 period (30 s drift tolerance)
- Brute-force protection: 5 failed attempts → 15-minute lockout (Redis counter `2fa_attempts:{user_id}`)

### Backup Codes
- 8 codes generated on setup, each 12 uppercase alphanumeric chars
- Stored as bcrypt hashes (rounds=10)
- Each code is consumed on successful use (hash removed from JSON array)
- Plaintext returned **only once** during setup

### Pre-Auth Token (2FA Login)
- JWT with `type: "pre_auth"`, 5-minute TTL
- Issued when `POST /auth/login` detects 2FA is enabled
- Exchanged for full access + refresh tokens via `POST /auth/2fa/verify`

### Account Deletion
- Requires `confirm_phrase == "DELETE MY ACCOUNT"`, password, optional TOTP
- Rate-limited: 3 requests per 24 hours (Redis counter `deletion_attempts:{user_id}`)
- Sets `users.deleted_at = now + 30 days`, `users.is_active = false`
- `cancel-deletion` re-activates during grace period
- `deletion_worker.hard_delete_user()` performs final purge (18 tables, FK-safe order)

### Encryption
- Algorithm: AES-256-GCM (via `cryptography.hazmat.primitives.ciphers.aead.AESGCM`)
- Key: `ENCRYPTION_KEY` env var — base64url-encoded 32 bytes
- Nonce: 12 random bytes, prepended to ciphertext, base64url-encoded for storage

### Login Events
- Logged on: login success/failure, 2FA success/failure, password change, 2FA enable/disable, session revoke, account deletion request
- Indexed on `(user_id, created_at)` and `(user_id, event_type)`

### Cache Invalidation
- Privacy / appearance / notification updates invalidate `profile:own:{user_id}` and `profile:public:{user_id}` Redis keys

---

## New Exceptions

| Exception | Status | Default Message |
|-----------|--------|-----------------|
| `TwoFactorAlreadyEnabledException` | 409 | 2FA is already enabled |
| `TwoFactorNotEnabledException` | 400 | 2FA is not enabled |
| `TwoFactorBruteForceException` | 429 | Too many failed attempts. Try again in 15 minutes. |
| `InvalidTOTPCodeException` | 401 | Invalid TOTP code |
| `InvalidBackupCodeException` | 401 | Invalid backup code |
| `PreAuthTokenExpiredException` | 401 | Pre-auth token expired or invalid |
| `AccountAlreadyScheduledForDeletionException` | 409 | Account is already scheduled for deletion |
| `AccountNotInGracePeriodException` | 400 | Account is not in grace period |
| `IncorrectConfirmPhraseException` | 422 | Confirm phrase must be "DELETE MY ACCOUNT" |

---

## Config Additions

```env
ENCRYPTION_KEY=<base64url-encoded 32-byte key>
```

Generate with:
```python
import base64, os
print(base64.urlsafe_b64encode(os.urandom(32)).decode())
```

---

## Tests

**File:** `tests/test_settings.py` — 22 tests, all passing.

| Class | Tests | Covers |
|-------|-------|--------|
| `TestAppearance` | 3 | Get all settings, update theme, invalid accent color → 422 |
| `TestNotifications` | 1 | Toggle notification settings |
| `TestPrivacy` | 2 | Update privacy flags, habit privacy ownership check |
| `TestTwoFactor` | 6 | Setup, confirm (valid/invalid TOTP), brute-force lockout, backup code use + reuse prevention, disable |
| `TestTwoFactorLogin` | 2 | Login returns pre-auth token, 2FA verify issues full tokens |
| `TestSessions` | 1 | Get active sessions (empty list — placeholder) |
| `TestAccountDeletion` | 7 | Wrong confirm phrase → 422, successful deletion, login blocked after deletion, cancel during grace period, login events logged on success/failure |

---

## Dependencies Added

| Package | Version | Purpose |
|---------|---------|---------|
| `pyotp` | latest | TOTP generation and verification |

`cryptography` and `bcrypt` were already installed.
