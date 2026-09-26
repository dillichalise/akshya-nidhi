import { describe, expect, it } from "vitest";
import { collapseSpaces, normalizePhone } from "./normalize";

describe("normalize", () => {
  it("collapses whitespace", () => {
    expect(collapseSpaces("  Ram   Bahadur \n Sharma ")).toBe("Ram Bahadur Sharma");
  });
  it("normalizes phone numbers", () => {
    expect(normalizePhone("+977 984-1234567")).toBe("9841234567");
    expect(normalizePhone("(984) 123 4567")).toBe("9841234567");
    expect(normalizePhone("01-4412345")).toBe("014412345");
  });
});
