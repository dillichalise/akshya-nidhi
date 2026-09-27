import { adToBs, bsMonthName } from "./bs-date";

export const TIME_ZONE = "Asia/Kathmandu";

/** NPR with lakh/crore grouping, e.g. "Rs 1,25,000.00". Same in every locale. */
export function formatNPR(amount: string | number): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return (
    "Rs " +
    new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      numberingSystem: "latn",
    } as Intl.NumberFormatOptions).format(n)
  );
}

/**
 * "YYYY-MM-DD" (AD, as stored) -> its Bikram Sambat display, e.g. "11 Aswin 2083"
 * (Devanagari month name in `ne`). Every date shown in the UI is BS — see CLAUDE.md.
 * Day/year stay Western digits; only the month name is localized.
 */
export function formatDate(ymd: string, locale: string = "en"): string {
  const bs = adToBs(ymd);
  return `${bs.date} ${bsMonthName(bs.year, bs.month, locale)} ${bs.year}`;
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

/** Timestamp in Nepal time, BS date + local time, e.g. "11 Aswin 2083, 11:42 PM". */
export function formatDateTime(d: Date, locale: string = "en"): string {
  const tag = locale === "ne" ? "ne-NP-u-nu-latn" : "en-US";
  const time = new Intl.DateTimeFormat(tag, { timeStyle: "short", timeZone: TIME_ZONE }).format(d);
  return `${formatDate(dateInNepal(d), locale)}, ${time}`;
}

/** Today's date in Nepal as "YYYY-MM-DD". */
export function todayInNepal(now: Date = new Date()): string {
  return dateInNepal(now);
}
