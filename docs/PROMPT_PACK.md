# Prompt Pack — Akshaya Nidhi

> Status: steps 1–10 have been built (see git history / README). Step 11 (hardening & deploy) is next. The prompts below remain useful for adding features or redoing a step.

Copy-paste prompts, in build order. Each assumes Claude Code has read `CLAUDE.md` and the
skills in `.claude/skills/`. After each step: run `npm run typecheck && npm run lint && npm test`
and commit before moving on.

---

## 0. Ground rules (paste at the start of any new session)

```
Read CLAUDE.md and the skills in .claude/skills/. Follow the stack, role matrix and
conventions exactly. Ask before adding dependencies or deviating. Work in small steps
and tell me what you changed and how to verify it.
```

## 1. Scaffold

```
Scaffold the project in the current directory with Next.js (App Router, TypeScript strict,
Tailwind, ESLint, src/ dir). Add shadcn/ui, Zod, Drizzle ORM + drizzle-kit,
@neondatabase/serverless, jose, @node-rs/argon2, next-intl, Vitest. Create the folder
structure from CLAUDE.md, npm scripts listed there, .env.example, and src/env.ts (Zod-validated
env). Do NOT create the DB schema yet. Verify `npm run build` passes.
```

## 2. Database design review (DO THIS WITH THE OWNER — no code until approved)

```
Using the drizzle-db skill, propose the database design as a written doc (tables, columns,
types, constraints, indexes, relationships) for: users, donations, and any supporting
tables. For each open question in CLAUDE.md → Database, give options with trade-offs and a
recommendation. Do not write schema code until I approve.
```

## 3. Schema, migration, seed

```
Implement the approved schema in src/db/schema.ts, generate the migration, and write
scripts/seed-super-admin.ts (idempotent, env-driven, argon2id). Add query-level tests against a
real Postgres. Show me the generated SQL before applying.
```

## 4. Auth & RBAC

```
Using the rbac-auth skill: implement password hashing, session cookie, login page and
action (generic errors, rate limit), logout, middleware, permissions.ts with the exact role
matrix, and role-based post-login redirect. Write table-driven permission tests and login
tests.
```

## 5. i18n & layout shell

```
Using i18n-next-intl and ui-conventions skills: set up next-intl (cookie locale, en/ne),
the language switcher, format helpers (formatNPR, formatDate in Asia/Kathmandu, AD only),
the authenticated app shell with role-filtered nav, and a script/test that fails when
en.json and ne.json keys differ.
```

## 6. Add donation

```
Implement /donations/new for all roles: Zod schema, server action (auth → permission →
validate → insert), mobile-friendly form, success toast, double-submit protection, translated
validation errors. Include tests.
```

## 7. Transactions page + edit

```
Implement /donations (super_admin, admin): server-side pagination, search by
name/phone, date filter, newest first. Implement edit at /donations/[id]/edit for
super_admin only (admin sees view only). Enforce on the server; add tests for each role.
```

## 8. Users

```
Implement /users: list for admin and super_admin (view only for admin); super_admin can
create users, edit name/role, activate/deactivate, and reset password. Prevent removing or
demoting the last active super_admin. Never expose password hashes. Tests included.
```

## 9. Dashboard

```
Using reports-export skill: implement /dashboard (super_admin, admin) with total today,
overall total, top 10 donors today, top 10 donors overall (name, phone, address, amount).
SQL aggregation, Kathmandu "today", empty states, and tests including the day-boundary edge.
```

## 10. Reports & exports

```
Implement /reports: select single date or range, on-screen table + total, and PDF/Excel
download buttons (super_admin, admin). Use the shared getReport query, Noto Sans Devanagari
in the PDF, ExcelJS with numeric cells and a SUM row. Tests: totals match across screen/PDF/Excel.
```

## 11. Hardening & deploy

```
Review the whole app against CLAUDE.md: permission checks on every action/route, no
password_hash leakage, env validation, rate limiting, security headers, error pages.
Then prepare Vercel deployment: Neon integration env vars, running migrations and the seed
safely, and a step-by-step deploy checklist for me.
```

---

## Reusable prompts

**Add a feature**
```
Add <feature>. Follow CLAUDE.md conventions: server-side permission check, Zod validation,
translations in both en.json and ne.json, tests. Tell me which files changed.
```

**Review**
```
Review the current changes against CLAUDE.md: role matrix, money handling (no floats),
Kathmandu time zone, i18n keys in both locales, no raw SQL outside src/db/queries, no
secrets. List problems by severity.
```

**Debug**
```
<paste error>. Find the root cause before changing code; explain it, then propose the
minimal fix.
```

## Future (not now)

**Receipt upload** — private R2/Vercel Blob bucket, signed URLs, direct browser upload,
`donation_receipts` table, JPG/PNG/PDF ≤ 5 MB, viewable by super_admin and admin only.
