---
name: i18n-next-intl
description: Add or change English/Nepali translations, the language switcher, and NPR/date formatting in Akshaya Nidhi. Use whenever user-facing text, number formatting, or date formatting is touched.
---

# i18n (English + Nepali)

## Setup
- `next-intl`, cookie-based locale (`NEXT_LOCALE`), default `en`, supported `en`, `ne`.
  No `/en` / `/ne` URL prefixes (private app, no SEO).
- Messages: `src/messages/en.json`, `src/messages/ne.json`, namespaced by feature
  (`login`, `donations`, `dashboard`, `reports`, `users`, `common`, `errors`).
- Language switcher lives in the app header and on the login page; it sets the cookie via
  a server action and refreshes.

## Rules
1. No hard-coded user-facing strings in components. Use `useTranslations` /
   `getTranslations`.
2. Every new key goes into BOTH files in the same change. Add a test/script that fails if
   the key sets differ.
3. Validation errors: Zod issues map to translation keys, not English sentences.
4. Formatting helpers in `src/lib/format.ts`:
   - `formatNPR(amount)` → lakh/crore grouping (`Rs 1,25,000.00`), same in both locales.
   - `formatDate(date)` → AD, `Asia/Kathmandu`, e.g. `26 Sep 2026`; month names localized
     for `ne` via `Intl.DateTimeFormat('ne-NP', { calendar: 'gregory' })`.
   - Numerals stay Western digits (`numberingSystem: 'latn'`) unless the owner decides otherwise.
5. AD calendar only. Do not add Bikram Sambat.
6. Nepali copy: keep it short and plain; flag machine-uncertain translations with a
   `// TODO(review-ne)` note in the PR description so the owner can proofread.
7. PDF exports must use a Devanagari-capable font (Noto Sans Devanagari) — see
   `reports-export` skill.
