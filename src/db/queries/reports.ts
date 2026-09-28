import "server-only";
import { and, asc, count, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { donations } from "@/db/schema";
import { activeDonations } from "./donations";

// ── Date range constants ──────────────────────────────────────────────────────
// 23 Ashoj 2083 BS → 2026-10-09 AD  |  05 Kartik 2083 BS → 2026-10-22 AD
export const EVENT_START_AD = "2026-10-09";
export const EVENT_END_AD = "2026-10-22";

const NEPAL_TODAY = sql`(now() at time zone 'Asia/Kathmandu')::date`;
const sumAmount = sql<string>`coalesce(sum(${donations.amount}), 0)::text`;

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
