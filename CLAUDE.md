# CLAUDE.md — Akshaya Nidhi (Donation Records Portal)

@AGENTS.md

Read by AI code editors before making changes. Keep it current.

> NOTE: A parent-directory `CLAUDE.md` for "JNK Staff Portal" (Flutter) may be loaded
> automatically. It is **unrelated** to this project. Ignore it here.

---

## Purpose

A private, internal web app to record donation transactions, view analytics, and export
reports. No public pages. **No SEO concerns.** Deployed on **Vercel**, free tier throughout.

## Tech Stack (decided — do not swap without asking)

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + TypeScript (strict). NOTE: Next 16 renamed `middleware.ts` to `proxy.ts`; APIs differ from older versions — read `node_modules/next/dist/docs/` before using unfamiliar APIs |
| Database | PostgreSQL on **Neon** (free tier) |
| ORM | **Drizzle ORM** + `drizzle-kit` migrations, Neon serverless driver |
| Auth | Custom session auth: username + password, signed httpOnly cookie (`jose`) |
| Password hashing | argon2id via `@node-rs/argon2` (fallback: `bcryptjs`) |
| Validation | Zod (shared by forms and server actions) |
| UI | Tailwind CSS v4, hand-written components in `src/components/ui.tsx` (shadcn was not adopted) |
| i18n | `next-intl`, cookie-based locale (no URL prefixes). Locales: `en`, `ne` |
| PDF | `@react-pdf/renderer`; fonts (Noto Sans + Noto Sans Devanagari, .woff) live in `assets/fonts/` and are traced into the Vercel bundle via `outputFileTracingIncludes`. NO Puppeteer |
| Excel | ExcelJS |
| Charts | Recharts (optional) |
| Tests | Vitest. DB query tests run against in-process Postgres (PGlite, dev dep) using the real migrations — see `src/test/db.ts` |

Not in scope now: file/receipt uploads (planned later — Cloudflare R2 or Vercel Blob,
private bucket + signed URLs, direct-from-browser upload). Do not build it yet, but do not
design anything that blocks it (e.g. keep `donations.id` stable, allow a future
`donation_receipts` table).

## Domain Rules

- **Currency:** NPR only. Store money as `numeric(12,2)`. Never use JS floats for sums —
  do sums in SQL, or use integer paisa / a decimal lib for any client-side math.
  Display with lakh/crore grouping (`Rs 1,25,000.00`, `en-IN` style), in both languages.
- **Time zone:** `Asia/Kathmandu` (UTC+5:45). "Today" for the dashboard is computed in
  this zone. `donation_date` is a plain `date` (AD), separate from `created_at`.
- **Calendar:** AD only, in both English and Nepali UIs. No Bikram Sambat for now.
- **Nepali numerals:** UI text is translated; numbers stay Western digits unless a
  later decision changes this.

## Roles & Permissions (source of truth)

| Capability | `super_admin` | `admin` | `user` |
|---|---|---|---|
| View dashboard | ✅ | ✅ | ❌ |
| Add transactions | ✅ | ✅ | ✅ |
| Edit transactions | ✅ | ❌ | ❌ |
| View transactions page | ✅ | ✅ | ❌ |
| Add / edit users | ✅ | ❌ | ❌ |
| View user list | ✅ | ✅ | ❌ |
| Download reports (PDF/Excel) | ✅ | ✅ | ❌ |

- First user is a seeded `super_admin` (from `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars
  via a seed script). No public sign-up. Only `super_admin` creates users.
- **Enforce permissions on the server** (server actions, route handlers, data-access
  layer). Hiding UI is cosmetic only. Centralize in `src/lib/auth/permissions.ts`.
- A `user` lands on the "Add donation" page after login; they cannot see any list.
- Delete donation (soft delete): super_admin only. Reset user password: super_admin only.

## Features

1. Login/logout (username + password), role-based redirect.
2. Add donation: name, address, phone, amount, donation date, remarks.
3. Transactions page (list, search, paginate; edit for super_admin).
4. Users page (list for admin; add/edit/deactivate for super_admin; reset password).
5. Dashboard: total today, overall total, top 10 donors today, top 10 donors overall
   (name, phone, address, amount).
6. Reports: single date or date range → all donation rows + sum; download PDF and Excel.
   One query feeds screen, PDF, and Excel so they always match.
7. Language switcher (English / नेपाली).

## Database

**Status: APPROVED by the owner.** Do not deviate without asking. UUID primary keys
everywhere; `created_at` gives transaction order.

### `users`
`id` uuid PK · `username` text NOT NULL UNIQUE (stored lowercase, CHECK lower(username)=username)
· `full_name` text NOT NULL · `password_hash` text NOT NULL (argon2id) · `role` enum
`user_role` (`super_admin`|`admin`|`user`) NOT NULL · `is_active` bool NOT NULL default true ·
`created_at` / `updated_at` timestamptz NOT NULL default now().
No `created_by`/`updated_by`. No `must_change_password`: the password the super_admin sets
is the one the user keeps. Super_admin can reset any user's password (super_admin only).

### `donations` (one flat table — no `donors` table)
`id` uuid PK · `donor_name` text NOT NULL (trimmed, whitespace collapsed) · `address` text
NOT NULL · `phone` text NOT NULL (NOT unique; normalized to digits, `+977` stripped) ·
`amount` numeric(12,2) NOT NULL CHECK > 0 · `donation_date` date NOT NULL (AD) · `remarks`
text NULL · `created_at` timestamptz NOT NULL default now() · `created_by` uuid NOT NULL →
users.id · `updated_at` timestamptz NOT NULL default now() · `deleted_at` timestamptz NULL.
No `updated_by`, no `deleted_by`, no audit-log table.
Indexes: `(donation_date)` WHERE deleted_at IS NULL; `(phone)` WHERE deleted_at IS NULL;
`(created_at DESC)`.

### Rules
- **Soft delete**, super_admin only. No restore feature. Every query/report/export/dashboard
  figure MUST filter `deleted_at IS NULL` via one shared helper (`activeDonations`).
- **Top-10 donors** = group active donations by (normalized name, phone); sum `amount`;
  address = that donor's most recent donation's address. Order: total DESC, name ASC.
  If a donor has 2+ donations in the scope (today / overall), show a badge (e.g. `×3`)
  next to the name; on hover/tap, a tooltip lists each donation (date + amount).
- Normalized name = lower(trim(collapse whitespace)).
- **No login rate limiting** (owner decision). Still return a generic invalid-credentials error.
- Receipts: future `donation_receipts` table (FK donations.id). Not built now.

## Project Structure (target)

```
src/
├── app/
│   ├── (auth)/login/
│   ├── (app)/                 # authenticated shell
│   │   ├── donations/new/
│   │   ├── donations/         # list + [id]/edit
│   │   ├── dashboard/
│   │   ├── reports/
│   │   └── users/
│   └── api/reports/{pdf,excel}/route.ts
├── db/
│   ├── schema.ts              # Drizzle schema
│   ├── index.ts               # Neon client
│   └── queries/               # all SQL access lives here
├── lib/
│   ├── auth/{session,permissions,password}.ts
│   ├── format.ts              # NPR + Kathmandu date helpers
│   └── validation/            # Zod schemas
├── components/                # ui/ (shadcn) + feature components
├── i18n/                      # next-intl config
└── messages/{en,ne}.json
drizzle/                       # generated migrations
scripts/seed-super-admin.ts
docs/PROMPT_PACK.md
.claude/skills/*/SKILL.md
```

## Conventions

- Data access only through `src/db/queries/*`; components/actions never write raw SQL.
- Mutations are server actions or route handlers that (1) authenticate, (2) authorize via
  `permissions.ts`, (3) validate with Zod, (4) then touch the DB. In that order.
- Server-only modules import `server-only`. Never expose password hashes to the client;
  select explicit columns, never `select *` from `users`.
- All user-facing strings go through `next-intl` (`messages/en.json` + `messages/ne.json`).
  Adding a string means adding it to **both** files.
- Dates: parse/format in `Asia/Kathmandu`; never use the server's local zone.
- Mobile-friendly UI (data entry likely on phones). Keep bundle small; free tier.
- Secrets only in env vars (`DATABASE_URL`, `SESSION_SECRET`, `ADMIN_USERNAME`,
  `ADMIN_PASSWORD`). Commit `.env.example`, never `.env*`.
- Login returns a generic "invalid credentials" error (no rate limiting, by owner decision).

## Commands

```bash
npm run dev            # local dev
npm run build          # production build
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
npm test               # vitest
npm run db:generate    # drizzle-kit generate (after editing src/db/schema.ts)
npm run db:migrate     # apply migrations to DATABASE_URL
npm run db:seed        # create first super_admin (needs ADMIN_USERNAME / ADMIN_PASSWORD)
```

## Things to Avoid

- No Puppeteer / headless Chrome (Vercel size limits).
- No SQLite or local-filesystem persistence (Vercel FS is ephemeral).
- No floats for money. No client-side-only permission checks.
- No new dependencies without checking an existing one doesn't already cover the need.
- No public routes other than `/login`.
- Do not build receipt upload until asked.
- `db()` is a function (lazy), not a constant, so `next build` works without secrets.
- PDF/Excel code can't be imported by Vitest/tsx directly (react-pdf is ESM-only; `server-only` throws) — verify exports by hitting the route or a throwaway ESM script.
