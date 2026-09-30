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
  count,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import { expenditures, users } from "@/db/schema";
import type { ExpenditureInput } from "@/lib/validation/expenditure";

/** Every read of expenditures MUST include this — soft-deleted rows never count. */
export const activeExpenditures = isNull(expenditures.deletedAt);

/** net spend = amount − returnAmount, computed in SQL as numeric. */
export const netSpend = sql<string>`(${expenditures.amount} - ${expenditures.returnAmount})::text`;

export async function createExpenditure(
  input: ExpenditureInput,
  createdBy: string,
) {
  const [row] = await db()
    .insert(expenditures)
    .values({ ...input, createdBy })
    .returning({ id: expenditures.id });
  return row;
}

export async function getExpenditure(id: string) {
  const [row] = await db()
    .select()
    .from(expenditures)
    .where(and(eq(expenditures.id, id), activeExpenditures))
    .limit(1);
  return row ?? null;
}

export async function updateExpenditure(id: string, input: ExpenditureInput) {
  await db()
    .update(expenditures)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(expenditures.id, id), activeExpenditures));
}

export async function softDeleteExpenditure(id: string) {
  await db()
    .update(expenditures)
    .set({ deletedAt: new Date() })
    .where(and(eq(expenditures.id, id), activeExpenditures));
}

export type ExpenditureSortColumn =
  | "expenditureDate"
  | "title"
  | "amount"
  | "returnAmount";
export type SortOrder = "asc" | "desc";

export type ExpenditureFilters = {
  q?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
  sort?: ExpenditureSortColumn;
  order?: SortOrder;
};

export async function listExpenditures({
  q,
  from,
  to,
  page,
  pageSize,
  sort,
  order,
}: ExpenditureFilters) {
  const conds: SQL[] = [activeExpenditures];
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    conds.push(ilike(expenditures.title, like));
  }
  if (from) conds.push(gte(expenditures.expenditureDate, from));
  if (to) conds.push(lte(expenditures.expenditureDate, to));
  const where = and(...conds);

  const dir = order === "asc" ? asc : desc;
  const colMap = {
    expenditureDate: expenditures.expenditureDate,
    title: expenditures.title,
    amount: expenditures.amount,
    returnAmount: expenditures.returnAmount,
  } as const;
  const primarySort = sort ? dir(colMap[sort]) : desc(expenditures.createdAt);
  const orderBy =
    sort && sort !== "expenditureDate"
      ? [primarySort, desc(expenditures.createdAt)]
      : [primarySort];

  // Aggregates for the totals footer
  const sumAmount = sql<string>`coalesce(sum(${expenditures.amount}), 0)::text`;
  const sumReturn = sql<string>`coalesce(sum(${expenditures.returnAmount}), 0)::text`;
  const sumNet = sql<string>`coalesce(sum(${expenditures.amount} - ${expenditures.returnAmount}), 0)::text`;

  const [rows, [totals], [totalCount]] = await Promise.all([
    db()
      .select({
        id: expenditures.id,
        title: expenditures.title,
        amount: expenditures.amount,
        returnAmount: expenditures.returnAmount,
        expenditureDate: expenditures.expenditureDate,
        remarks: expenditures.remarks,
        createdAt: expenditures.createdAt,
        createdByName: users.fullName,
      })
      .from(expenditures)
      .leftJoin(users, eq(users.id, expenditures.createdBy))
      .where(where)
      .orderBy(...orderBy)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db()
      .select({ totalAmount: sumAmount, totalReturn: sumReturn, totalNet: sumNet })
      .from(expenditures)
      .where(where),
    db().select({ n: count() }).from(expenditures).where(where),
  ]);

  return {
    rows,
    total: totalCount?.n ?? 0,
    totals: {
      amount: totals?.totalAmount ?? "0",
      returnAmount: totals?.totalReturn ?? "0",
      net: totals?.totalNet ?? "0",
    },
  };
}

/** All active expenditure rows for a date range (used by report downloads — no pagination). */
export async function getExpenditureReport(from: string, to: string) {
  const range = and(
    activeExpenditures,
    gte(expenditures.expenditureDate, from),
    lte(expenditures.expenditureDate, to),
  );
  const sumAmount = sql<string>`coalesce(sum(${expenditures.amount}), 0)::text`;
  const sumReturn = sql<string>`coalesce(sum(${expenditures.returnAmount}), 0)::text`;
  const sumNet = sql<string>`coalesce(sum(${expenditures.amount} - ${expenditures.returnAmount}), 0)::text`;

  const [rows, [agg]] = await Promise.all([
    db()
      .select({
        id: expenditures.id,
        title: expenditures.title,
        amount: expenditures.amount,
        returnAmount: expenditures.returnAmount,
        expenditureDate: expenditures.expenditureDate,
        remarks: expenditures.remarks,
        createdByName: users.fullName,
      })
      .from(expenditures)
      .leftJoin(users, eq(users.id, expenditures.createdBy))
      .where(range)
      .orderBy(asc(expenditures.expenditureDate), asc(expenditures.createdAt)),
    db()
      .select({ totalAmount: sumAmount, totalReturn: sumReturn, totalNet: sumNet, n: count() })
      .from(expenditures)
      .where(range),
  ]);

  return {
    rows,
    count: agg?.n ?? 0,
    totals: {
      amount: agg?.totalAmount ?? "0",
      returnAmount: agg?.totalReturn ?? "0",
      net: agg?.totalNet ?? "0",
    },
  };
}
