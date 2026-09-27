import { adToBs, bsMonthName } from "./bs-date";

export const TIME_ZONE = "Asia/Kathmandu";

const DEVANAGARI_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];

/**
 * Rewrites the Western digits (0-9) in a string/number to Devanagari (०-९) for the `ne`
 * locale; returns the input untouched (as a string) for `en`. Only digit *glyphs* change —
 * grouping, decimal points, and any other characters pass through as-is. Used for every
 * number shown in the UI (amounts, dates, counts, pagination, serial numbers) — but NOT
 * for identifiers that happen to contain digits (phone numbers, the receipt reference
 * code), which stay Western by design. See CLAUDE.md's numeral rule.
 */
export function toNepaliDigits(value: string | number, locale: string): string {
  const s = String(value);
  return locale === "ne" ? s.replace(/[0-9]/g, (d) => DEVANAGARI_DIGITS[Number(d)]) : s;
}

/**
 * Value to pass as the `count` in an ICU `{count}`/`{count, plural, ...}` message. English
 * messages here use real `plural`/`#` syntax, which needs the raw number (ICU picks the
 * plural case AND Western-formats the digit itself) — so `en` is returned untouched. The
 * Nepali translations of those same keys are plain `"{count} अभिलेख"` etc. (no plural
 * branching — Nepali doesn't grammatically need it), which means `#`-style auto-formatting
 * never kicks in for them; `ne` gets a pre-converted Devanagari-digit string instead so the
 * count still renders correctly. If a `ne` message is ever rewritten to use `plural`/`#`,
 * switch its call site to pass the raw number through unconditionally.
 */
export function localizedCount(count: number, locale: string): number | string {
  return locale === "ne" ? toNepaliDigits(count, locale) : count;
}

/** NPR with lakh/crore grouping, e.g. "Rs 1,25,000.00" (en) / "Rs १,२५,०००.००" (ne). */
export function formatNPR(amount: string | number, locale: string = "en"): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  const grouped = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    numberingSystem: "latn",
  } as Intl.NumberFormatOptions).format(n);
  return "Rs " + toNepaliDigits(grouped, locale);
}

/**
 * "YYYY-MM-DD" (AD, as stored) -> its Bikram Sambat display, e.g. "11 Aswin 2083" (en) /
 * "११ आश्विन २०८३" (ne). Every date shown in the UI is BS — see CLAUDE.md.
 */
export function formatDate(ymd: string, locale: string = "en"): string {
  const bs = adToBs(ymd);
  return toNepaliDigits(`${bs.date} ${bsMonthName(bs.year, bs.month, locale)} ${bs.year}`, locale);
}

/** The calendar date in Nepal for an instant, as "YYYY-MM-DD", regardless of server time zone. */
export function dateInNepal(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Timestamp in Nepal time, BS date + local time, e.g. "11 Aswin 2083, 11:42 PM" (en) /
 *  "११ आश्विन २०८३, १६:००" (ne, 24-hour — `ne-NP`'s own convention). */
export function formatDateTime(d: Date, locale: string = "en"): string {
  const tag = locale === "ne" ? "ne-NP" : "en-US";
  const time = new Intl.DateTimeFormat(tag, { timeStyle: "short", timeZone: TIME_ZONE }).format(d);
  return `${formatDate(dateInNepal(d), locale)}, ${time}`;
}

/** Today's date in Nepal as "YYYY-MM-DD". */
export function todayInNepal(now: Date = new Date()): string {
  return dateInNepal(now);
}
