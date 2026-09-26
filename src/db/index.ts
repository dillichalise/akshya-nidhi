import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { env } from "@/env";
import * as schema from "./schema";

type Db = NeonHttpDatabase<typeof schema>;
let _db: Db | undefined;

/** Lazily-created Drizzle client (Neon HTTP driver — good fit for serverless). */
export function db(): Db {
  _db ??= drizzle(neon(env().DATABASE_URL), { schema });
  return _db;
}

/** Test hook: lets query tests run against an in-process Postgres (PGlite). */
export function __setDbForTests(instance: unknown) {
  _db = instance as Db;
}
