"use server";
import { redirect } from "next/navigation";
import { findUserForLogin } from "@/db/queries/users";
import { verifyPassword } from "@/lib/auth/password";
import { homePathFor } from "@/lib/auth/permissions";
import { createSession, destroySession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/user";
import { type FormState, zodErrors } from "./types";

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const username = String(formData.get("username") ?? "");
  const parsed = loginSchema.safeParse({ username, password: formData.get("password") });
  if (!parsed.success) {
    return { status: "error", errors: zodErrors(parsed.error), values: { username } };
  }
  const user = await findUserForLogin(parsed.data.username);
  const ok = await verifyPassword(user?.passwordHash ?? null, parsed.data.password);
  // Same generic message for unknown user, wrong password and inactive account.
  if (!user || !ok || !user.isActive) {
    return { status: "error", errors: {}, values: { username }, message: "login.invalid" };
  }
  await createSession(user.id);
  redirect(homePathFor(user.role));
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
