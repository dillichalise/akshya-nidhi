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
4. Formatting helpers in `src/lib/format.ts` (all take/return a plain AD `"YYYY-MM-DD"` or
   `Date` at their boundary — the BS conversion is internal):
   - `formatNPR(amount)` → lakh/crore grouping (`Rs 1,25,000.00`), same in both locales.
   - `formatDate(adYmd, locale)` → converts to **Bikram Sambat** and renders it, e.g.
     `11 Aswin 2083` (`ne`: Devanagari month name, Western digits). This is the only
     display format for a donation/report date anywhere in the app — screen, PDF, and
     Excel all call it, so they always agree (see `reports-export` skill).
   - `formatDateTime(date, locale)` → same, plus Kathmandu local time, e.g.
     `11 Aswin 2083, 4:00 PM`.
   - Numerals stay Western digits (`numberingSystem: 'latn'`) unless the owner decides otherwise.
5. Storage, validation, and every domain calculation stay AD-only — never store or compute
   in Bikram Sambat; `donationSchema`, `dateRangeSchema`, `donation_date <= today`, and all
   report SQL work in AD. **The UI is BS end to end** — both entry (`BsDatePicker` in
   `src/components/bs-date-picker.tsx`) and display (`formatDate`/`formatDateTime` above)
   convert at the boundary, via the shared helpers in `src/lib/bs-date.ts`
   (`nepali-date-converter` does the math). Don't add a second, different BS picker,
   formatter, or conversion library — extend the existing ones.
6. Nepali copy: keep it short and plain; flag machine-uncertain translations with a
   `// TODO(review-ne)` note in the PR description so the owner can proofread.
7. PDF exports must use a Devanagari-capable font (Noto Sans Devanagari) — see
   `reports-export` skill.
8. BS picker numerals follow the same rule as everything else: day/year digits stay
   Western; only BS month and weekday names are Devanagari in the `ne` locale
   (`bsMonthName`, `weekdayShortLabels` in `src/lib/bs-date.ts` — don't use the
   underlying library's own Nepali-digit formatting for those).
