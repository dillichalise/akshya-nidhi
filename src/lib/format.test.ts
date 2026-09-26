import { describe, expect, it } from "vitest";
import { formatDate, formatNPR, todayInNepal } from "./format";

describe("formatNPR", () => {
  it("uses lakh/crore grouping", () => {
    expect(formatNPR("125000")).toBe("Rs 1,25,000.00");
    expect(formatNPR("12345678.5")).toBe("Rs 1,23,45,678.50");
    expect(formatNPR("0")).toBe("Rs 0.00");
  });
});

describe("todayInNepal", () => {
  it("rolls the date over at Nepal midnight (UTC+5:45)", () => {
    // 18:14 UTC = 23:59 NPT -> still the same day
    expect(todayInNepal(new Date("2026-09-26T18:14:00Z"))).toBe("2026-09-26");
    // 18:15 UTC = 00:00 NPT next day
    expect(todayInNepal(new Date("2026-09-26T18:15:00Z"))).toBe("2026-09-27");
  });
});

describe("formatDate", () => {
  it("formats AD dates without shifting the day", () => {
    expect(formatDate("2026-09-26")).toContain("26");
    expect(formatDate("2026-09-26")).toContain("2026");
    expect(formatDate("2026-09-26")).toBe("26 Sep 2026");
    expect(formatDate("2026-01-01", "ne")).toMatch(/^1 .+ 2026$/);
  });
});
