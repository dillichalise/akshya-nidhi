import NepaliDate, { dateConfigMap } from "nepali-date-converter";
import { dateInNepal } from "./format";

/** BS month keys in `dateConfigMap` order, matching `NepaliDate.getMonth()`'s 0-indexed scheme. */
const BS_MONTH_KEYS = [
  "Baisakh",
  "Jestha",
  "Asar",
  "Shrawan",
  "Bhadra",
  "Aswin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra",
] as const;

export type BsDate = { year: number; month: number; date: number };

/** Builds a UTC-noon Date for an AD "YYYY-MM-DD" string (avoids DST/timezone boundary issues). */
function adDateFromYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

/** Converts an AD "YYYY-MM-DD" string to a BS {year, month (0-11), date}. */
export function adToBs(adYmd: string): BsDate {
  const bs = new NepaliDate(adDateFromYmd(adYmd)).getBS();
  return { year: bs.year, month: bs.month, date: bs.date };
}

/** Converts a BS year/month(0-11)/date to an AD "YYYY-MM-DD" string. */
export function bsToAd(year: number, month: number, date: number): string {
  // Kathmandu is always ahead of UTC, so formatting toJsDate() in that zone gives the
  // correct AD calendar day regardless of the server's own time zone.
  return dateInNepal(new NepaliDate(year, month, date).toJsDate());
}

/** Today's date as BS {year, month (0-11), date}. */
export function todayBs(): BsDate {
  const bs = NepaliDate.now().getBS();
  return { year: bs.year, month: bs.month, date: bs.date };
}

/** Number of days in a BS month (0-11), or 30 if the year falls outside the library's data table. */
export function daysInBsMonth(year: number, month: number): number {
  const key = BS_MONTH_KEYS[month];
  const map = dateConfigMap[String(year)];
  return map?.[key] ?? 30;
}

/** JS weekday index (0=Sun..6=Sat) of the 1st day of a BS month. */
export function firstWeekdayOfBsMonth(year: number, month: number): number {
  return new NepaliDate(year, month, 1).getDay();
}

/** Localized month name for a BS month (0-11) — text only, so it carries no numerals. */
export function bsMonthName(year: number, month: number, locale: string): string {
  return new NepaliDate(year, month, 1).format("MMMM", locale === "ne" ? "np" : "en");
}

/** Short weekday header labels (Sun..Sat) for the calendar grid, in the given locale. */
export function weekdayShortLabels(locale: string): string[] {
  const tag = locale === "ne" ? "ne-NP-u-nu-latn-ca-gregory" : "en-US";
  const fmt = new Intl.DateTimeFormat(tag, { weekday: "short", timeZone: "UTC" });
  // 2023-01-01 was a Sunday — used only as a reference week, unrelated to any real date.
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2023, 0, 1 + i, 12))));
}
