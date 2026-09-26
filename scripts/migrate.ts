import "dotenv/config";
import { migrate as migrateNeon } from "drizzle-orm/neon-http/migrator";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { connect, isLocalUrl } from "../src/db/connect";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const { db, close } = connect(url);
  const folder = { migrationsFolder: "./drizzle" };
  if (isLocalUrl(url)) await migratePg(db as unknown as NodePgDatabase, folder);
  else await migrateNeon(db, folder);
  await close();
  console.log(`Migrations applied (${isLocalUrl(url) ? "local" : "remote"} database).`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
