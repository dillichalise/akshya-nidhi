import "server-only";
import { and, asc, count, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { users, type Role } from "@/db/schema";

// Explicit columns: password_hash must never leak outside the auth lookup.
const publicColumns = {
  id: users.id,
  username: users.username,
  fullName: users.fullName,
  role: users.role,
  isActive: users.isActive,
  createdAt: users.createdAt,
};

export async function getUserById(id: string) {
  const [row] = await db().select(publicColumns).from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}

/** Auth-only lookup that includes the password hash. */
export async function findUserForLogin(username: string) {
  const [row] = await db()
    .select({ ...publicColumns, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return row ?? null;
}

export function listUsers() {
  return db().select(publicColumns).from(users).orderBy(asc(users.createdAt));
}

export async function createUser(input: {
  username: string;
  fullName: string;
  passwordHash: string;
  role: Role;
}) {
  const [row] = await db().insert(users).values(input).returning({ id: users.id });
  return row;
}

export async function updateUser(id: string, input: { fullName: string; role: Role; isActive: boolean }) {
  await db()
    .update(users)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(users.id, id));
}

export async function setUserPassword(id: string, passwordHash: string) {
  await db().update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, id));
}

/** Active super_admins other than `excludeId` — used to protect the last one. */
export async function countOtherActiveSuperAdmins(excludeId: string) {
  const [row] = await db()
    .select({ n: count() })
    .from(users)
    .where(and(eq(users.role, "super_admin"), eq(users.isActive, true), ne(users.id, excludeId)));
  return row?.n ?? 0;
}
