import { beforeAll, describe, expect, it } from "vitest";
import { donations } from "@/db/schema";
import { setupTestDb } from "@/test/db";
import { todayInNepal } from "@/lib/format";
import { createDonation, listDonations, softDeleteDonation, updateDonation } from "./donations";
import { getReport, getTopDonors, getTotals } from "./reports";
import { countOtherActiveSuperAdmins, createUser, findUserForLogin, getUserById } from "./users";

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
  amount: "1000",
  donationDate: today,
  remarks: null,
  ...over,
});

beforeAll(async () => {
  await setupTestDb();
  userId = (await createUser({ username: "root", fullName: "Root", passwordHash: "x", role: "super_admin" })).id;

  await createDonation(donation({ amount: "1000.50" }), userId); // Ram today
  await createDonation(donation({ amount: "2000", donationDate: d(1), address: "Old Address" }), userId); // Ram yesterday
  await createDonation(donation({ donorName: "ram sharma", amount: "500" }), userId); // same donor, different case
  await createDonation(donation({ donorName: "Ram Sharma", phone: "9800000000", amount: "50000" }), userId); // different person, same name
  await createDonation(donation({ donorName: "Sita Karki", phone: "9811111111", amount: "7000", donationDate: d(5) }), userId);
  const deleted = await createDonation(donation({ donorName: "Deleted Donor", phone: "9899999999", amount: "999999" }), userId);
  await softDeleteDonation(deleted.id);
});

describe("users", () => {
  it("stores usernames lowercase-only and never returns the hash from getUserById", async () => {
    await expect(createUser({ username: "Mixed", fullName: "X", passwordHash: "x", role: "user" })).rejects.toThrow();
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
    await expect(createDonation(donation({ amount: "0" }), userId)).rejects.toThrow();
  });
  it("excludes soft-deleted rows from lists", async () => {
    const { rows, total } = await listDonations({ page: 1, pageSize: 50 });
    expect(rows.some((r) => r.donorName === "Deleted Donor")).toBe(false);
    expect(total).toBe(5);
  });
  it("searches by name or phone", async () => {
    expect((await listDonations({ q: "sita", page: 1, pageSize: 10 })).total).toBe(1);
    expect((await listDonations({ q: "98111", page: 1, pageSize: 10 })).total).toBe(1);
  });
  it("cannot edit a soft-deleted donation", async () => {
    const all = await (await import("@/db")).db().select().from(donations);
    const gone = all.find((r) => r.donorName === "Deleted Donor")!;
    await updateDonation(gone.id, donation({ donorName: "Changed" }));
    const after = await (await import("@/db")).db().select().from(donations);
    expect(after.find((r) => r.id === gone.id)!.donorName).toBe("Deleted Donor");
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
