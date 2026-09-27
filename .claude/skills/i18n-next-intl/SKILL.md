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
   `Date` at their boundary — the BS conversion and numeral rewrite are both internal, and
   both are always keyed off the `locale` argument, never the raw JS value's origin):
   - `formatNPR(amount, locale)` → lakh/crore grouping, e.g. `Rs 1,25,000.00` (en) /
     `Rs १,२५,०००.००` (ne).
   - `formatDate(adYmd, locale)` → converts to **Bikram Sambat** and renders it, e.g.
     `11 Aswin 2083` (en) / `११ आश्विन २०८३` (ne). This is the only display format for a
     donation/report date anywhere in the app — screen, PDF, and Excel all call it, so
     they always agree (see `reports-export` skill).
   - `formatDateTime(date, locale)` → same, plus Kathmandu local time, e.g.
     `11 Aswin 2083, 4:00 PM` (en, 12h) / `११ आश्विन २०८३, १६:००` (ne, 24h).
   - `toNepaliDigits(value, locale)` → rewrites 0-9 to ०-९ for `ne`, no-op for `en`. The
     primitive `formatNPR`/`formatDate`/`formatDateTime` build on; also call it directly
     for any other raw number rendered in JSX or a PDF/Excel cell (serial numbers, badge
     counts, calendar day/year) — see rule 9.
   - `localizedCount(count, locale)` → for the `count` argument of an ICU
     `{count, plural, ...}` translation call specifically — see rule 9, it is NOT
     interchangeable with `toNepaliDigits` for other uses.
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
8. `bsMonthName`/`weekdayShortLabels` (`src/lib/bs-date.ts`) return locale-appropriate
   *text* (month/weekday names) with no digits in it either way — don't reach for the
   underlying library's own Nepali-digit formatting; digit conversion is `toNepaliDigits`'s
   job alone, applied once at the point a full string or JSX number is rendered.
9. **Every number in the UI renders in Devanagari for `ne`** — currency, BS day/year,
   record counts, pagination, serial numbers (owner-approved 2026-09-28, the day after the
   BS-calendar decision above). Two exceptions, because they're identifiers, not
   quantities: donor **phone numbers**, and the receipt reference code (hex, not decimal).
   The Excel report's amount column also stays a real numeric cell (Western digits) so its
   `SUM` formula and currency `numFmt` keep working.
   - For a plain number in JSX or a PDF/Excel cell (not going through `formatNPR`/
     `formatDate`/`formatDateTime`), wrap it in `toNepaliDigits(n, locale)`.
   - For the `count` in an ICU `{count, plural, ...}` call, use `localizedCount(count,
     locale)` instead of the raw number or `toNepaliDigits`. Reason: `en`'s "records"/
     "donations" messages use real `plural`/`#` syntax (needs the raw number so ICU can
     both pick the plural case and auto-format the digit); their `ne` translations are
     plain `"{count} अभिलेख"` (Nepali doesn't need plural branching), so `#`'s
     auto-formatting never applies to them — `localizedCount` passes the number through
     untouched for `en` and a pre-converted Devanagari string for `ne`. If you ever add
     `plural`/`#` to a `ne` message, stop using `localizedCount` for that key and pass the
     raw number instead, or the plural-case selection will break.
