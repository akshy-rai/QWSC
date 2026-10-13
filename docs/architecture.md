# QWSC Architecture & System Overview

## Overview

Qatar Wakra Sports Club (QWSC) Badminton League application is a unified Next.js 16 full-stack application built using the App Router, React 19, TypeScript, and Prisma ORM with PostgreSQL.

---

## Architecture Principles

1. **Colocated Monolith**: All pages, UI components, API route handlers, and server-only domain services reside within the single application tree under `src/`.
2. **Server-Only Isolation**: All database operations and sensitive security logic reside in `src/server/` guarded by `import 'server-only'`. Client bundles cannot accidentally bundle backend code.
3. **Feature-Oriented Server Modules**: Domain logic is structured into bounded feature modules:
   - `src/server/auth`: Authentication, sessions, cryptographic tokens, password hashing, and OAuth.
   - `src/server/admin`: Member approval, moderation, and audit logs.
   - `src/server/members`: Player profiles, division ratings, and member directories.
   - `src/server/bookings`: Court reservations and availability management.
   - `src/server/tournaments`: League competitions, tournament brackets, and scoring.
   - `src/server/scheduling`: Friday session lineups, court allocations, and schedule publishing.
   - `src/server/payments`: Subscription records and payment auditing.
4. **Zero-Configuration Client Communication**: Client fetch calls use same-origin relative URLs (`/api/v1/...`), eliminating cross-origin CORS latency, credentials issues, and port synchronization bugs.

---

## Authentication Lifecycle

```
[Client Browser]
       │
       ▼ (1) POST /api/v1/auth/login or /google
[Route Handler]
       │
       ▼ (2) Verify credentials / Google ID Token
[src/server/auth]
       │
       ▼ (3) Issue signed JWT access token (15m) + SHA-256 hashed refresh token (7d)
[Database (PostgreSQL)]
       │
       ▼ (4) Set HTTP-only, Secure, SameSite=Lax cookies
[Client Browser] (Authenticated session active)
```

---

## Environment Configuration

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/qwsc` |
| `JWT_SECRET` | Secret key for signing JOSE JWTs | `min_32_characters_random_string` |
| `COOKIE_SECRET` | Secret key for signing session cookies | `min_32_characters_random_string` |
| `GOOGLE_CLIENT_ID` | OAuth Client ID for token verification | `123456...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret | `GOCSPX-...` |
| `GOOGLE_CLIENT_ID` | Public OAuth Client ID for frontend button | `123456...apps.googleusercontent.com` |
