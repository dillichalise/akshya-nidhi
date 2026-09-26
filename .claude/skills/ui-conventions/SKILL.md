---
name: ui-conventions
description: Conventions for building pages, forms, tables and layout with Next.js App Router, Tailwind and shadcn/ui in Akshaya Nidhi. Use when creating or editing any screen or component.
---

# UI & Next.js Conventions

- Server Components by default; add `"use client"` only for interactive pieces
  (forms with local state, language switcher, charts, date pickers).
- Mutations via Server Actions with Zod validation; return typed
  `{ ok: true } | { ok: false, errors }` and show inline, translated errors.
  Use `useActionState` / `useFormStatus` for pending states. Disable submit while pending
  to prevent double donation entries.
- Forms: shadcn `Form` components. Donation form fields: name (required), address,
  phone (Nepal-friendly validation, allow +977 / 98XXXXXXXX), amount (> 0, 2 decimals,
  numeric keyboard on mobile), donation date (defaults to today in Kathmandu, no future
  dates unless owner allows), remarks (optional, max length).
- Tables: server-side pagination + search; sticky header; responsive (card layout on
  narrow screens). Amount right-aligned, tabular-nums.
- Layout: authenticated shell with nav filtered by role (super_admin: all;
  admin: dashboard, donations, reports, users(view); user: add donation only). Nav filtering is
  cosmetic; the server still enforces permissions.
- Mobile-first: min touch target 44px, readable at 360px width.
- Accessibility: labels on every input, visible focus, sufficient contrast, errors linked
  via `aria-describedby`.
- Loading/empty/error states for every data view (`loading.tsx`, `error.tsx`).
- Confirmation toast after saving a donation; clear the form after success.
- Keep bundles small: no heavy libraries on the client; dynamic-import Recharts.
- Env vars via a validated `src/env.ts` (Zod) — fail fast at boot when missing.
