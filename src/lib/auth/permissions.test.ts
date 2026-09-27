import { describe, expect, it } from "vitest";
import { can, homePathFor, PERMISSIONS, type Permission } from "./permissions";
import type { Role } from "@/db/schema";

const expected: Record<Permission, Role[]> = {
  "dashboard:view": ["super_admin", "admin"],
  "donation:create": ["super_admin", "admin", "user"],
  "donation:list": ["super_admin", "admin"],
  "donation:edit": ["super_admin"],
  "donation:delete": ["super_admin"],
  "donation:receipt": ["super_admin", "admin", "user"],
  "user:list": ["super_admin", "admin"],
  "user:manage": ["super_admin"],
  "report:download": ["super_admin", "admin"],
};

describe("permission matrix", () => {
  const roles: Role[] = ["super_admin", "admin", "user"];
  for (const p of PERMISSIONS) {
    for (const r of roles) {
      it(`${r} ${expected[p].includes(r) ? "can" : "cannot"} ${p}`, () => {
        expect(can(r, p)).toBe(expected[p].includes(r));
      });
    }
  }

  it("routes roles to the right home page", () => {
    expect(homePathFor("super_admin")).toBe("/dashboard");
    expect(homePathFor("admin")).toBe("/dashboard");
    expect(homePathFor("user")).toBe("/donations/new");
  });
});
