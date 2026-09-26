# Akshaya Nidhi — Donation Records

Private web app to record donations, view analytics, and export reports (PDF/Excel).
Next.js 16 · Drizzle ORM · Neon Postgres · next-intl (English/नेपाली). See `CLAUDE.md` for rules.

## Local setup

```bash
npm install
cp .env.example .env.local        # fill in DATABASE_URL, SESSION_SECRET, ADMIN_*
# drizzle-kit / seed scripts read .env — copy it too:  cp .env.local .env
npm run db:migrate                # apply drizzle/*.sql to your database
npm run db:seed                   # creates the first super_admin (idempotent)
npm run dev
```

Generate a session secret with `openssl rand -base64 48`.

## Roles

| | super_admin | admin | user |
|---|---|---|---|
| Dashboard, transactions list, reports (PDF/Excel), user list (view) | ✅ | ✅ | ❌ |
| Add donation | ✅ | ✅ | ✅ |
| Edit / delete (soft) donation, add/edit users, reset passwords | ✅ | ❌ | ❌ |

## Deploy to Vercel

1. Create a **Neon** project (free tier) — via Vercel → Storage → Neon, or at neon.tech.
   Use the **pooled** connection string as `DATABASE_URL`.
2. Push this repo to GitHub and import it in Vercel.
3. Set env vars in Vercel: `DATABASE_URL`, `SESSION_SECRET` (32+ chars).
4. Run migrations + seed **once from your machine** against the production database:
   ```bash
   DATABASE_URL="<prod url>" npm run db:migrate
   DATABASE_URL="<prod url>" ADMIN_USERNAME=... ADMIN_PASSWORD=... npm run db:seed
   ```
5. Deploy, sign in as the super admin, and create other users from **Users → Add user**.

## Scripts

`npm run dev | build | lint | typecheck | test | db:generate | db:migrate | db:seed`
