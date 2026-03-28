# Ascendlyx — Frontend

Angular 20 application for the Ascendlyx habit-tracking and peak-performance platform.

---

## What's been implemented

### Authentication (fully wired to backend API)

| Feature | Route | Status |
|---|---|---|
| Login | `/login` | ✅ |
| Signup (2-step OTP) | `/signup` | ✅ |
| Forgot Password (2-step OTP) | `/forgot-password` | ✅ |
| Token refresh (silent, on 401) | HTTP interceptor | ✅ |
| Logout (server + local clear) | sidebar | ✅ |

**API base URL:** `http://localhost:3000/api/v1`

#### Login (`POST /auth/login`)
- Submits `{ email, password }` to the backend
- Stores `access_token` + `refresh_token` in `localStorage`
- Decodes JWT payload to populate `currentUser`
- Shows inline error on bad credentials
- Shows password-reset success banner when redirected from forgot-password

#### Signup — 2-step OTP (`POST /auth/signup` → `POST /auth/signup/verify`)
- **Step 1:** Collects `first_name`, `last_name`, `email`, `password`, `confirmPassword` → calls `/auth/signup`
- **Step 2:** On success, transitions to OTP screen; user enters 6-digit code → calls `/auth/signup/verify`
- On verification success: tokens stored, navigates to `/dashboard`
- Handles `429 Too Many Requests` OTP rate-limit

#### Forgot Password — 2-step OTP (`POST /auth/forgot-password` → `POST /auth/reset-password`)
- **Step 1:** Collects email → calls `/auth/forgot-password` (always returns same message to prevent enumeration)
- **Step 2:** Collects OTP + new password + confirm → calls `/auth/reset-password`
- On success: navigates to `/login?reset=success` which shows a success banner

#### HTTP Interceptor (`authInterceptor`)
- Attaches `Authorization: Bearer <access_token>` to every outgoing request
- On `401` (excluding `/auth/refresh` itself): silently calls `POST /auth/refresh` and retries the original request
- If refresh fails: clears local session and redirects to `/login`

#### Route guards
- `authGuard` — protects all app routes; redirects unauthenticated users to `/login`
- `guestGuard` — protects auth pages; redirects authenticated users to `/dashboard`

---

## Development server

```bash
ng serve
```

Navigate to `http://localhost:4200/`. The app auto-reloads on file changes.

## Build

```bash
ng build
```

Artifacts are placed in `dist/`. Production builds are optimised.

## Tests

```bash
ng test
```

## Environment configuration

| Key | Dev | Prod |
|---|---|---|
| `apiBaseUrl` | `http://localhost:3000/api/v1` | `https://api.ascendlyx.com/api/v1` |

---

## Project structure (key paths)

```
src/app/
  core/
    guards/         auth.guard.ts, guest.guard.ts
    interceptors/   auth.interceptor.ts
    services/       auth.service.ts
  features/
    auth/
      login/          login.page.ts / .html / .scss
      signup/         signup.page.ts / .html / .scss  (2-step OTP)
      forgot-password/ forgot-password.page.ts / .html / .scss  (2-step OTP)
  layout/
    main-layout/    sidebar + navbar shell
```

