/**
 * Inserts random sample donations spread across the event window:
 *   23 Ashoj 2083 → 05 Kartik 2083  (2026-10-09 → 2026-10-22, 14 days)
 *
 * Usage:
 *   pnpm tsx scripts/seed-event-donations.ts          # 150 donations
 *   pnpm tsx scripts/seed-event-donations.ts 300      # custom count
 *   pnpm tsx scripts/seed-event-donations.ts --remove # delete only these rows
 */
import "dotenv/config";
import { like } from "drizzle-orm";
import { and, eq } from "drizzle-orm";
import { connect } from "../src/db/connect";
import { donations, users } from "../src/db/schema";

const TAG = "[event-2083]";

// ── Donor name pool ──────────────────────────────────────────────────────────
const first = [
  "Ram",
  "Sita",
  "Hari",
  "Gita",
  "Krishna",
  "Radha",
  "Bishnu",
  "Laxmi",
  "Suresh",
  "Sunita",
  "Bikash",
  "Anita",
  "Rajesh",
  "Kamala",
  "Prakash",
  "Mina",
  "Dipak",
  "Sarita",
  "Ganesh",
  "Puja",
  "Nabin",
  "Rekha",
  "Sagar",
  "Binita",
  "Kiran",
  "Maya",
  "Deepak",
  "Sabina",
  "Umesh",
  "Shanti",
  "Arjun",
  "Parbati",
  "Mohan",
  "Durga",
  "Santosh",
  "Rupa",
  "Nirajan",
  "Kabita",
  "Bikas",
  "Champa",
  "Tulsi",
  "Indra",
  "Samjhana",
  "Rajan",
  "Bimala",
  "Pradeep",
  "Nirmala",
  "Shyam",
  "Babita",
  "Govind",
];
const last = [
  "Sharma",
  "Karki",
  "Thapa",
  "Adhikari",
  "Gurung",
  "Shrestha",
  "Rai",
  "Tamang",
  "Poudel",
  "Bhandari",
  "Khadka",
  "Basnet",
  "Magar",
  "Koirala",
  "Acharya",
  "Pandey",
  "Dahal",
  "Regmi",
  "Lama",
  "Neupane",
  "Bhattarai",
  "Chaudhary",
  "Joshi",
  "Giri",
  "Subedi",
  "Oli",
  "Bohara",
  "Dhakal",
];
const places = [
  "Kathmandu-10, Baneshwor",
  "Lalitpur-3, Jawalakhel",
  "Bhaktapur-5, Suryabinayak",
  "Pokhara-8, Lakeside",
  "Biratnagar-4, Rani",
  "Butwal-6, Traffic Chowk",
  "Chitwan-2, Bharatpur",
  "Dharan-9, Bhanu Chowk",
  "Hetauda-4, Bazar",
  "Janakpur-7, Station Road",
  "Birgunj-12, Adarsha Nagar",
  "Nepalgunj-3, Surkhet Road",
  "Kathmandu-16, Kalanki",
  "Kathmandu-32, Boudha",
  "Lalitpur-14, Patan",
  "Gorkha-4, Bazar",
  "Kaski-9, Pokhara",
  "Syangja-3, Waling",
  "Nawalparasi-6, Kawasoti",
  "Rupandehi-11, Butwal",
];
const remarks = [
  "Festival offering",
  "In honour of ancestors",
  "For temple maintenance",
  "Dashain pujas",
  "Monthly pledge",
  "Family offering",
  "General fund",
  "In memory of parents",
  "Education fund",
  "Community support",
  "Navratri offering",
  "Annual contribution",
  "Vijaya Dashami blessing",
];

// ── Event date pool (all 14 days) ────────────────────────────────────────────
// 2083 Ashoj has 31 days (unlike 2081 which had 30).
// Weighted so peak festival days get more donations; flanking days lighter.
const EVENT_DATES: { ad: string; weight: number }[] = [
  { ad: "2026-10-09", weight: 3 }, // Ashoj 23
  { ad: "2026-10-10", weight: 4 }, // Ashoj 24
  { ad: "2026-10-11", weight: 8 }, // Ashoj 25  ← peak window starts
  { ad: "2026-10-12", weight: 9 }, // Ashoj 26
  { ad: "2026-10-13", weight: 10 }, // Ashoj 27
  { ad: "2026-10-14", weight: 10 }, // Ashoj 28
  { ad: "2026-10-15", weight: 9 }, // Ashoj 29
  { ad: "2026-10-16", weight: 8 }, // Ashoj 30
  { ad: "2026-10-17", weight: 8 }, // Ashoj 31
  { ad: "2026-10-18", weight: 9 }, // Kartik 01
  { ad: "2026-10-19", weight: 10 }, // Kartik 02
  { ad: "2026-10-20", weight: 10 }, // Kartik 03  ← peak window ends
  { ad: "2026-10-21", weight: 4 }, // Kartik 04
  { ad: "2026-10-22", weight: 3 }, // Kartik 05
];

// Build a weighted pool to pick from
const datePool: string[] = [];
for (const { ad, weight } of EVENT_DATES) {
  for (let i = 0; i < weight; i++) datePool.push(ad);
}

// Amount distribution: realistic mix of small, medium, large donations
const amounts = [
  100, 100, 200, 200, 200, 250, 500, 500, 500, 500, 1000, 1000, 1000, 1500,
  2000, 2000, 2500, 5000, 5000, 10000, 10000, 25000, 50000, 100000,
];

const rand = (n: number) => Math.floor(Math.random() * n);
const pick = <T>(a: T[]) => a[rand(a.length)];
const phone = () =>
  `98${[0, 1, 2, 4, 5, 6][rand(6)]}${String(rand(10_000_000)).padStart(7, "0")}`;

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const { db, close } = connect(process.env.DATABASE_URL);
  const arg = process.argv[2];

  if (arg === "--remove") {
    const removed = await db
      .delete(donations)
      .where(like(donations.remarks, `${TAG}%`))
      .returning({ id: donations.id });
    console.log(`Removed ${removed.length} event donations.`);
    await close();
    return;
  }

  const count = Number(arg ?? 150);
  if (!Number.isInteger(count) || count < 1 || count > 2000) {
    throw new Error("Count must be 1–2000");
  }

  const [admin] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "super_admin"), eq(users.isActive, true)))
    .limit(1);
  if (!admin)
    throw new Error("No active super_admin — run `pnpm db:seed` first");

  // Donor pool: ~60% of count, so some donors appear multiple times
  const donors = Array.from(
    { length: Math.max(Math.ceil(count * 0.6), 10) },
    () => ({
      name: `${pick(first)} ${pick(last)}`,
      address: pick(places),
      phone: phone(),
    }),
  );

  const rows = Array.from({ length: count }, (_, i) => {
    const donor = donors[i < donors.length ? i : rand(donors.length)];
    const baseAmount = pick(amounts);
    const topup = rand(5) === 0 ? rand(50) * 10 : 0;
    return {
      donorName: donor.name,
      address: donor.address,
      phone: donor.phone,
      amount: (baseAmount + topup).toFixed(2),
      donationDate: pick(datePool),
      remarks: `${TAG} ${pick(remarks)}`,
      createdBy: admin.id,
    };
  });

  // Insert in batches of 50
  for (let i = 0; i < rows.length; i += 50) {
    await db.insert(donations).values(rows.slice(i, i + 50));
  }

  const total = rows.reduce((s, r) => s + Number(r.amount), 0);

  // Print per-day summary
  const byDate: Record<string, { count: number; total: number }> = {};
  for (const r of rows) {
    byDate[r.donationDate] ??= { count: 0, total: 0 };
    byDate[r.donationDate].count++;
    byDate[r.donationDate].total += Number(r.amount);
  }
  console.log("\nPer-day breakdown:");
  for (const d of EVENT_DATES) {
    const s = byDate[d.ad] ?? { count: 0, total: 0 };
    console.log(
      `  ${d.ad}  ${s.count.toString().padStart(3)} donations  Rs ${s.total.toLocaleString("en-IN")}`,
    );
  }
  console.log(
    `\nInserted ${rows.length} event donations (${donors.length} donor pool).`,
  );
  console.log(`Grand total: Rs ${total.toLocaleString("en-IN")}`);
  console.log(
    `\nRemove later with: pnpm tsx scripts/seed-event-donations.ts --remove`,
  );

  await close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
