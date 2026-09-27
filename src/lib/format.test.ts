import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatNPR,
  todayInNepal,
  toNepaliDigits,
} from "./format";

describe("formatNPR", () => {
  it("uses lakh/crore grouping, Western digits by default", () => {
    expect(formatNPR("125000")).toBe("Rs 1,25,000.00");
    expect(formatNPR("12345678.5")).toBe("Rs 1,23,45,678.50");
    expect(formatNPR("0")).toBe("Rs 0.00");
  });
  it("uses Devanagari digits for the `ne` locale, same grouping", () => {
    expect(formatNPR("125000", "ne")).toBe("रु १,२५,०००.००");
  });
});

describe("toNepaliDigits", () => {
  it("rewrites 0-9 to Devanagari for `ne`, leaves everything else untouched", () => {
    expect(toNepaliDigits("12,345.50", "ne")).toBe("१२,३४५.५०");
    expect(toNepaliDigits(2083, "ne")).toBe("२०८३");
  });
  it("passes strings/numbers through unchanged for `en`", () => {
    expect(toNepaliDigits("12,345.50", "en")).toBe("12,345.50");
    expect(toNepaliDigits(2083, "en")).toBe("2083");
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
  it("converts the stored AD date to its Bikram Sambat display, Western digits for `en`", () => {
    // 2026-09-26 AD is Aswin 10, 2083 BS.
    expect(formatDate("2026-09-26")).toBe("10 Aswin 2083");
  });
  it("uses Devanagari digits and month name for `ne`", () => {
    // 2026-01-01 AD is Poush 17, 2082 BS.
    expect(formatDate("2026-01-01", "ne")).toBe("१७ पौष २०८२");
  });
});

describe("formatDateTime", () => {
  it("appends 12-hour Kathmandu time for `en`", () => {
    // Exactly Nepal midnight -> Aswin 11, 2083 (see todayInNepal test above).
    expect(formatDateTime(new Date("2026-09-26T18:15:00Z"))).toBe(
      "11 Aswin 2083, 12:00 AM",
    );
  });
  it("appends 24-hour Kathmandu time in Devanagari for `ne`", () => {
    expect(formatDateTime(new Date("2026-09-26T18:15:00Z"), "ne")).toBe(
      "११ आश्विन २०८३, ००:००",
    );
  });
});
