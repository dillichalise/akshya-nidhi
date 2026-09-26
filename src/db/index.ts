import "server-only";
import { env } from "@/env";
import { connect, type Db } from "./connect";

// Kept on globalThis so Next's dev-mode hot reloading doesn't open a new pool on every edit.
const globalForDb = globalThis as unknown as { __db?: Db };

/** Lazily-created Drizzle client (Neon HTTP in the cloud, node-postgres for a local DB). */
export function db(): Db {
  globalForDb.__db ??= connect(env().DATABASE_URL).db;
  return globalForDb.__db;
}

/** Test hook: lets query tests run against an in-process Postgres (PGlite). */
export function __setDbForTests(instance: unknown) {
  globalForDb.__db = instance as Db;
}
