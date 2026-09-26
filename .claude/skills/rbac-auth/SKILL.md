---
name: rbac-auth
description: Implement or modify login, sessions, password hashing, roles (super_admin/admin/user) and permission checks in the Akshaya Nidhi app. Use for any auth, middleware, user-management, or authorization work.
---

# RBAC & Auth

## Roles
`super_admin`, `admin`, `user`. Permission matrix lives in CLAUDE.md and is implemented
ONLY in `src/lib/auth/permissions.ts` as a map of `Permission -> Role[]`.

Permissions: `dashboard:view`, `donation:create`, `donation:edit`, `donation:list`,
`user:list`, `user:manage`, `report:download`.

## Rules
1. Every server action / route handler: `requireSession()` → `requirePermission(p)` →
   Zod-validate → DB. Never skip a step; never rely on UI hiding.
2. Session: signed JWT (`jose`, HS256, `SESSION_SECRET`) in an httpOnly, Secure,
   SameSite=Lax cookie. Payload: `userId`, `role`, expiry. Re-check the user is still
   `is_active` and re-read role from the DB on sensitive actions (role can change).
3. Passwords: argon2id via `@node-rs/argon2`. Never log, return, or select
   `password_hash` outside auth code. Enforce a minimum length (>= 8) with Zod.
4. Login: generic error message ("Invalid username or password") and constant-ish timing
   (hash-compare against a dummy hash if user not found). No rate limiting (owner decision).
5. `src/proxy.ts` (Next 16's replacement for `middleware.ts`) only does a cheap cookie check +
   redirect to `/login`; real authorization happens in the server layer (proxy alone is not enough).
6. Post-login redirect: `user` → `/donations/new`; `admin`/`super_admin` → `/dashboard`.
7. Seeding: `scripts/seed-super-admin.ts` reads `ADMIN_USERNAME`/`ADMIN_PASSWORD`,
   is idempotent, never overwrites an existing account.
8. A super_admin must not be able to deactivate or demote the last active super_admin.

## Tests to write
- Each permission × each role (table-driven).
- Login: wrong password, unknown user, inactive user → identical response.
- `user` role calling a list/dashboard/report endpoint → 403.
