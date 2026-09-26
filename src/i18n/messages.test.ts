import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import ne from "@/messages/ne.json";

function keys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? keys(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe("translations", () => {
  it("en.json and ne.json have identical keys", () => {
    expect(keys(ne).sort()).toEqual(keys(en).sort());
  });
});
