import { beforeAll, describe, expect, it } from "vitest";
import { donations } from "@/db/schema";
import { setupTestDb } from "@/test/db";
import { todayInNepal } from "@/lib/format";
import {
  createDonation,
  getDonationForReceipt,
  listDonations,
  softDeleteDonation,
  updateDonation,
} from "./donations";
import {
  getReport,
  getTopDonors,
  getTotals,
  listDonorSummaries,
} from "./reports";
import {
  countOtherActiveSuperAdmins,
  createUser,
  findUserForLogin,
  getUserById,
} from "./users";

let userId: string;
const today = todayInNepal();
const d = (n: number) => {
  const dt = new Date(`${today}T12:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() - n);
  return dt.toISOString().slice(0, 10);
};
const donation = (over: Partial<Parameters<typeof createDonation>[0]>) => ({
  donorName: "Ram Sharma",
  address: "Kathmandu",
  phone: "9841234567",
  donationType: "cash" as const,
  itemDescription: null,
  otherDescription: null,
  amount: "1000",
  donationDate: today,
  remarks: null,
  ...over,
});

beforeAll(async () => {
  await setupTestDb();
  userId = (
    await createUser({
      username: "root",
      fullName: "Root",
      phone: "9800000001",
      passwordHash: "x",
      role: "super_admin",
    })
  ).id;

  await createDonation(donation({ amount: "1000.50" }), userId); // Ram today
  await createDonation(
    donation({ amount: "2000", donationDate: d(1), address: "Old Address" }),
    userId,
  ); // Ram yesterday
  await createDonation(
    donation({ donorName: "ram sharma", amount: "500" }),
    userId,
  ); // same donor, different case
  await createDonation(
    donation({ donorName: "Ram Sharma", phone: "9800000000", amount: "50000" }),
    userId,
  ); // different person, same name
  await createDonation(
    donation({
      donorName: "Sita Karki",
      phone: "9811111111",
      amount: "7000",
      donationDate: d(5),
    }),
    userId,
  );
  const deleted = await createDonation(
    donation({
      donorName: "Deleted Donor",
      phone: "9899999999",
      amount: "999999",
    }),
    userId,
  );
  await softDeleteDonation(deleted.id);
});

describe("users", () => {
  it("stores usernames lowercase-only and never returns the hash from getUserById", async () => {
    await expect(
      createUser({
        username: "Mixed",
        fullName: "X",
        phone: "",
        passwordHash: "x",
        role: "user",
      }),
    ).rejects.toThrow();
    const u = await getUserById(userId);
    expect(u).not.toHaveProperty("passwordHash");
    expect((await findUserForLogin("root"))?.passwordHash).toBe("x");
  });
  it("counts other active super admins", async () => {
    expect(await countOtherActiveSuperAdmins(userId)).toBe(0);
  });
});

describe("donations", () => {
  it("rejects non-positive amounts at the database level", async () => {
    const created = await createDonation(donation({ amount: "0" }), userId).catch(
      () => null,
    );
    if (created) await softDeleteDonation(created.id);
    expect(created).toBeNull();
  });
  it("excludes soft-deleted rows from lists", async () => {
    const { rows, total } = await listDonations({ page: 1, pageSize: 50 });
    expect(rows.some((r) => r.donorName === "Deleted Donor")).toBe(false);
    expect(total).toBe(5);
  });
  it("searches by name or phone", async () => {
    expect(
      (await listDonations({ q: "sita", page: 1, pageSize: 10 })).total,
    ).toBe(1);
    expect(
      (await listDonations({ q: "98111", page: 1, pageSize: 10 })).total,
    ).toBe(1);
  });
  it("combines amount bounds with donation type", async () => {
    const suffix = String(Date.now());
    const donorName = `Amount filter ${suffix}`;
    const phone = `amount-${suffix}`;
    const createdIds: string[] = [];
    try {
      createdIds.push((await createDonation(donation({ donorName, phone, amount: "1250" }), userId)).id);
      createdIds.push((await createDonation(
        donation({ donorName, phone, donationType: "non_cash", itemDescription: "Rice", amount: "1500" }),
        userId,
      )).id);
      createdIds.push((await createDonation(
        donation({ donorName, phone, donationType: "non_cash", itemDescription: "Oil", amount: "2500" }),
        userId,
      )).id);

      const result = await listDonations({
        q: donorName,
        donationType: "non_cash",
        minAmt: "1000",
        maxAmt: "2000",
        page: 1,
        pageSize: 10,
      });
      expect(result.total).toBe(1);
      expect(result.rows[0]).toMatchObject({ donationType: "non_cash", amount: "1500.00" });
    } finally {
      await Promise.all(createdIds.map((id) => softDeleteDonation(id)));
    }
  });
  it("cannot edit a soft-deleted donation", async () => {
    const all = await (await import("@/db")).db().select().from(donations);
    const gone = all.find((r) => r.donorName === "Deleted Donor")!;
    await updateDonation(gone.id, donation({ donorName: "Changed" }));
    const after = await (await import("@/db")).db().select().from(donations);
    expect(after.find((r) => r.id === gone.id)!.donorName).toBe(
      "Deleted Donor",
    );
  });
  it("fetches a single donation with the recorder's name for its receipt", async () => {
    const all = await (await import("@/db")).db().select().from(donations);
    const ram = all.find(
      (r) => r.donorName === "Ram Sharma" && r.amount === "1000.50",
    )!;
    const r = await getDonationForReceipt(ram.id);
    expect(r).toMatchObject({
      donorName: "Ram Sharma",
      amount: "1000.50",
      createdBy: userId,
      createdByName: "Root",
    });
  });
  it("does not return a receipt for a soft-deleted donation", async () => {
    const all = await (await import("@/db")).db().select().from(donations);
    const gone = all.find((r) => r.donorName === "Deleted Donor")!;
    expect(await getDonationForReceipt(gone.id)).toBeNull();
  });
});

describe("reports", () => {
  it("sums a single date and matches its rows (inclusive, soft-deleted excluded)", async () => {
    const r = await getReport(today, today);
    expect(r.count).toBe(3);
    expect(r.total).toBe("51500.50");
    expect(r.rows).toHaveLength(3);
  });
  it("range is inclusive on both ends", async () => {
    const r = await getReport(d(1), today);
    expect(r.count).toBe(4);
    expect(r.total).toBe("53500.50");
    expect((await getReport(d(5), d(5))).total).toBe("7000.00");
  });
  it("empty range gives zero", async () => {
    const r = await getReport("2000-01-01", "2000-01-02");
    expect(r).toMatchObject({ count: 0, total: "0", rows: [] });
  });
  it("groups donor totals and applies type and cash-total filters", async () => {
    const suffix = String(Date.now());
    const donorName = `Summary donor ${suffix}`;
    const phone = `summary-${suffix}`;
    const createdIds: string[] = [];
    try {
      createdIds.push((await createDonation(donation({ donorName, phone, amount: "125.25" }), userId)).id);
      createdIds.push((await createDonation(
        donation({ donorName, phone, donationType: "non_cash", itemDescription: "Rice", amount: "20" }),
        userId,
      )).id);
      createdIds.push((await createDonation(
        donation({ donorName, phone, donationType: "other", otherDescription: "Support", amount: "10" }),
        userId,
      )).id);

      const cashMatches = await listDonorSummaries({
        minTotal: "100",
        maxTotal: "150",
        donationType: "cash",
        from: today,
        to: today,
        page: 1,
        pageSize: 20,
      });
      expect(cashMatches.rows.find((row) => row.phone === phone)).toMatchObject({
        donorName,
        totalCash: "125.25",
        nonCashCount: 1,
        otherCount: 1,
        donationCount: 3,
        lastDonationDate: today,
      });

      const nonCashMatches = await listDonorSummaries({
        donationType: "non_cash",
        from: today,
        to: today,
        page: 1,
        pageSize: 20,
      });
      expect(nonCashMatches.rows.some((row) => row.phone === phone)).toBe(true);
    } finally {
      await Promise.all(createdIds.map((id) => softDeleteDonation(id)));
    }
  });
});

describe("dashboard", () => {
  it("totals use Nepal 'today'", async () => {
    const t = await getTotals();
    expect(t.todayDate).toBe(today);
    expect(t.today).toEqual({ total: "51500.50", count: 3 });
    expect(t.overall).toEqual({ total: "60500.50", count: 5 });
  });
  it("top donors today: grouped by name+phone (case-insensitive), ranked by total", async () => {
    const top = await getTopDonors("today");
    expect(top.map((x) => [x.phone, x.total, x.count])).toEqual([
      ["9800000000", "50000.00", 1],
      ["9841234567", "1500.50", 2],
    ]);
    expect(top[1].items).toHaveLength(2);
  });
  it("top donors overall include earlier days and use the latest address", async () => {
    const top = await getTopDonors("overall");
    expect(top.map((x) => x.total)).toEqual(["50000.00", "7000.00", "3500.50"]);
    const ram = top.find((x) => x.phone === "9841234567")!;
    expect(ram.count).toBe(3);
    expect(ram.address).toBe("Kathmandu"); // most recent donation's address, not "Old Address"
    expect(top.some((x) => x.name === "Deleted Donor")).toBe(false);
  });
});
