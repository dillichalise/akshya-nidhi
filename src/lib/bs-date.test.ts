import { describe, expect, it } from "vitest";
import { adToBs, bsToAd, daysInBsMonth, firstWeekdayOfBsMonth, weekdayShortLabels } from "./bs-date";

describe("bs-date", () => {
  it("converts a known AD anchor to its published BS date (Nepali New Year 2082 = 2025-04-14)", () => {
    expect(adToBs("2025-04-14")).toEqual({ year: 2082, month: 0, date: 1 });
  });

  it("round-trips AD -> BS -> AD for a range of dates", () => {
    for (const ad of ["2024-01-01", "2025-04-13", "2025-04-14", "2026-09-27", "2027-12-31"]) {
      const bs = adToBs(ad);
      expect(bsToAd(bs.year, bs.month, bs.date)).toBe(ad);
    }
  });

  it("knows BS 2083 has a 32-day Asar and a 29-day Mangsir", () => {
    expect(daysInBsMonth(2083, 2)).toBe(32); // Asar
    expect(daysInBsMonth(2083, 7)).toBe(29); // Mangsir
  });

  it("computes the correct starting weekday for a BS month", () => {
    // Baisakh 1, 2082 (2025-04-14) was a Monday.
    expect(firstWeekdayOfBsMonth(2082, 0)).toBe(1);
  });

  it("gives 7 distinct weekday labels for both locales", () => {
    expect(weekdayShortLabels("en")).toHaveLength(7);
    expect(new Set(weekdayShortLabels("ne"))).toHaveProperty("size", 7);
  });
});
