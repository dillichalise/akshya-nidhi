import type { Role } from "@/db/schema";

export const PERMISSIONS = [
  "dashboard:view",
  "donation:create",
  "donation:list",
  "donation:edit",
  "donation:delete",
  "user:list",
  "user:manage", // create, edit, activate/deactivate, reset password
  "report:download",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Source of truth for the role matrix (see CLAUDE.md). */
const matrix: Record<Permission, readonly Role[]> = {
  "dashboard:view": ["super_admin", "admin"],
  "donation:create": ["super_admin", "admin", "user"],
  "donation:list": ["super_admin", "admin"],
  "donation:edit": ["super_admin"],
  "donation:delete": ["super_admin"],
  "user:list": ["super_admin", "admin"],
  "user:manage": ["super_admin"],
  "report:download": ["super_admin", "admin"],
};

export function can(role: Role, permission: Permission): boolean {
  return matrix[permission].includes(role);
}

/** Where a role lands after login. */
export function homePathFor(role: Role): string {
  return can(role, "dashboard:view") ? "/dashboard" : "/donations/new";
}
