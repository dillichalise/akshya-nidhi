import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/db/schema";
import { __setDbForTests } from "@/db";

/** Fresh in-memory Postgres with the real migrations applied, wired in as db(). */
export async function setupTestDb() {
  const client = new PGlite();
  const dir = path.resolve(__dirname, "../../drizzle");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    for (const stmt of readFileSync(path.join(dir, file), "utf8").split("--> statement-breakpoint")) {
      if (stmt.trim()) await client.exec(stmt);
    }
  }
  const testDb = drizzle(client, { schema });
  __setDbForTests(testDb);
  return testDb;
}
