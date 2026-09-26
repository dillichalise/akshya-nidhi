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

/** "YYYY-MM-DD" (AD) -> "26 Sep 2026" (Nepali month names in `ne`), always day-month-year, Western digits. */
export function formatDate(ymd: string, locale: string = "en"): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  const tag = locale === "ne" ? "ne-NP-u-nu-latn-ca-gregory" : "en-US";
  const parts = new Intl.DateTimeFormat(tag, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")} ${get("month")} ${get("year")}`;
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

/** Timestamp in Nepal time, e.g. "26 Sep 2026, 11:42 PM". */
export function formatDateTime(d: Date, locale: string = "en"): string {
  const tag = locale === "ne" ? "ne-NP-u-nu-latn-ca-gregory" : "en-US";
  return new Intl.DateTimeFormat(tag, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TIME_ZONE,
  }).format(d);
}

/** Today's date in Nepal as "YYYY-MM-DD". */
export function todayInNepal(now: Date = new Date()): string {
  return dateInNepal(now);
}
