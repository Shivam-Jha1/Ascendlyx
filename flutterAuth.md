# Flutter Auth Reference — Ascendlyx

Reference document for implementing **Login**, **Sign Up**, and **Forgot Password** screens in the Ascendlyx Flutter mobile app. All information is derived directly from the Angular web frontend.

---

## Base URL

| Environment | Base URL |
|-------------|----------|
| Development | `http://localhost:3000/api/v1` |
| Production  | Replace with production domain |

All auth endpoints are prefixed with `/auth`.

---

## API Endpoints

### 1. Login

| Property | Value |
|----------|-------|
| Method   | `POST` |
| Endpoint | `/auth/login` |
| Auth     | None (public) |

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "secretpassword"
}
```

**Success response `200`:**
```json
{
  "access_token": "<jwt>",
  "refresh_token": "<jwt>",
  "token_type": "bearer"
}
```

**Error response fields checked (in order):**
- `error.detail`
- `error.message`
- Fallback: `"Invalid email or password."`

---

### 2. Sign Up — Step 1: Request OTP

| Property | Value |
|----------|-------|
| Method   | `POST` |
| Endpoint | `/auth/signup` |
| Auth     | None (public) |

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "secretpassword",
  "first_name": "Jane",
  "last_name": "Doe"
}
```

**Success response `200`:**
```json
{
  "message": "Verification code sent to your email."
}
```

**Error response fields checked (in order):**
- `error.detail`
- `error.message`
- Fallback: `"Signup failed. Please try again."`

---

### 3. Sign Up — Step 2: Verify OTP

| Property | Value |
|----------|-------|
| Method   | `POST` |
| Endpoint | `/auth/signup/verify` |
| Auth     | None (public) |

**Request body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Success response `200`:**
```json
{
  "access_token": "<jwt>",
  "refresh_token": "<jwt>",
  "token_type": "bearer"
}
```

Tokens are stored immediately on success and the user is navigated to the dashboard.

**Error response fields checked (in order):**
- HTTP `429` → `"Too many attempts. Please wait before trying again."`
- `error.detail`
- `error.message`
- Fallback: `"Invalid or expired verification code."`

---

### 4. Forgot Password — Step 1: Request OTP

| Property | Value |
|----------|-------|
| Method   | `POST` |
| Endpoint | `/auth/forgot-password` |
| Auth     | None (public) |

**Request body:**
```json
{
  "email": "user@example.com"
}
```

**Success response `200`:**
```json
{
  "message": "Reset code sent to your email."
}
```

**Error response fields checked (in order):**
- HTTP `429` → `"Too many attempts. Please wait before trying again."`
- `error.detail`
- `error.message`
- Fallback: `"Something went wrong. Please try again."`

---

### 5. Forgot Password — Step 2: Reset Password

| Property | Value |
|----------|-------|
| Method   | `POST` |
| Endpoint | `/auth/reset-password` |
| Auth     | None (public) |

**Request body:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "new_password": "newsecretpassword"
}
```

**Success response `200`:**
```json
{
  "message": "Password reset successfully."
}
```

On success, navigate to the Login screen and show a success banner: `"Password reset successfully. Please sign in with your new password."`

**Error response fields checked (in order):**
- HTTP `429` → `"Too many attempts. Please wait before trying again."`
- `error.detail`
- `error.message`
- Fallback: `"Invalid or expired code. Please try again."`

---

### 6. Refresh Access Token

| Property | Value |
|----------|-------|
| Method   | `POST` |
| Endpoint | `/auth/refresh` |
| Auth     | None (uses refresh token in body) |

**Request body:**
```json
{
  "refresh_token": "<refresh_jwt>"
}
```

**Success response `200`:**
```json
{
  "access_token": "<new_jwt>",
  "refresh_token": "<new_jwt>",
  "token_type": "bearer"
}
```

Called automatically when a `401` is received on any authenticated request. If this also fails, clear the session and redirect to Login.

---

### 7. Logout

| Property | Value |
|----------|-------|
| Method   | `POST` |
| Endpoint | `/auth/logout` |
| Auth     | Bearer token (best-effort) |

**Request body:**
```json
{
  "refresh_token": "<refresh_jwt>"
}
```

**Success response `200`:**
```json
{
  "message": "Logged out successfully."
}
```

Clear local tokens immediately before making this request. The server call is best-effort — network failures should be silently ignored.

---

## Token Storage

Store tokens using `flutter_secure_storage` (recommended) or `shared_preferences`.

| Key | Value |
|-----|-------|
| `access_token` | JWT access token string |
| `refresh_token` | JWT refresh token string |
| `currentUser` | JSON-encoded user object (see below) |

**`currentUser` JSON shape** (decoded from JWT payload after login/signup):
```json
{
  "user_id": "uuid-string",
  "name": "Jane Doe",
  "email": "user@example.com",
  "handle": "@janedoe"
}
```

**JWT payload fields read** (in priority order for each property):
- `user_id`: `payload.user_id` → `payload.sub`
- `name`: `payload.name` → `payload.full_name` → `payload.first_name + last_name` → `payload.email` prefix → `"User"`
- `email`: `payload.email` → `payload.sub`
- `handle`: `payload.handle` (empty string if missing)

---

## Authenticated Requests

Attach the access token to every API request:

```
Authorization: Bearer <access_token>
```

**Token refresh flow (mirror the Angular interceptor):**
1. Make API request with `Authorization: Bearer <access_token>`
2. If response is `401`:
   a. Call `POST /auth/refresh` with `{ refresh_token }`
   b. If refresh succeeds → store new tokens → retry original request
   c. If refresh fails → clear all tokens → navigate to Login screen

---

## Screen Flows

### Login Screen

**Fields:**
- Email (text input, keyboard type: email)
- Password (text input, obscured)

**Validation (client-side, before API call):**
- Email must not be empty
- Password must not be empty

**Actions:**
- Submit → `POST /auth/login` → store tokens → navigate to Dashboard
- "Forgot password?" link → navigate to Forgot Password screen
- "Sign up" link → navigate to Sign Up screen
- Google sign-in button → show `"Google sign-in coming soon."` (not yet implemented)

**Success banner trigger:**
If navigated from Forgot Password (i.e., a `reset=success` query/route parameter is present), show a green success banner: `"Password reset successfully. Please sign in with your new password."`

**Error display:**
Single error message shown below the form. Cleared on each new submit attempt.

---

### Sign Up Screen (2-step)

#### Step 1 — Registration Form

**Fields:**
- First name
- Last name
- Email (keyboard type: email)
- Password (obscured)
- Confirm password (obscured)

**Validation (client-side):**
- All fields must be filled
- Password must be at least 8 characters
- Password and confirm password must match

**Actions:**
- Submit → `POST /auth/signup` → show success message → advance to Step 2
- "Log in" link → navigate to Login screen
- Google sign-up button → show `"Google sign-up coming soon."` (not yet implemented)

**Success message:** Display `res.message` from the API (e.g. "Verification code sent to your email.")

#### Step 2 — OTP Verification

**Fields:**
- OTP code (6-digit numeric input)

**Validation (client-side):**
- OTP must be exactly 6 digits

**Actions:**
- Submit → `POST /auth/signup/verify` → store tokens → navigate to Dashboard
- Back button → return to Step 1, clear OTP field and messages

**State carried from Step 1:** Email address (used in the verify request body)

---

### Forgot Password Screen (2-step)

#### Step 1 — Email Entry

**Fields:**
- Email (keyboard type: email)

**Validation (client-side):**
- Email must not be empty

**Actions:**
- Submit → `POST /auth/forgot-password` → show success message → advance to Step 2
- "Back to login" link → navigate to Login screen

**Success message:** Display `res.message` from the API (e.g. "Reset code sent to your email.")

#### Step 2 — OTP + New Password

**Fields:**
- OTP code (6-digit numeric input)
- New password (obscured)
- Confirm new password (obscured)

**Validation (client-side):**
- All fields must be filled
- OTP must be exactly 6 digits
- New password must be at least 8 characters
- Passwords must match

**Actions:**
- Submit → `POST /auth/reset-password` → navigate to Login screen with success banner
- Back button → return to Step 1, clear OTP and password fields and messages

**State carried from Step 1:** Email address (used in the reset request body)

---

## Validation Rules Summary

| Rule | Details |
|------|---------|
| Email | Required, non-empty |
| Password (new/signup) | Required, minimum 8 characters |
| Confirm password | Must exactly match password field |
| OTP | Required, exactly 6 digits |
| All fields | Required before API call |

---

## Error Handling Patterns

All screens follow this priority for error messages:

```
if (statusCode == 429) {
  show "Too many attempts. Please wait before trying again."
} else {
  show error.detail ?? error.message ?? <screen-specific fallback>
}
```

| Screen | Fallback message |
|--------|-----------------|
| Login | `"Invalid email or password."` |
| Signup Step 1 | `"Signup failed. Please try again."` |
| Signup Step 2 (OTP) | `"Invalid or expired verification code."` |
| Forgot Password Step 1 | `"Something went wrong. Please try again."` |
| Forgot Password Step 2 | `"Invalid or expired code. Please try again."` |

- Display one error at a time in a single error area below the form
- Clear the error on each new submit attempt
- Show a loading indicator (disable submit button) while any request is in progress

---

## Navigation Map

```
/login
  ├── [success]      → /dashboard
  ├── [link]         → /signup
  └── [link]         → /forgot-password

/signup
  ├── step: form
  │     ├── [success] → step: otp
  │     └── [link]   → /login
  └── step: otp
        ├── [success] → /dashboard
        └── [back]   → step: form

/forgot-password
  ├── step: email
  │     ├── [success] → step: reset
  │     └── [link]   → /login
  └── step: reset
        ├── [success] → /login?reset=success
        └── [back]   → step: email
```

---

## Route Guards (Flutter equivalent)

| Route | Guard behavior |
|-------|---------------|
| Login, Sign Up, Forgot Password | Redirect to Dashboard if already authenticated (`guestGuard` equivalent) |
| Dashboard and all app routes | Redirect to Login if not authenticated (`authGuard` equivalent) |

On app start, check `secure_storage` for `access_token`. If present, treat user as authenticated and skip auth screens.
