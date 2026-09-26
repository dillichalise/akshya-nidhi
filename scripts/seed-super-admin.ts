import "dotenv/config";
import { hash } from "@node-rs/argon2";
import { connect } from "../src/db/connect";
import { users } from "../src/db/schema";

// Idempotent: creates the first super_admin only if that username doesn't exist yet.
async function main() {
  const { DATABASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_FULL_NAME } = process.env;
  if (!DATABASE_URL || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
    throw new Error("DATABASE_URL, ADMIN_USERNAME and ADMIN_PASSWORD must be set");
  }
  const username = ADMIN_USERNAME.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) throw new Error("ADMIN_USERNAME is invalid");
  if (ADMIN_PASSWORD.length < 8) throw new Error("ADMIN_PASSWORD must be at least 8 characters");

  const { db, close } = connect(DATABASE_URL);
  const created = await db
    .insert(users)
    .values({
      username,
      fullName: ADMIN_FULL_NAME || "Super Admin",
      passwordHash: await hash(ADMIN_PASSWORD),
      role: "super_admin",
    })
    .onConflictDoNothing({ target: users.username })
    .returning({ id: users.id });
  await close();
  console.log(created.length ? `Created super_admin "${username}".` : `User "${username}" already exists; nothing changed.`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
