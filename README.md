# Akshaya Nidhi — Donation Records Portal

A private, internal web app to record donation transactions, view analytics, and export
reports. No public-facing pages, no SEO concerns. Deployed on Vercel (free tier).

**Stack:** Next.js 16 (App Router) · TypeScript · Drizzle ORM · Neon Postgres ·
Tailwind CSS v4 · next-intl (English / नेपाली)

---

## Features

- Login/logout with role-based redirect (username + password, no public sign-up)
- Add donations: donor name, address, phone, amount, date, remarks
- Transactions list with search, pagination, and edit (super_admin only)
- Dashboard: total today, overall total, top 10 donors today and overall
- Reports: single date or date range → all rows + sum; download as **PDF** or **Excel**
- User management: add, edit, deactivate users; reset passwords (super_admin only)
- Language switcher — English / नेपाली
- Bikram Sambat calendar in the UI (all dates shown and entered as BS; stored as AD)
- Nepali digits (०–९) for all numeric values in the Nepali locale

---

## Roles

| Capability | `super_admin` | `admin` | `user` |
|---|---|---|---|
| Dashboard, transactions list, reports, user list | ✅ | ✅ | ❌ |
| Add donation | ✅ | ✅ | ✅ |
| Edit / soft-delete donation | ✅ | ❌ | ❌ |
| Add / edit / deactivate users, reset passwords | ✅ | ❌ | ❌ |

`user` role lands on the Add Donation page after login and cannot access any list or report.
Permissions are enforced server-side — UI hiding is cosmetic only.

---

## Local Setup

```bash
npm install
cp .env.example .env.local        # fill in DATABASE_URL, SESSION_SECRET, ADMIN_*
# drizzle-kit / seed scripts read .env — copy it too:
cp .env.local .env
npm run db:migrate                 # apply drizzle/*.sql to your database
npm run db:seed                    # creates the first super_admin (idempotent)
npm run dev
```

Generate a session secret with:

```bash
openssl rand -base64 48
```

### Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon pooled connection string |
| `SESSION_SECRET` | 32+ char secret for signing the session cookie |
| `ADMIN_USERNAME` | Username for the seeded super_admin |
| `ADMIN_PASSWORD` | Password for the seeded super_admin |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/           # login page (only public route)
│   ├── (app)/                  # authenticated shell
│   │   ├── dashboard/
│   │   ├── donations/          # list + new + [id]/edit
│   │   ├── reports/
│   │   └── users/              # list + new + [id]/edit
│   └── api/
│       ├── reports/{pdf,excel}/
│       └── donations/[id]/
├── db/
│   ├── schema.ts               # Drizzle schema (users + donations tables)
│   ├── connect.ts / index.ts   # lazy Neon client
│   └── queries/                # all DB access (donations, users, reports)
├── lib/
│   ├── auth/                   # session, permissions, password hashing
│   ├── format.ts               # NPR currency, BS date formatting, Nepali digits
│   ├── bs-date.ts              # AD ↔ BS conversion (nepali-date-converter wrapper)
│   ├── pdf/                    # @react-pdf/renderer report builder
│   ├── reports/                # report query + ExcelJS builder
│   └── validation/             # Zod schemas shared by forms and server actions
├── components/                 # hand-written UI components (no shadcn)
├── i18n/                       # next-intl config
└── messages/en.json + ne.json  # all user-facing strings
drizzle/                        # generated migration SQL files
scripts/                        # migrate.ts, seed-super-admin.ts, sample-donations.ts
assets/fonts/                   # Noto Sans + Noto Sans Devanagari (.woff, for PDF)
```

---

## Database

Two tables — `users` and `donations` (flat, no separate donors table).

- **`users`**: UUID PK, `username` (lowercase unique), `full_name`, `password_hash`
  (argon2id), `role` enum (`super_admin` | `admin` | `user`), `is_active`, timestamps.
- **`donations`**: UUID PK, `donor_name`, `address`, `phone` (normalized digits),
  `amount` (numeric 12,2, NPR), `donation_date` (AD date), `remarks`, `created_by` → users,
  soft-delete via `deleted_at`, timestamps.

Soft deletes are used throughout — every query filters `deleted_at IS NULL` via a shared
`activeDonations` helper. Money is never stored or summed as a JS float; all sums happen in
SQL.

---

## Scripts

```bash
npm run dev            # local dev server
npm run build          # production build
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
npm test               # vitest (includes DB query tests via PGlite)
npm run db:generate    # drizzle-kit generate (after editing src/db/schema.ts)
npm run db:migrate     # apply migrations to DATABASE_URL
npm run db:seed        # create first super_admin (needs ADMIN_USERNAME / ADMIN_PASSWORD)
npm run db:sample      # seed sample donation data
```

---

## Deploy to Vercel

1. Create a **Neon** project (free tier) — via Vercel → Storage → Neon, or at neon.tech.
   Use the **pooled** connection string as `DATABASE_URL`.
2. Push this repo to GitHub and import it in Vercel.
3. Set env vars in Vercel: `DATABASE_URL`, `SESSION_SECRET` (32+ chars).
4. Run migrations and seed **once from your machine** against the production database:
   ```bash
   DATABASE_URL="<prod url>" npm run db:migrate
   DATABASE_URL="<prod url>" ADMIN_USERNAME=... ADMIN_PASSWORD=... npm run db:seed
   ```
5. Deploy, sign in as the super admin, and create other users from **Users → Add user**.

---

## Key Design Decisions

- **Calendar:** Storage and all business logic use AD (Gregorian) dates. The UI converts
  to/from Bikram Sambat at the boundary via `formatDate`/`formatDateTime` in
  `src/lib/format.ts`. Filenames stay AD.
- **Nepali digits:** In the `ne` locale, all numeric values render in Devanagari (०–९) via
  `toNepaliDigits` in `format.ts`. Exceptions: phone numbers, receipt hex codes, Excel
  amount cells (which need native numbers for SUM formulas).
- **Reports consistency:** One SQL query feeds the on-screen table, PDF, and Excel export
  so they always match.
- **No component library:** UI is hand-written in `src/components/ui.tsx` to keep the
  bundle small on the free tier.
- **Proxy (middleware):** Next.js 16 uses `proxy.ts` instead of `middleware.ts` for session
  gating and locale cookie handling.

---

## Not Yet Built

Receipt/file uploads are planned (Cloudflare R2 or Vercel Blob). The schema leaves room for
a future `donation_receipts` table — `donations.id` is kept stable for this reason.
