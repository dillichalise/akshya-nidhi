import { z } from "zod";
import { collapseSpaces, normalizePhone } from "./normalize";

const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._-]{3,32}$/, "username_invalid");
const password = z.string().min(8, "password_short").max(128, "too_long");
const fullName = z
  .string()
  .transform(collapseSpaces)
  .pipe(z.string().min(1, "required").max(120, "too_long"));
const role = z.enum(["super_admin", "admin", "user"], { error: "required" });
const phone = z
  .string()
  .transform(normalizePhone)
  .pipe(
    z
      .string()
      .min(1, "required")
      .regex(/^\d{7,15}$/, "phone_invalid"),
  );

export const createUserSchema = z.object({
  username,
  fullName,
  phone,
  password,
  role,
});
export const updateUserSchema = z.object({
  fullName,
  phone,
  role,
  isActive: z.boolean(),
});
export const resetPasswordSchema = z.object({ password });
export const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, "required"),
  password: z.string().min(1, "required"),
});
