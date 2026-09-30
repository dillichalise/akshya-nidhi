import "server-only";
import { and, asc, count, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { donations, expenditures } from "@/db/schema";
import { activeDonations } from "./donations";
import { activeExpenditures } from "./expenditures";

// ── Date range constants ──────────────────────────────────────────────────────
// 23 Ashoj 2083 BS → 2026-10-09 AD  |  05 Kartik 2083 BS → 2026-10-22 AD
export const EVENT_START_AD = "2026-10-09";
export const EVENT_END_AD = "2026-10-22";

const NEPAL_TODAY = sql`(now() at time zone 'Asia/Kathmandu')::date`;
const sumAmount = sql<string>`coalesce(sum(${donations.amount}), 0)::text`;

function decimalToPaisa(value: string): bigint {
  const negative = value.startsWith("-");
  const [whole, fraction = ""] = (negative ? value.slice(1) : value).split(".");
  const paisa = BigInt(whole) * BigInt(100) + BigInt((fraction + "00").slice(0, 2));
  return negative ? -paisa : paisa;
}

function paisaToDecimal(value: bigint): string {
  const zero = BigInt(0);
  const hundred = BigInt(100);
  const sign = value < zero ? "-" : "";
  const absolute = value < zero ? -value : value;
  return `${sign}${absolute / hundred}.${(absolute % hundred).toString().padStart(2, "0")}`;
}

/** Single source for on-screen report, PDF and Excel. from == to for a single date. */
export async function getReport(from: string, to: string) {
  const range = and(
    activeDonations,
    gte(donations.donationDate, from),
    lte(donations.donationDate, to),
  );
  const [rows, [agg]] = await Promise.all([
    db()
      .select({
        id: donations.id,
        donorName: donations.donorName,
        address: donations.address,
        phone: donations.phone,
        amount: donations.amount,
        donationDate: donations.donationDate,
        remarks: donations.remarks,
      })
      .from(donations)
      .where(range)
      .orderBy(asc(donations.donationDate), asc(donations.createdAt)),
    db().select({ total: sumAmount, n: count() }).from(donations).where(range),
  ]);
  return { rows, total: agg?.total ?? "0", count: agg?.n ?? 0 };
}

export async function getTotals() {
  const [[today], [overall], [todayDate]] = await Promise.all([
    db()
      .select({ total: sumAmount, n: count() })
      .from(donations)
      .where(
        and(activeDonations, sql`${donations.donationDate} = ${NEPAL_TODAY}`),
      ),
    db()
      .select({ total: sumAmount, n: count() })
      .from(donations)
      .where(activeDonations),
    db()
      .execute(sql`select to_char(${NEPAL_TODAY}, 'YYYY-MM-DD') as d`)
      .then((r) => r.rows as { d: string }[]),
  ]);
  return {
    today: { total: today?.total ?? "0", count: today?.n ?? 0 },
    overall: { total: overall?.total ?? "0", count: overall?.n ?? 0 },
    todayDate: todayDate.d,
  };
}

export type TopDonor = {
  name: string;
  phone: string;
  address: string;
  total: string;
  count: number;
  items: { date: string; amount: string }[];
};

/**
 * Top 10 donors: active donations grouped by (normalized name, phone), summed.
 * Name/address come from the donor's most recent donation (by donation date, then entry time).
 */
export async function getTopDonors(
  scope: "today" | "overall",
): Promise<TopDonor[]> {
  const dateFilter =
    scope === "today" ? sql`and donation_date = ${NEPAL_TODAY}` : sql``;
  const result = await db().execute(sql`
    select
      (array_agg(donor_name order by donation_date desc, created_at desc))[1] as name,
      phone,
      (array_agg(address order by donation_date desc, created_at desc))[1] as address,
      sum(amount)::text as total,
      count(*)::int as count,
      json_agg(json_build_object('date', to_char(donation_date, 'YYYY-MM-DD'), 'amount', amount::text)
               order by donation_date desc, created_at desc) as items
    from donations
    where deleted_at is null ${dateFilter}
    group by lower(donor_name), phone
    order by sum(amount) desc, lower(donor_name) asc
    limit 10
  `);
  return result.rows as unknown as TopDonor[];
}

// ── Day-over-day comparison ───────────────────────────────────────────────────

export type DayOverDay = {
  today: { total: string; count: number };
  yesterday: { total: string; count: number };
  /** Positive = increase, negative = decrease, null = no yesterday data */
  deltaAmount: string | null;
  deltaCount: number | null;
};

export async function getDayOverDay(): Promise<DayOverDay> {
  const NEPAL_YESTERDAY = sql`(now() at time zone 'Asia/Kathmandu')::date - 1`;
  const [[today], [yesterday]] = await Promise.all([
    db()
      .select({ total: sumAmount, n: count() })
      .from(donations)
      .where(
        and(activeDonations, sql`${donations.donationDate} = ${NEPAL_TODAY}`),
      ),
    db()
      .select({ total: sumAmount, n: count() })
      .from(donations)
      .where(
        and(
          activeDonations,
          sql`${donations.donationDate} = ${NEPAL_YESTERDAY}`,
        ),
      ),
  ]);
  const todayAmt = BigInt(Math.round(Number(today?.total ?? "0") * 100));
  const yestAmt = BigInt(Math.round(Number(yesterday?.total ?? "0") * 100));
  const deltaAmt = todayAmt - yestAmt;
  const yCnt = yesterday?.n ?? 0;
  return {
    today: { total: today?.total ?? "0", count: today?.n ?? 0 },
    yesterday: { total: yesterday?.total ?? "0", count: yCnt },
    deltaAmount: (Number(deltaAmt) / 100).toFixed(2),
    deltaCount: (today?.n ?? 0) - yCnt,
  };
}

// ── Per-day totals for the event date range ───────────────────────────────────

export type DailyTotal = {
  date: string; // "YYYY-MM-DD"
  total: string;
  count: number;
};

export async function getEventDailyTotals(): Promise<DailyTotal[]> {
  const rows = await db()
    .select({
      date: donations.donationDate,
      total: sumAmount,
      n: count(),
    })
    .from(donations)
    .where(
      and(
        activeDonations,
        gte(donations.donationDate, EVENT_START_AD),
        lte(donations.donationDate, EVENT_END_AD),
      ),
    )
    .groupBy(donations.donationDate)
    .orderBy(asc(donations.donationDate));
  return rows.map((r) => ({ date: r.date, total: r.total, count: r.n }));
}

// ── Amount-bracket distribution for the event range ──────────────────────────

export type AmountBracket = {
  label: string; // e.g. "0–1k"
  count: number;
};

export async function getAmountDistribution(): Promise<AmountBracket[]> {
  const result = await db().execute(sql`
    select
      case
        when amount::numeric < 1000      then '< 1k'
        when amount::numeric < 5000      then '1k–5k'
        when amount::numeric < 10000     then '5k–10k'
        when amount::numeric < 25000     then '10k–25k'
        when amount::numeric < 50000     then '25k–50k'
        else                                  '50k+'
      end as label,
      count(*)::int as count
    from donations
    where deleted_at is null
      and donation_date between ${EVENT_START_AD} and ${EVENT_END_AD}
    group by 1
    order by min(amount::numeric)
  `);
  return result.rows as AmountBracket[];
}

// ── Overall target progress ───────────────────────────────────────────────────

/** Total collected across the full event window (25 Ashoj – 03 Kartik). */
export async function getEventTotal(): Promise<{
  total: string;
  count: number;
}> {
  const [row] = await db()
    .select({ total: sumAmount, n: count() })
    .from(donations)
    .where(
      and(
        activeDonations,
        gte(donations.donationDate, EVENT_START_AD),
        lte(donations.donationDate, EVENT_END_AD),
      ),
    );
  return { total: row?.total ?? "0", count: row?.n ?? 0 };
}

// ── Income / Expenditure / Savings reports ────────────────────────────────────

export type DailySummary = {
  date: string; // YYYY-MM-DD
  income: string; // sum of cash donations for that date
  expenditure: string; // sum of (amount - returnAmount) for expenditures
  savings: string; // income - expenditure
  donationCount: number;
  expenditureCount: number;
};

/**
 * Get income/expenditure/savings summary for a single date.
 * Income = sum of cash donations only (non-cash donations have amount but don't count as cash income).
 * Expenditure = sum of net spend (amount - returnAmount).
 * Savings = income - expenditure (computed using BigInt to avoid floating point errors).
 */
export async function getDailySummary(date: string): Promise<DailySummary> {
  const [[incomeRow], [expenseRow]] = await Promise.all([
    db()
      .select({
        total: sql<string>`coalesce(sum(${donations.amount}), 0)::text`,
        count: count(),
      })
      .from(donations)
      .where(
        and(
          activeDonations,
          eq(donations.donationDate, date),
          eq(donations.donationType, "cash"),
        ),
      ),
    db()
      .select({
        total: sql<string>`coalesce(sum(${expenditures.amount} - ${expenditures.returnAmount}), 0)::text`,
        count: count(),
      })
      .from(expenditures)
      .where(and(activeExpenditures, eq(expenditures.expenditureDate, date))),
  ]);

  const income = incomeRow?.total ?? "0";
  const expenditure = expenseRow?.total ?? "0";

  const savings = paisaToDecimal(
    decimalToPaisa(income) - decimalToPaisa(expenditure),
  );

  return {
    date,
    income,
    expenditure,
    savings,
    donationCount: incomeRow?.count ?? 0,
    expenditureCount: expenseRow?.count ?? 0,
  };
}

/**
 * Get income/expenditure/savings summary for a date range.
 * Returns one DailySummary row per day that has at least one donation or expenditure,
 * plus overall totals across the range.
 */
export async function getRangeSummary(
  from: string,
  to: string,
): Promise<{
  rows: DailySummary[];
  totals: { income: string; expenditure: string; savings: string };
}> {
  // Get all dates in the range that have either donations or expenditures
  const datesResult = await db().execute(sql`
    select distinct date
    from (
      select donation_date as date
      from donations
      where deleted_at is null
        and donation_date between ${from} and ${to}
        and donation_type = 'cash'
      union
      select expenditure_date as date
      from expenditures
      where deleted_at is null
        and expenditure_date between ${from} and ${to}
    ) dates
    order by date
  `);

  const dates = (datesResult.rows as { date: string }[]).map((r) => r.date);

  // Get summary for each date
  const rows = await Promise.all(dates.map((date) => getDailySummary(date)));

  // Calculate totals using BigInt
  let totalIncomeCents = BigInt(0);
  let totalExpenseCents = BigInt(0);

  for (const row of rows) {
    totalIncomeCents += decimalToPaisa(row.income);
    totalExpenseCents += decimalToPaisa(row.expenditure);
  }

  const totalSavingsCents = totalIncomeCents - totalExpenseCents;

  return {
    rows,
    totals: {
      income: paisaToDecimal(totalIncomeCents),
      expenditure: paisaToDecimal(totalExpenseCents),
      savings: paisaToDecimal(totalSavingsCents),
    },
  };
}

/**
 * Get overall income/expenditure/savings summary across all time.
 * Only counts active (non-deleted) records.
 */
export async function getOverallSummary(): Promise<{
  income: string;
  expenditure: string;
  savings: string;
  donationCount: number;
  expenditureCount: number;
}> {
  const [[incomeRow], [expenseRow]] = await Promise.all([
    db()
      .select({
        total: sql<string>`coalesce(sum(${donations.amount}), 0)::text`,
        count: count(),
      })
      .from(donations)
      .where(and(activeDonations, eq(donations.donationType, "cash"))),
    db()
      .select({
        total: sql<string>`coalesce(sum(${expenditures.amount} - ${expenditures.returnAmount}), 0)::text`,
        count: count(),
      })
      .from(expenditures)
      .where(activeExpenditures),
  ]);

  const income = incomeRow?.total ?? "0";
  const expenditure = expenseRow?.total ?? "0";

  const savings = paisaToDecimal(
    decimalToPaisa(income) - decimalToPaisa(expenditure),
  );

  return {
    income,
    expenditure,
    savings,
    donationCount: incomeRow?.count ?? 0,
    expenditureCount: expenseRow?.count ?? 0,
  };
}

export type DonorSummary = {
  donorName: string;
  phone: string;
  address: string;
  totalCash: string;
  nonCashCount: number;
  otherCount: number;
  donationCount: number;
  lastDonationDate: string;
};

export async function listDonorSummaries(opts: {
  minTotal?: string;
  maxTotal?: string;
  donationType?: "cash" | "non_cash" | "other";
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}): Promise<{ rows: DonorSummary[]; total: number }> {
  const where: SQL[] = [sql`deleted_at is null`];
  if (opts.from) where.push(sql`donation_date >= ${opts.from}`);
  if (opts.to) where.push(sql`donation_date <= ${opts.to}`);

  const cashTotal = sql`coalesce(sum(amount) filter (where donation_type = 'cash'), 0)`;
  const having: SQL[] = [];
  if (opts.minTotal) having.push(sql`${cashTotal} >= ${opts.minTotal}::numeric`);
  if (opts.maxTotal) having.push(sql`${cashTotal} <= ${opts.maxTotal}::numeric`);
  if (opts.donationType === "cash") having.push(sql`${cashTotal} > 0`);
  if (opts.donationType === "non_cash") {
    having.push(sql`count(*) filter (where donation_type = 'non_cash') > 0`);
  }
  if (opts.donationType === "other") {
    having.push(sql`count(*) filter (where donation_type = 'other') > 0`);
  }

  const grouped = sql`with donor_groups as (
    select
      (array_agg(donor_name order by donation_date desc, created_at desc))[1] as donor_name,
      phone,
      (array_agg(address order by donation_date desc, created_at desc))[1] as address,
      (${cashTotal})::text as total_cash,
      count(*) filter (where donation_type = 'non_cash')::int as non_cash_count,
      count(*) filter (where donation_type = 'other')::int as other_count,
      count(*)::int as donation_count,
      to_char(max(donation_date), 'YYYY-MM-DD') as last_donation_date
    from donations
    where ${sql.join(where, sql` and `)}
    group by lower(trim(donor_name)), phone
    ${having.length ? sql`having ${sql.join(having, sql` and `)}` : sql``}
  )`;

  const [result, countResult] = await Promise.all([
    db().execute(sql`${grouped}
      select donor_name, phone, address, total_cash, non_cash_count, other_count,
             donation_count, last_donation_date
      from donor_groups
      order by total_cash::numeric desc, lower(donor_name) asc
      limit ${opts.pageSize} offset ${(opts.page - 1) * opts.pageSize}`),
    db().execute(sql`${grouped} select count(*)::int as n from donor_groups`),
  ]);

  return {
    rows: result.rows.map((row) => {
      const donor = row as Record<string, string | number>;
      return {
        donorName: String(donor.donor_name),
        phone: String(donor.phone),
        address: String(donor.address),
        totalCash: String(donor.total_cash),
        nonCashCount: Number(donor.non_cash_count),
        otherCount: Number(donor.other_count),
        donationCount: Number(donor.donation_count),
        lastDonationDate: String(donor.last_donation_date),
      };
    }),
    total: Number((countResult.rows[0] as { n: number } | undefined)?.n ?? 0),
  };
}
