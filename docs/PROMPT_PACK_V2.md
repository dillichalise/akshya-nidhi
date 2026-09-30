# Prompt Pack V2 — Akshaya Nidhi New Features

> These prompts pick up after step 10 of PROMPT_PACK.md. Each prompt is self-contained and
> assumes the agent has read `CLAUDE.md` and `.claude/skills/`. Run
> `npm run typecheck && npm run lint` after each step and commit before moving on.

---

## Ground rules (paste at the start of any new session)

```
Read CLAUDE.md and the skills in .claude/skills/. Follow the stack, role matrix and
conventions exactly. Ask before adding dependencies or deviating. Work in small steps and
tell me what you changed and how to verify it.

Key invariants:
- amount is always numeric(12,2); Drizzle returns it as a string — never parseFloat it for math.
- Dates are stored as AD YYYY-MM-DD, displayed as BS everywhere in the UI via formatDate().
- Soft-delete pattern: always include activeDonations (isNull(deletedAt)) in every donation query.
- Always call db() as a function, never store it as a module-level singleton.
- All DB query files must begin with import "server-only".
- Form pattern: useActionState with FormState — echo values back on error, set _ts on success.
- i18n: add every new key to BOTH src/messages/en.json AND src/messages/ne.json.
- RBAC: pages call requirePermission(perm), actions call authorize(perm).
```

---

## Feature A — Expenditure records

### A1. Schema: add `expenditures` table

```
Using the drizzle-db skill, add a new `expenditures` table to src/db/schema.ts with
these columns:
  - id: UUID PK, defaultRandom()
  - title: text, notNull
  - amount: numeric(12,2), notNull, CHECK > 0  (gross amount paid out)
  - returnAmount: numeric(12,2), notNull DEFAULT 0, CHECK >= 0
      (amount returned after purchase; actual spend = amount − returnAmount)
  - expenditureDate: date, notNull
  - remarks: text, nullable
  - createdBy: UUID FK → users.id, notNull
  - createdAt: timestamptz, notNull, defaultNow()
  - updatedAt: timestamptz, notNull, defaultNow()
  - deletedAt: timestamptz, nullable  (soft delete, same pattern as donations)

Add a partial index on expenditureDate WHERE deletedAt IS NULL, and an index on
createdAt DESC. Export the Expenditure type.

Generate the Drizzle migration with `pnpm drizzle-kit generate` and show me the SQL
before we apply it. Do NOT alter the existing donations table yet.
```

### A2. Query layer for expenditures

```
Create src/db/queries/expenditures.ts (start with import "server-only").

Implement:
  - activeExpenditures — isNull(expenditures.deletedAt), shared constant
  - createExpenditure(input, createdBy)
  - getExpenditure(id) — single active row
  - updateExpenditure(id, input)
  - softDeleteExpenditure(id)
  - listExpenditures({ q?, from?, to?, page, pageSize, sort?, order? })
      q searches title (ILIKE)
      from/to filter expenditureDate
      sort options: expenditureDate | title | amount | returnAmount
      default sort: createdAt DESC
      each row: id, title, amount, returnAmount, expenditureDate, remarks, createdByName (join users)
      returns { rows, total }

Follow the exact same patterns as src/db/queries/donations.ts.
```

### A3. Validation schema for expenditures

```
Create src/lib/validation/expenditure.ts.

expenditureSchema (Zod):
  - title: string, trimmed, 3–100 characters
  - amount: same pattern as donationSchema.amount — digits, up to 2 decimals, > 0
  - returnAmount: digits, up to 2 decimals, >= 0 (default "0" when empty)
      refine: Number(returnAmount) <= Number(amount) with error key "return_exceeds_amount"
  - expenditureDate: same pattern as donationSchema.donationDate — YYYY-MM-DD, not future
  - remarks: optional text, max 500 chars, coerced to null if empty

Export ExpenditureInput type.
```

### A4. Permissions

```
In src/lib/auth/permissions.ts, add the following permissions to the PERMISSIONS array
and the role matrix:
  - "expenditure:create"  → super_admin, admin
  - "expenditure:list"    → super_admin, admin
  - "expenditure:edit"    → super_admin
  - "expenditure:delete"  → super_admin

Do not change any existing donation or user permissions.
```

### A5. Server actions for expenditures

```
Create src/actions/expenditures.ts ("use server").

Implement the same three-action pattern as src/actions/donations.ts:
  - createExpenditureAction(_prev, formData): FormState
      authorize("expenditure:create") → expenditureSchema.safeParse → createExpenditure
      revalidatePath("/expenditures") and revalidatePath("/dashboard")
      On success return values with _ts so the form remounts
  - updateExpenditureAction(_prev, formData): FormState
      authorize("expenditure:edit") → expenditureSchema.safeParse → updateExpenditure
      revalidatePath + redirect("/expenditures")
  - deleteExpenditureAction(formData): void
      authorize("expenditure:delete") → softDeleteExpenditure
      revalidatePath("/expenditures") and revalidatePath("/dashboard")
```

### A6. Expenditure form component

```
Create src/components/expenditure-form.tsx ("use client").

Mirror the pattern of DonationForm:
  - useActionState(action, initialState)
  - Fields: title (text input), expenditureDate (BsDatePicker, max=today),
    amount (same comma-grouping + words preview as donation amount),
    returnAmount (number input, optional, default 0; show computed "Actual spend: Rs. X" below it),
    remarks (textarea, optional)
  - Disable submit while pending
  - Show field-level errors via t("errors.<key>")
  - Show success toast via the Alert component on status="success"
  - Accept action prop so it can be used for both add and edit

Add i18n keys to en.json and ne.json (under "expenditure" namespace):
  addTitle, editTitle, title, amount, returnAmount, actualSpend, date, remarks,
  added, updated, confirmDelete
```

### A7. Expenditure pages

```
Create the following pages:

1. src/app/(app)/expenditures/page.tsx
   - requirePermission("expenditure:list")
   - Read searchParams: q, from, to, page, sort, order
   - Render ExpenditureFilters (new client component, mirror DonationFilters)
     with q and date range
   - Server-side table/cards (same responsive pattern as donations list)
     Columns: date, title, amount, return amount, actual spend (amount − returnAmount),
     remarks, added by, actions (edit/delete)
   - Pagination
   - Show running totals at the bottom: total gross, total returned, total actual spend

2. src/app/(app)/expenditures/new/page.tsx
   - requirePermission("expenditure:create")
   - Render ExpenditureForm with createExpenditureAction

3. src/app/(app)/expenditures/[id]/edit/page.tsx
   - requirePermission("expenditure:edit")
   - Fetch expenditure, 404 if not found
   - Render ExpenditureForm pre-populated with existing values, updateExpenditureAction

Add "expenditures" to the nav in AppShell (visible to super_admin and admin).
Add i18n keys: nav.expenditures = "Expenditures" / "खर्च".
```

### A8. Expenditure list Excel export

```
Add an Excel download to the expenditures list page, following the same pattern as
src/app/api/reports/excel/route.ts.

1. Create src/app/api/expenditures/excel/route.ts
   - GET with optional ?from=&to=&q= (mirrors the page's filter params)
   - requirePermission("expenditure:list")
   - Validate from/to with dateRangeSchema when both are provided
   - Call listExpenditures with no pagination (pageSize: Number.MAX_SAFE_INTEGER, page: 1)
     to fetch all matching rows
   - Build an ExcelJS workbook:
       Columns: S.N. | Date (BS) | Title | Amount | Return Amount | Actual Spend | Remarks | Added By
       Numeric cells for amount, returnAmount, actualSpend (amount − returnAmount)
       TOTALS row at the bottom summing Amount, Return Amount, Actual Spend
       Apply the same header/style conventions as the existing Excel route
   - Respond with application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
   - Filename: expenditures-<from>-<to>.xlsx (or expenditures-all.xlsx when no range)

2. Add a "Download Excel" button on src/app/(app)/expenditures/page.tsx
   - Build the href from the current filter params (q, from, to)
   - Use the btnGhost style, same as the reports page download buttons
   - Only visible when there is at least one row

Add i18n key under "expenditure":
  downloadExcel = "Download Excel" / "Excel डाउनलोड"
```

---

## Feature B — Donation type (cash / non-cash / other)

### B1. Schema: add donationType and related columns to donations

```
Using the drizzle-db skill, alter the donations table in src/db/schema.ts:

1. Add a new pgEnum: donationType with values ["cash", "non_cash", "other"]

2. Add to the donations table:
   - donationType: donationType enum, notNull, default "cash"
   - itemDescription: text, nullable
       (used when donationType = "non_cash"; stores the item donated)
   - otherDescription: text, nullable
       (used when donationType = "other"; stores free-text description)

3. Add a CHECK constraint: when donationType = "non_cash" then itemDescription IS NOT NULL.
   (We enforce "other" description in app logic/validation, not DB, to keep the migration simple.)

4. Add a partial index on donationType WHERE deletedAt IS NULL for efficient filter queries.

Generate the migration SQL and show it to me before applying. Do NOT change the amount
column or any other existing column.
```

### B2. Update donation validation schema

```
Update src/lib/validation/donation.ts to add donationType fields:

  - donationType: z.enum(["cash", "non_cash", "other"]), default "cash"
  - itemDescription: optional text, max 200 chars, trimmed, coerced to null if empty
      required when donationType = "non_cash" (use .superRefine or .refine)
  - otherDescription: optional text, max 500 chars, trimmed, coerced to null if empty
      required when donationType = "other"
  - amount: keep the existing validation but make it conditional — required and > 0 only
      when donationType = "cash". When non_cash or other, default amount to "0" if empty.

Update DonationInput type. Keep all existing fields unchanged.

Add error keys to en.json + ne.json under "errors":
  item_description_required, other_description_required
```

### B3. Update donation queries and actions

```
Update src/db/queries/donations.ts:

1. createDonation and updateDonation: include donationType, itemDescription,
   otherDescription in the insert/update values.

2. getDonation and getDonationForReceipt: select the three new columns.

3. listDonations: 
   - Add donationType to the selected columns in rows.
   - Add optional filter: donationType?: "cash" | "non_cash" | "other"
     Add to DonationFilters type and apply the filter when provided.

Update src/actions/donations.ts to pass through all new fields (no logic change needed,
Zod handles it).

Update src/app/(app)/donations/page.tsx searchParams type to include donationType?.
```

### B4. Update DonationForm component

```
Update src/components/donation-form.tsx to add donation type UI:

1. Add a segmented control or radio group for donationType: "Cash", "Non-cash", "Other".
   Default to "cash".

2. When "cash" is selected: show the existing amount field.
3. When "non_cash" is selected: hide the amount field (or show it as optional/greyed);
   show a new text input "Item donated" (maps to itemDescription).
4. When "other" is selected: hide the amount field; show a textarea "Description"
   (maps to otherDescription).

5. Use React state to toggle visibility of conditional fields.
6. Pre-populate the correct fields when editing an existing donation (edit page passes
   existing values through defaultValues).

Add i18n keys under "donation":
  donationType, cash, nonCash, other, itemDonated, otherDescription
```

### B5. Update receipt PDF for donation type

```
Update the donation receipt to reflect the new donation types.

1. Read src/app/api/donations/[id]/receipt/route.ts and the PDF builder it calls
   (likely src/lib/receipts/ or src/lib/pdf/).

2. getDonationForReceipt already selects the three new columns (donationType,
   itemDescription, otherDescription) — confirm this is done after B3.

3. Update the receipt PDF template:
   - When donationType = "cash": show "Amount" row as before.
   - When donationType = "non_cash": replace the Amount row with "Item Donated"
     showing itemDescription. Remove or grey out the rupee amount row.
   - When donationType = "other": replace the Amount row with "Description"
     showing otherDescription. Remove or grey out the rupee amount row.

4. Update the receipt preview modal (src/components/receipt-preview-button.tsx or
   similar) to reflect the same conditional display in the on-screen preview.

5. Add i18n keys under "receipt":
   itemDonated = "Item donated" / "दान गरिएको वस्तु"
   otherDonation = "Description" / "विवरण"
   donationType = "Donation type" / "दानको प्रकार"
```

### B6. Update donation list and filters

```
Update src/components/donation-filters.tsx to add a "Type" filter:
  - Add a <select> with options: All types, Cash, Non-cash, Other
  - Include it in buildUrl (param name: "type")
  - Pass the current value from the page's searchParams

Update src/app/(app)/donations/page.tsx:
  - Read "type" from searchParams, validate it is one of the enum values or undefined
  - Pass it to listDonations
  - Show the donation type as a badge (colour-coded) in the table and card view:
      cash → amber, non_cash → blue, other → stone
  - Show itemDescription or otherDescription below remarks where relevant

Add i18n keys for the type badges to en.json + ne.json.
```

---

## Feature C — Income / Expenditure / Savings reports

### C1. Core report query: daily summary

```
In src/db/queries/reports.ts, add:

export type DailySummary = {
  date: string;         // YYYY-MM-DD
  income: string;       // sum of cash donations for that date
  expenditure: string;  // sum of (amount - returnAmount) for expenditures
  savings: string;      // income - expenditure
  donationCount: number;
  expenditureCount: number;
};

async function getDailySummary(date: string): Promise<DailySummary>
  - Runs two queries in parallel (or one CTE if you prefer):
      1. Sum of donations.amount WHERE donationDate = date AND donationType = 'cash' AND active
      2. Sum of (amount - returnAmount) FROM expenditures WHERE expenditureDate = date AND active
  - Returns the combined DailySummary.
  - savings = income - expenditure (use BigInt math, same as existing delta logic).

Also add:

async function getRangeSummary(from: string, to: string): Promise<{
  rows: DailySummary[];
  totals: { income: string; expenditure: string; savings: string };
}>
  - One DailySummary row per day that has at least one donation or expenditure.
  - Overall totals by summing all rows.
  - Days with no donations default income to "0"; days with no expenditures default to "0".

Also add:

async function getOverallSummary(): Promise<{
  income: string;
  expenditure: string;
  savings: string;
  donationCount: number;
  expenditureCount: number;
}>
  - Sums ALL active cash donations + ALL active expenditures with no date filter.
```

### C2. Extend reports page

```
Update src/app/(app)/reports/page.tsx to add an Income/Expenditure/Savings section:

Layout:
  1. Existing donation detail report stays as-is (rename heading to "Donation Detail Report").
  2. Add a second section below (or as a tab) titled "Income / Expenditure / Savings".

For the "Income / Expenditure / Savings" section:

- Single date mode: shows DailySummary cards (income, expenditure, savings as three stat cards).
- Date range mode: shows a table with columns: Date, Income, Expenditure, Savings; grand totals row.
- No "Overall" summary here — that lives on the dashboard (see C4).

Add download buttons for PDF and Excel for the I/E/S report (reuse the same API route
pattern: /api/reports/ies/pdf?from=...&to=... and /api/reports/ies/excel?from=...&to=...).

Add i18n keys under "reports":
  income, expenditure, savings, incomeSummary, expenditureSummary, savingsSummary,
  incomeExpTitle, noExpenditures
```

### C3. API routes for Income/Expenditure/Savings downloads

```
Create two new API routes following the exact pattern of src/app/api/reports/pdf/route.ts
and src/app/api/reports/excel/:

1. src/app/api/reports/ies/pdf/route.ts
   - GET with ?from=&to= (or ?overall=true for the all-time summary)
   - requirePermission("report:download")
   - Build a PDF with two sections:
       a. Summary header: Income, Expenditure, Savings stat blocks
       b. Table: Date | Income | Expenditure | Savings
   - Use Noto Sans Devanagari font (same as existing PDF reports)

2. src/app/api/reports/ies/excel/route.ts
   - Same query, ExcelJS workbook with numeric cells and a TOTALS row
   - Apply the same style/formatting conventions as src/app/api/reports/excel/route.ts
```

### C4. Expenditure & savings cards on the dashboard

```
Update src/app/(app)/dashboard/page.tsx to show expenditure and savings alongside
the existing income totals.

1. In src/db/queries/reports.ts, extend getTotals() (or add a parallel call) to also
   return today's expenditure and savings:
     - todayExpenditure: sum of active expenditures net spend where expenditureDate = NEPAL_TODAY
     - todaySavings: todayIncome − todayExpenditure (BigInt math)
     - overallExpenditure: sum of all active expenditures net spend
     - overallSavings: overallIncome − overallExpenditure

2. In the dashboard "Row 1" summary cards, expand from 2 cards to a 2×2 (or 1×4) grid:
     Card 1: Today's Income (existing "Total donation today" card, unchanged)
     Card 2: Today's Expenditure — amount in a danger colour (e.g. red-700)
     Card 3: Today's Savings — green if positive, red if negative
     Card 4: Overall Savings (retitle existing overall card; add savings line below total)

3. Add a permanent "Overall summary" section near the top (below the stat cards)
   showing getOverallSummary() as three prominent stat blocks — no date filter needed:
     Total Income | Total Expenditure | Net Savings
   This is the always-visible all-time view that the reports page no longer needs.

4. Add i18n keys under "dashboard":
   todayExpenditure   = "Today's expenditure"  / "आजको खर्च"
   todaySavings       = "Today's savings"       / "आजको बचत"
   overallSavings     = "Overall savings"       / "कुल बचत"
   overallIncome      = "Overall income"        / "कुल आय"
   overallExpenditure = "Overall expenditure"   / "कुल खर्च"
```

### C5. Update donation detail report PDF/Excel to include expenditure summary

```
Update the existing donation detail report so that when the user downloads PDF or Excel
for a date or range, the document includes a summary section at the top showing the
Income / Expenditure / Savings for that same period.

1. In src/lib/reports/shared.ts (or wherever prepareReport lives), call getRangeSummary
   (or getDailySummary for a single date) in parallel with getReport so both datasets
   are available to the PDF and Excel builders.

2. src/app/api/reports/pdf/route.ts — update the PDF builder to prepend a summary block
   between the report title/date header and the donations table:
     ┌──────────────────────────────────────────────────┐
     │ Income: Rs. X   Expenditure: Rs. Y   Savings: Rs. Z │
     └──────────────────────────────────────────────────┘
   Keep the donations table and grand total footer exactly as they are.

3. src/app/api/reports/excel/route.ts — add a summary block at the top of the sheet
   before the donations rows:
     Row 1: "Income"      | value  (numeric cell)
     Row 2: "Expenditure" | value  (numeric cell)
     Row 3: "Savings"     | value  (numeric cell, bold)
     Blank separator row, then the existing donations table below.

4. On src/app/(app)/reports/page.tsx, whenever a report is generated show the
   DailySummary / range summary cards inline above the donations table so the user
   sees income + expenditure + savings before downloading.

Add i18n key under "reports" if not already added in C2:
  summaryHeader = "Summary" / "सारांश"
```

---

## Feature D — Donor filters by amount range and donation type

### D1. Amount range filter in donation list

```
Update src/components/donation-filters.tsx to add:

1. "Min amount" and "Max amount" number inputs (positive integers or empty).
   - Parameter names: minAmt, maxAmt
   - Include in buildUrl

2. Pass minAmt and maxAmt from the donations page searchParams as props.

Update src/db/queries/donations.ts — listDonations:
  - Add minAmt?: string and maxAmt?: string to DonationFilters type
  - Apply gte(donations.amount, minAmt) when provided
  - Apply lte(donations.amount, maxAmt) when provided

Update src/app/(app)/donations/page.tsx:
  - Read minAmt and maxAmt from searchParams
  - Validate: must be numeric strings or undefined; maxAmt >= minAmt when both set
  - Pass to listDonations and to DonationFilters component

Add i18n keys under "donation":
  minAmount = "Min amount" / "न्यूनतम रकम"
  maxAmount = "Max amount" / "अधिकतम रकम"
```

### D2. Donation type filter wiring (if not already done in B5)

```
If Feature B5 has not been applied yet: wire the "donation type" filter end-to-end in
listDonations and DonationFilters as described in prompt B5.

If B5 is already done: verify that the type filter works correctly in combination with
the new amount range filter from D1 (both can be active simultaneously).
```

### D3. Donor summary: filter donors by total donated

```
In src/db/queries/reports.ts, add:

export type DonorSummary = {
  donorName: string;
  phone: string;
  address: string;
  totalCash: string;        // sum of cash donations
  nonCashCount: number;     // count of non-cash donations
  otherCount: number;       // count of other donations
  donationCount: number;
  lastDonationDate: string;
};

async function listDonorSummaries(opts: {
  minTotal?: string;
  maxTotal?: string;
  donationType?: "cash" | "non_cash" | "other";
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}): Promise<{ rows: DonorSummary[]; total: number }>

  - Group donations by (lower(donorName), phone) — same grouping as getTopDonors.
  - For each group: sum of cash amounts, non-cash count, other count, last donation date.
  - Apply minTotal / maxTotal filters on sum of cash amounts (HAVING clause).
  - Apply donationType filter: if "cash" → only include groups with cash > 0;
      if "non_cash" → only groups with nonCashCount > 0; etc.
  - Apply date range filter on donationDate when from/to provided.
  - Order by total cash DESC, then donorName ASC.
  - Paginate.
```

### D4. Donor summary page

```
Create src/app/(app)/donors/page.tsx:
  - requirePermission("donation:list")  (same as the donations list — admins and super_admin)
  - Read searchParams: minTotal, maxTotal, donationType, from, to, page
  - Call listDonorSummaries with those opts
  - Render a filter bar:
      - Min total donated / Max total donated (number inputs)
      - Donation type select (All / Cash / Non-cash / Other)
      - Date range pickers (from / to)
      - Filter and Clear buttons
  - Render a table/card view:
      Donor name | Phone | Address | Cash total | Non-cash # | Other # | Donations | Last date
  - Pagination (PAGE_SIZE = 20)

Add "donors" to the nav (visible to super_admin and admin):
  nav.donors = "Donors" / "दाताहरू"

Add i18n keys under a new "donors" namespace:
  title, minTotal, maxTotal, cashTotal, nonCashCount, otherCount,
  donationCount, lastDonation, noResults
```

---

## Migration checklist (run after all features are implemented)

```
1. pnpm drizzle-kit generate   — generates migrations for both schema changes (A1 + B1)
2. Review the generated SQL in drizzle/  (check constraints, indexes, defaults)
   Note: existing donations rows will be backfilled to donationType = 'cash' via the DEFAULT
3. pnpm drizzle-kit migrate    — apply to dev DB
4. pnpm run typecheck          — zero errors
5. pnpm run lint               — zero warnings
6. Manual smoke tests:
   a. Add a cash donation → appears in income report + dashboard today income card
   b. Add a non-cash donation → itemDescription stored; badge correct; receipt shows item not amount
   c. Add an expenditure (returnAmount > 0) → actual spend = amount − returnAmount;
      dashboard today expenditure card updates; savings = income − expenditure
   d. Run I/E/S report for today → three stat cards match dashboard values
   e. Download donation detail PDF for today → summary block shows income/expenditure/savings
      above the donations table
   f. Download expenditure list Excel → totals row sums correctly
   g. Donor summary filter with minTotal → only donors at or above threshold shown
   h. Donation type filter on donations list + donor summary work simultaneously
   i. Overall summary on dashboard matches manual sum of all donations − all expenditures
7. Update ne.json for any keys added during implementation that only got en.json entries
8. Commit all changes in a well-described commit
```

---

## Reusable one-shot prompts

**Apply a single migration safely**
```
Show me the SQL for the next pending Drizzle migration without applying it.
I will review and then say "apply it".
```

**i18n audit**
```
Compare src/messages/en.json and src/messages/ne.json. List every key that exists in one
file but not the other, and every key whose value is still the English placeholder in ne.json.
```

**Amount arithmetic check**
```
Scan all files in src/ that reference expenditures.returnAmount or donations.amount.
Flag any place that uses parseFloat, Number(), or + operator on those values instead of
BigInt or string-based math.
```

**Regression: soft-delete guard**
```
Scan src/db/queries/ for any query that reads from the donations or expenditures table
without including the activeDonations / activeExpenditures guard. List the function name
and file.
```
