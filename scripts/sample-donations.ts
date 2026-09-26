import "dotenv/config";
import { and, eq, like } from "drizzle-orm";
import { connect } from "../src/db/connect";
import { donations, users } from "../src/db/schema";

// Adds (or removes) clearly-tagged sample donations for demos/testing.
//   npm run db:sample          -> insert 100 sample donations
//   npm run db:sample -- 250   -> insert 250
//   npm run db:sample -- --remove -> permanently delete ONLY rows tagged as samples
const TAG = "[sample]";

const first = ["Ram", "Sita", "Hari", "Gita", "Krishna", "Radha", "Bishnu", "Laxmi", "Suresh", "Sunita", "Bikash", "Anita", "Rajesh", "Kamala", "Prakash", "Mina", "Dipak", "Sarita", "Ganesh", "Puja", "Nabin", "Rekha", "Sagar", "Binita", "Kiran", "Maya", "Deepak", "Sabina", "Umesh", "Shanti"];
const last = ["Sharma", "Karki", "Thapa", "Adhikari", "Gurung", "Shrestha", "Rai", "Tamang", "Poudel", "Bhandari", "Khadka", "Basnet", "Magar", "Koirala", "Acharya", "Pandey", "Dahal", "Regmi", "Lama", "Neupane"];
const places = ["Kathmandu-10, Baneshwor", "Lalitpur-3, Jawalakhel", "Bhaktapur-5, Suryabinayak", "Pokhara-8, Lakeside", "Biratnagar-4, Rani", "Butwal-6, Traffic Chowk", "Chitwan-2, Bharatpur", "Dharan-9, Bhanu Chowk", "Hetauda-4, Bazar", "Janakpur-7, Station Road", "Birgunj-12, Adarsha Nagar", "Nepalgunj-3, Surkhet Road", "Kathmandu-16, Kalanki", "Kathmandu-32, Boudha", "Lalitpur-14, Patan"];

const rand = (n: number) => Math.floor(Math.random() * n);
const pick = <T,>(a: T[]) => a[rand(a.length)];
const phone = () => `98${[0, 1, 2, 4, 5, 6][rand(6)]}${String(rand(10_000_000)).padStart(7, "0")}`;

function nepalDate(daysAgo: number) {
  const d = new Date(Date.now() - daysAgo * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu" }).format(d);
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const { db, close } = connect(process.env.DATABASE_URL);
  const arg = process.argv[2];

  if (arg === "--remove") {
    const removed = await db.delete(donations).where(like(donations.remarks, `${TAG}%`)).returning({ id: donations.id });
    console.log(`Removed ${removed.length} sample donations.`);
    await close();
    return;
  }

  const count = Number(arg ?? 100);
  if (!Number.isInteger(count) || count < 1 || count > 1000) throw new Error("Count must be 1–1000");

  const [admin] = await db.select({ id: users.id }).from(users).where(and(eq(users.role, "super_admin"), eq(users.isActive, true))).limit(1);
  if (!admin) throw new Error("No active super_admin found — run `npm run db:seed` first");

  // A pool of donors smaller than the record count, so some donate several times (shows the ×N badge).
  const donors = Array.from({ length: Math.ceil(count * 0.6) }, () => ({
    name: `${pick(first)} ${pick(last)}`,
    address: pick(places),
    phone: phone(),
  }));
  const amounts = [100, 200, 250, 500, 500, 1000, 1000, 1500, 2000, 2500, 5000, 5000, 10000, 25000, 50000];

  const rows = Array.from({ length: count }, (_, i) => {
    const donor = donors[i < donors.length ? i : rand(donors.length)];
    return {
      donorName: donor.name,
      address: donor.address,
      phone: donor.phone,
      amount: (pick(amounts) + (rand(4) === 0 ? rand(100) : 0)).toFixed(2),
      // Mostly recent, with a handful today so the "today" dashboard has data.
      donationDate: nepalDate(rand(5) === 0 ? 0 : rand(60)),
      remarks: `${TAG} ${pick(["Monthly donation", "Festival offering", "In memory of family", "General fund", "Temple maintenance", "Education fund"])}`,
      createdBy: admin.id,
    };
  });

  for (let i = 0; i < rows.length; i += 50) await db.insert(donations).values(rows.slice(i, i + 50));
  const total = rows.reduce((s, r) => s + Number(r.amount), 0);
  console.log(`Inserted ${rows.length} sample donations (${donors.length} distinct donors), total Rs ${total.toLocaleString("en-IN")}.`);
  await close();
  console.log(`Remove later with: npm run db:sample -- --remove`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
