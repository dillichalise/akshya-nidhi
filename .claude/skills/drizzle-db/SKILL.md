---
name: drizzle-db
description: Design or change the PostgreSQL schema, migrations, seed scripts and SQL queries (Drizzle ORM on Neon) for Akshaya Nidhi. Use for any database, schema, migration, or aggregation-query work.
---

# Drizzle + Neon

## Process
- Schema changes require owner approval of the design first (see CLAUDE.md → Database).
- Edit `src/db/schema.ts`, run `npm run db:generate`, review the generated SQL in
  `drizzle/`, then `npm run db:migrate`. Never hand-edit applied migrations.
- Neon free tier: use the serverless/HTTP driver (`@neondatabase/serverless`) and the
  pooled connection string. Keep queries few and indexed; storage is ~0.5 GB.

## Types
- Money: `numeric(12,2)` (Drizzle returns string — keep as string or use a decimal lib;
  never `parseFloat` for arithmetic). Amount CHECK `> 0`.
- Donation date: `date` (AD). Timestamps: `timestamptz`.
- IDs: `uuid` default `gen_random_uuid()` (or identity bigint — decided in design review).
- Role: Postgres enum `user_role` (`super_admin`,`admin`,`user`).

## Query rules
- All SQL lives in `src/db/queries/*`; export typed functions, not raw builders.
- Aggregations happen in SQL (`SUM`, `GROUP BY`, `ORDER BY ... LIMIT 10`), never by
  fetching all rows and summing in JS.
- "Today" = current date in `Asia/Kathmandu`:
  `(now() AT TIME ZONE 'Asia/Kathmandu')::date`.
- Date-range reports are inclusive: `donation_date BETWEEN $from AND $to`.
  A single date is `from = to`.
- Top-10 donors: group by the donor identity chosen in design review; return
  name, phone, address, total; tie-break deterministically (total DESC, name ASC).
- Paginate list queries (keyset or limit/offset) — never unbounded.
- Add indexes for: `donation_date`, and whatever the donor-grouping key is.
- Never select `password_hash` except in the auth lookup query.

## Tests
Use a real Postgres (Neon branch or local container) for query tests, not mocks:
verify sums, inclusive ranges, Kathmandu day-boundary (e.g. 23:30 NPT vs UTC), and top-10 ordering.
