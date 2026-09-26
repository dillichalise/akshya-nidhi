---
name: reports-export
description: Build or change donation reports and their PDF/Excel downloads, plus the dashboard analytics, in Akshaya Nidhi. Use for report pages, export route handlers, and dashboard totals/top-10 tables.
---

# Reports, Export & Dashboard

## Single source of truth
One query function `getReport({ from, to })` in `src/db/queries/reports.ts` returns
`{ rows, total, count }`. The on-screen report, PDF, and Excel ALL use it, so numbers
always match. A single date = `from == to`. Range is inclusive, in `Asia/Kathmandu`.

## Report contents
All donation fields (name, address, phone, amount, date, remarks) + grand total + record
count + the selected date/range + generation timestamp + generated-by username.

## Exports
- Route handlers: `src/app/api/reports/pdf/route.ts` and `.../excel/route.ts`, GET with
  `from`/`to` query params. Each: `requireSession()` → `requirePermission('report:download')`
  → validate params with Zod → query → stream file. Roles allowed: super_admin, admin.
- PDF: `@react-pdf/renderer`, server-side. Register **Noto Sans Devanagari** (bundle the
  .ttf in the repo) so Nepali renders. Paginate long tables with repeated header row and a
  total on the last page. Landscape if columns are cramped. No Puppeteer.
- Excel: ExcelJS. Amount column is a numeric cell with format `#,##0.00`, date column is a
  real date cell, frozen header row, auto column widths, a `SUM` total row.
- File names: `donations_YYYY-MM-DD.(pdf|xlsx)` or `donations_FROM_to_TO.(pdf|xlsx)`.
- Localize headers/labels by the current locale cookie. Set `Content-Disposition:
  attachment` and correct MIME types.
- Cap the date range (e.g. 1–2 years) or row count to stay within serverless limits;
  return a friendly error above the cap.

## Dashboard (super_admin, admin)
1. Total donation today (Kathmandu date).
2. Overall total.
3. Top 10 donors today: name, phone, address, amount.
4. Top 10 donors overall: name, phone, address, amount.
Aggregate in SQL; tie-break total DESC then name ASC; show an empty state when no data.
Amounts via `formatNPR`.

## Tests
Sum equals sum of rows; PDF/Excel totals equal the on-screen total; inclusive boundaries;
empty range; Kathmandu midnight edge; permission denial for `user`.
