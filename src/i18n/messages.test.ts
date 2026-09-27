import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import { localizedCount } from "@/lib/format";
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

  // `en`'s "records"/"donations" use real ICU `plural`/`#` syntax, which auto-formats the
  // count in the active locale. `ne`'s translations of the SAME keys are plain
  // "{count} अभिलेख" etc. — Nepali doesn't need plural branching, but that also means `#`
  // never kicks in for them. `localizedCount` (src/lib/format.ts) is what every call site
  // uses to cover that gap; this pins both halves down so neither regresses silently:
  // `en` still gets correct plural selection from a raw number, `ne` gets Devanagari digits
  // despite its bare placeholder.
  it("localizedCount + records/donations render Devanagari digits for `ne`, Western for `en`", () => {
    const tEn = createTranslator({ locale: "en", messages: en, namespace: "common" });
    const tNe = createTranslator({ locale: "ne", messages: ne, namespace: "common" });
    expect(tEn("records", { count: localizedCount(1, "en") })).toBe("1 record"); // plural selection
    expect(tEn("records", { count: localizedCount(3, "en") })).toContain("3");
    expect(tNe("records", { count: localizedCount(3, "ne") })).toContain("३");

    const dEn = createTranslator({ locale: "en", messages: en, namespace: "dashboard" });
    const dNe = createTranslator({ locale: "ne", messages: ne, namespace: "dashboard" });
    expect(dEn("donations", { count: localizedCount(5, "en") })).toContain("5");
    expect(dNe("donations", { count: localizedCount(5, "ne") })).toContain("५");
  });
});
