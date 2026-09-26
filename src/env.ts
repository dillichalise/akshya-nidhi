import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
});

let cached: z.infer<typeof schema> | undefined;

/** Validated env, read lazily so `next build` doesn't need secrets. */
export function env() {
  cached ??= schema.parse(process.env);
  return cached;
}
