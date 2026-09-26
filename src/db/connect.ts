import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Db = NeonHttpDatabase<typeof schema>;

/** Local development databases (e.g. pgAdmin/Homebrew Postgres) use plain TCP, not Neon's HTTP proxy. */
export function isLocalUrl(url: string): boolean {
  try {
    return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * Neon URL -> Neon HTTP driver (serverless-friendly).
 * Local URL -> node-postgres pool. Both expose the same Drizzle query API,
 * so the rest of the code doesn't care which one it got.
 */
export function connect(url: string): { db: Db; close: () => Promise<void> } {
  if (isLocalUrl(url)) {
    const pool = new Pool({ connectionString: url, max: 5 });
    return { db: drizzlePg(pool, { schema }) as unknown as Db, close: () => pool.end() };
  }
  return { db: drizzleNeon(neon(url), { schema }), close: async () => {} };
}
