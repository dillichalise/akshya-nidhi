import "server-only";
import { and, desc, eq, gte, ilike, isNull, lte, or, count, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { donations, users } from "@/db/schema";
import type { DonationInput } from "@/lib/validation/donation";

/** Every read of donations MUST include this — soft-deleted rows never count. */
export const activeDonations = isNull(donations.deletedAt);

export async function createDonation(input: DonationInput, createdBy: string) {
  const [row] = await db()
    .insert(donations)
    .values({ ...input, createdBy })
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
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(donations.id, id), activeDonations));
}

export async function softDeleteDonation(id: string) {
  await db()
    .update(donations)
    .set({ deletedAt: new Date() })
    .where(and(eq(donations.id, id), activeDonations));
}

export type DonationFilters = { q?: string; from?: string; to?: string; page: number; pageSize: number };

export async function listDonations({ q, from, to, page, pageSize }: DonationFilters) {
  const conds: SQL[] = [activeDonations];
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    conds.push(or(ilike(donations.donorName, like), ilike(donations.phone, like))!);
  }
  if (from) conds.push(gte(donations.donationDate, from));
  if (to) conds.push(lte(donations.donationDate, to));
  const where = and(...conds);

  const [rows, [total]] = await Promise.all([
    db()
      .select({
        id: donations.id,
        donorName: donations.donorName,
        address: donations.address,
        phone: donations.phone,
        amount: donations.amount,
        donationDate: donations.donationDate,
        remarks: donations.remarks,
        createdAt: donations.createdAt,
        createdByName: users.fullName,
      })
      .from(donations)
      .leftJoin(users, eq(users.id, donations.createdBy))
      .where(where)
      .orderBy(desc(donations.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db().select({ n: count() }).from(donations).where(where),
  ]);
  return { rows, total: total?.n ?? 0 };
}
