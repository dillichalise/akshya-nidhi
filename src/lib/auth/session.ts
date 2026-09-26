import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/env";
import { getUserById } from "@/db/queries/users";
import type { Role } from "@/db/schema";
import { can, homePathFor, type Permission } from "./permissions";

const COOKIE = "session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SessionUser = { id: string; username: string; fullName: string; role: Role };

const key = () => new TextEncoder().encode(env().SESSION_SECRET);

export async function createSession(userId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(key());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

/**
 * The signed-in user, or null. The role and active flag are always re-read from the
 * database, so demoting or deactivating a user takes effect immediately.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    const user = await getUserById(payload.sub);
    if (!user || !user.isActive) return null;
    return { id: user.id, username: user.username, fullName: user.fullName, role: user.role };
  } catch {
    return null;
  }
});

/** For pages/layouts: redirects to /login when signed out. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For pages: redirects to the role's home page when the permission is missing. */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) redirect(homePathFor(user.role));
  return user;
}

/** For server actions / route handlers: returns the user, or null if not allowed. */
export async function authorize(permission: Permission): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  return user && can(user.role, permission) ? user : null;
}
