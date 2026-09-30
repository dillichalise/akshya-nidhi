import "server-only";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  lte,
  or,
  count,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import { donations, users } from "@/db/schema";
import type { DonationInput } from "@/lib/validation/donation";

/** Every read of donations MUST include this — soft-deleted rows never count. */
export const activeDonations = isNull(donations.deletedAt);

export async function createDonation(input: DonationInput, createdBy: string) {
  const [row] = await db()
    .insert(donations)
    .values({
      ...input,
      createdBy,
      // Ensure defaults are applied for new fields
      donationType: input.donationType ?? "cash",
      itemDescription: input.itemDescription ?? null,
      otherDescription: input.otherDescription ?? null,
    })
    .returning({ id: donations.id });
  return row;
}

export async function getDonation(id: string) {
  const [row] = await db()
    .select()
    .from(donations)
    .where(and(eq(donations.id, id), activeDonations))
    .limit(1);
  return row ?? null;
}

/** Single donation plus the recorder's name, for the receipt PDF. */
export async function getDonationForReceipt(id: string) {
  const [row] = await db()
    .select({
      id: donations.id,
      donorName: donations.donorName,
      address: donations.address,
      phone: donations.phone,
      amount: donations.amount,
      donationType: donations.donationType,
      itemDescription: donations.itemDescription,
      otherDescription: donations.otherDescription,
      donationDate: donations.donationDate,
      remarks: donations.remarks,
      createdBy: donations.createdBy,
      createdByName: users.fullName,
    })
    .from(donations)
    .leftJoin(users, eq(users.id, donations.createdBy))
    .where(and(eq(donations.id, id), activeDonations))
    .limit(1);
  return row ?? null;
}

export async function updateDonation(id: string, input: DonationInput) {
  await db()
    .update(donations)
    .set({
      ...input,
      updatedAt: new Date(),
      donationType: input.donationType ?? "cash",
      itemDescription: input.itemDescription ?? null,
      otherDescription: input.otherDescription ?? null,
    })
    .where(and(eq(donations.id, id), activeDonations));
}

export async function softDeleteDonation(id: string) {
  await db()
    .update(donations)
    .set({ deletedAt: new Date() })
    .where(and(eq(donations.id, id), activeDonations));
}

export type SortColumn = "donationDate" | "donorName" | "address" | "amount";
export type SortOrder = "asc" | "desc";

export type DonationFilters = {
  q?: string;
  from?: string;
  to?: string;
  donationType?: "cash" | "non_cash" | "other";
  minAmt?: string;
  maxAmt?: string;
  page: number;
  pageSize: number;
  sort?: SortColumn;
  order?: SortOrder;
};

export async function listDonations({
  q,
  from,
  to,
  donationType,
  minAmt,
  maxAmt,
  page,
  pageSize,
  sort,
  order,
}: DonationFilters) {
  const conds: SQL[] = [activeDonations];
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    conds.push(
      or(ilike(donations.donorName, like), ilike(donations.phone, like))!,
    );
  }
  if (from) conds.push(gte(donations.donationDate, from));
  if (to) conds.push(lte(donations.donationDate, to));
  if (donationType) conds.push(eq(donations.donationType, donationType));
  if (minAmt) conds.push(gte(donations.amount, minAmt));
  if (maxAmt) conds.push(lte(donations.amount, maxAmt));
  const where = and(...conds);

  // Build ORDER BY: primary sort on the requested column, secondary always createdAt DESC.
  const dir = order === "asc" ? asc : desc;
  const colMap = {
    donationDate: donations.donationDate,
    donorName: donations.donorName,
    address: donations.address,
    amount: donations.amount,
  } as const;
  const primarySort = sort ? dir(colMap[sort]) : desc(donations.createdAt);
  const orderBy =
    sort && sort !== "donationDate"
      ? [primarySort, desc(donations.createdAt)]
      : [primarySort];

  const [rows, [total]] = await Promise.all([
    db()
      .select({
        id: donations.id,
        donorName: donations.donorName,
        address: donations.address,
        phone: donations.phone,
        amount: donations.amount,
        donationType: donations.donationType,
        itemDescription: donations.itemDescription,
        otherDescription: donations.otherDescription,
        donationDate: donations.donationDate,
        remarks: donations.remarks,
        createdAt: donations.createdAt,
        createdByName: users.fullName,
      })
      .from(donations)
      .leftJoin(users, eq(users.id, donations.createdBy))
      .where(where)
      .orderBy(...orderBy)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db().select({ n: count() }).from(donations).where(where),
  ]);
  return { rows, total: total?.n ?? 0 };
}
