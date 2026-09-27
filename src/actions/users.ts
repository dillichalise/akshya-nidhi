"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  countOtherActiveSuperAdmins,
  createUser,
  getUserById,
  setUserPassword,
  updateUser,
} from "@/db/queries/users";
import { hashPassword } from "@/lib/auth/password";
import { authorize } from "@/lib/auth/session";
import {
  createUserSchema,
  resetPasswordSchema,
  updateUserSchema,
} from "@/lib/validation/user";
import {
  type FormState,
  formValues,
  isUniqueViolation,
  zodErrors,
} from "./types";

export async function createUserAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await authorize("user:manage");
  const values = formValues(formData);
  if (!actor)
    return { status: "error", errors: {}, values, message: "errors.forbidden" };

  const parsed = createUserSchema.safeParse({
    ...values,
    password: formData.get("password"),
  });
  if (!parsed.success)
    return { status: "error", errors: zodErrors(parsed.error), values };

  try {
    await createUser({
      username: parsed.data.username,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      role: parsed.data.role,
      passwordHash: await hashPassword(parsed.data.password),
    });
  } catch (err) {
    if (isUniqueViolation(err))
      return {
        status: "error",
        errors: { username: "username_taken" },
        values,
      };
    return { status: "error", errors: {}, values, message: "errors.generic" };
  }
  revalidatePath("/users");
  redirect("/users");
}

export async function updateUserAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await authorize("user:manage");
  const values = formValues(formData);
  if (!actor)
    return { status: "error", errors: {}, values, message: "errors.forbidden" };

  const id = values.id;
  const parsed = updateUserSchema.safeParse({
    fullName: values.fullName,
    phone: values.phone,
    role: values.role,
    isActive: values.isActive === "true",
  });
  if (!id || !parsed.success) {
    return {
      status: "error",
      errors: parsed.success ? {} : zodErrors(parsed.error),
      values,
      message: parsed.success ? "errors.generic" : undefined,
    };
  }
  const target = await getUserById(id);
  if (!target)
    return { status: "error", errors: {}, values, message: "errors.generic" };

  if (id === actor.id && !parsed.data.isActive) {
    return {
      status: "error",
      errors: {},
      values,
      message: "errors.self_lockout",
    };
  }
  // Never remove the last active super_admin (by demotion or deactivation).
  const losesSuperAdmin =
    target.role === "super_admin" &&
    target.isActive &&
    (parsed.data.role !== "super_admin" || !parsed.data.isActive);
  if (losesSuperAdmin && (await countOtherActiveSuperAdmins(id)) === 0) {
    return {
      status: "error",
      errors: {},
      values,
      message: "errors.last_super_admin",
    };
  }
  await updateUser(id, parsed.data);
  revalidatePath("/users");
  return { status: "success", errors: {}, values, message: "users.updated" };
}

export async function resetPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await authorize("user:manage");
  const id = String(formData.get("id") ?? "");
  if (!actor)
    return {
      status: "error",
      errors: {},
      values: {},
      message: "errors.forbidden",
    };

  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
  });
  if (!id || !parsed.success) {
    return {
      status: "error",
      errors: parsed.success ? {} : zodErrors(parsed.error),
      values: {},
      message: parsed.success ? "errors.generic" : undefined,
    };
  }
  await setUserPassword(id, await hashPassword(parsed.data.password));
  return {
    status: "success",
    errors: {},
    values: {},
    message: "users.resetDone",
  };
}
