import { describe, expect, it } from "vitest";
import {
  amountInWords,
  formatAmountInput,
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

describe("formatAmountInput", () => {
  it("applies lakh/crore grouping to whole numbers", () => {
    expect(formatAmountInput("125000")).toBe("1,25,000");
    expect(formatAmountInput("1000")).toBe("1,000");
    expect(formatAmountInput("10000000")).toBe("1,00,00,000");
  });
  it("preserves the decimal part without forcing 2dp", () => {
    expect(formatAmountInput("125000.5")).toBe("1,25,000.5");
    expect(formatAmountInput("500.25")).toBe("500.25");
  });
  it("passes through in-progress / invalid input unchanged", () => {
    expect(formatAmountInput("")).toBe("");
    expect(formatAmountInput("100.")).toBe("100.");
    expect(formatAmountInput("abc")).toBe("abc");
  });
});

describe("amountInWords – Nepali", () => {
  it("handles single-digit and teens correctly", () => {
    expect(amountInWords(5, "ne")).toBe("पाँच रुपैयाँ मात्र");
    expect(amountInWords(15, "ne")).toBe("पन्ध्र रुपैयाँ मात्र");
    expect(amountInWords(19, "ne")).toBe("उन्नाइस रुपैयाँ मात्र");
  });
  it("uses fused compound words for 20–99", () => {
    expect(amountInWords(20, "ne")).toBe("बीस रुपैयाँ मात्र");
    expect(amountInWords(21, "ne")).toBe("एक्काइस रुपैयाँ मात्र");
    expect(amountInWords(25, "ne")).toBe("पच्चिस रुपैयाँ मात्र");
    expect(amountInWords(50, "ne")).toBe("पचास रुपैयाँ मात्र");
    expect(amountInWords(99, "ne")).toBe("उनान्सय रुपैयाँ मात्र");
  });
  it("handles hundreds", () => {
    expect(amountInWords(100, "ne")).toBe("एक सय रुपैयाँ मात्र");
    expect(amountInWords(125, "ne")).toBe("एक सय पच्चिस रुपैयाँ मात्र");
    expect(amountInWords(999, "ne")).toBe("नौ सय उनान्सय रुपैयाँ मात्र");
  });
  it("handles thousands, lakhs, crores", () => {
    expect(amountInWords(1000, "ne")).toBe("एक हजार रुपैयाँ मात्र");
    expect(amountInWords(25000, "ne")).toBe("पच्चिस हजार रुपैयाँ मात्र");
    expect(amountInWords(125000, "ne")).toBe(
      "एक लाख पच्चिस हजार रुपैयाँ मात्र",
    );
    expect(amountInWords(10000000, "ne")).toBe("एक करोड रुपैयाँ मात्र");
  });
  it("appends paisa when present", () => {
    expect(amountInWords(10.5, "ne")).toBe("दश रुपैयाँ र पचास पैसा मात्र");
    expect(amountInWords(21.25, "ne")).toBe(
      "एक्काइस रुपैयाँ र पच्चिस पैसा मात्र",
    );
  });
});

describe("amountInWords – English", () => {
  it("basic values", () => {
    expect(amountInWords(21, "en")).toBe("Twenty One Rupees Only");
    expect(amountInWords(125000, "en")).toBe(
      "One Lakh Twenty Five Thousand Rupees Only",
    );
    expect(amountInWords(10.5, "en")).toBe("Ten Rupees and Fifty Paisa Only");
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
