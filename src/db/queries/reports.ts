import "server-only";
import { and, asc, count, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { donations } from "@/db/schema";
import { activeDonations } from "./donations";

const NEPAL_TODAY = sql`(now() at time zone 'Asia/Kathmandu')::date`;
const sumAmount = sql<string>`coalesce(sum(${donations.amount}), 0)::text`;

/** Single source for on-screen report, PDF and Excel. from == to for a single date. */
export async function getReport(from: string, to: string) {
  const range = and(activeDonations, gte(donations.donationDate, from), lte(donations.donationDate, to));
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
      .where(and(activeDonations, sql`${donations.donationDate} = ${NEPAL_TODAY}`)),
    db().select({ total: sumAmount, n: count() }).from(donations).where(activeDonations),
    db().execute(sql`select to_char(${NEPAL_TODAY}, 'YYYY-MM-DD') as d`).then((r) => r.rows as { d: string }[]),
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
export async function getTopDonors(scope: "today" | "overall"): Promise<TopDonor[]> {
  const dateFilter = scope === "today" ? sql`and donation_date = ${NEPAL_TODAY}` : sql``;
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
