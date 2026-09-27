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
  return locale === "ne"
    ? s.replace(/[0-9]/g, (d) => DEVANAGARI_DIGITS[Number(d)])
    : s;
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

/** NPR with lakh/crore grouping, e.g. "Rs 1,25,000.00" (en) / "रु १,२५,०००.००" (ne). */
export function formatNPR(
  amount: string | number,
  locale: string = "en",
): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  const grouped = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    numberingSystem: "latn",
  } as Intl.NumberFormatOptions).format(n);
  const prefix = locale === "ne" ? "रु " : "Rs ";
  return prefix + toNepaliDigits(grouped, locale);
}

// ── Amount in words ────────────────────────────────────────────────────────────

const EN_ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const EN_TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function enBelow100(n: number): string {
  if (n < 20) return EN_ONES[n];
  return EN_TENS[Math.floor(n / 10)] + (n % 10 ? " " + EN_ONES[n % 10] : "");
}

function enBelow1000(n: number): string {
  if (n < 100) return enBelow100(n);
  return (
    EN_ONES[Math.floor(n / 100)] +
    " Hundred" +
    (n % 100 ? " " + enBelow100(n % 100) : "")
  );
}

/** Converts a non-negative integer to English words (lakh/crore scale). */
function toEnglishWords(n: number): string {
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 1_00_00_000);
  n %= 1_00_00_000;
  const lakh = Math.floor(n / 1_00_000);
  n %= 1_00_000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(enBelow1000(crore) + " Crore");
  if (lakh) parts.push(enBelow100(lakh) + " Lakh");
  if (thousand) parts.push(enBelow1000(thousand) + " Thousand");
  if (n) parts.push(enBelow1000(n));
  return parts.join(" ");
}

const NE_ONES = [
  "",
  "एक",
  "दुई",
  "तीन",
  "चार",
  "पाँच",
  "छ",
  "सात",
  "आठ",
  "नौ",
  "दश",
  "एघार",
  "बाह्र",
  "तेह्र",
  "चौध",
  "पन्ध्र",
  "सोह्र",
  "सत्र",
  "अठार",
  "उन्नाइस",
];

// Nepali numbers 20–99 are unique fused words, not composites of tens + ones.
const NE_COMPOUND: Record<number, string> = {
  20: "बीस",
  21: "एक्काइस",
  22: "बाइस",
  23: "तेइस",
  24: "चौबिस",
  25: "पच्चिस",
  26: "छब्बिस",
  27: "सत्ताइस",
  28: "अठ्ठाइस",
  29: "उनन्तीस",
  30: "तीस",
  31: "एकतीस",
  32: "बत्तीस",
  33: "तेत्तीस",
  34: "चौँतीस",
  35: "पैँतीस",
  36: "छत्तीस",
  37: "सैँतीस",
  38: "अठतीस",
  39: "उनचालीस",
  40: "चालीस",
  41: "एकचालीस",
  42: "बयालीस",
  43: "त्रिचालीस",
  44: "चवालीस",
  45: "पैँतालीस",
  46: "छयालीस",
  47: "सत्चालीस",
  48: "अठचालीस",
  49: "उनन्चास",
  50: "पचास",
  51: "एकाउन्न",
  52: "बाउन्न",
  53: "त्रिपन्न",
  54: "चउन्न",
  55: "पचपन्न",
  56: "छपन्न",
  57: "सत्पन्न",
  58: "अठपन्न",
  59: "उनसठी",
  60: "साठी",
  61: "एकसठी",
  62: "बासठी",
  63: "त्रिसठी",
  64: "चौसठी",
  65: "पैँसठी",
  66: "छैसठी",
  67: "सत्सठी",
  68: "अठसठी",
  69: "उनसत्तरी",
  70: "सत्तरी",
  71: "एकहत्तर",
  72: "बहत्तर",
  73: "त्रिहत्तर",
  74: "चौहत्तर",
  75: "पचहत्तर",
  76: "छयहत्तर",
  77: "सतहत्तर",
  78: "अठहत्तर",
  79: "उनासी",
  80: "असी",
  81: "एकासी",
  82: "बयासी",
  83: "त्रियासी",
  84: "चौरासी",
  85: "पचासी",
  86: "छयासी",
  87: "सतासी",
  88: "अठासी",
  89: "उनान्नब्बे",
  90: "नब्बे",
  91: "एकान्नब्बे",
  92: "बयान्नब्बे",
  93: "त्रियान्नब्बे",
  94: "चौरान्नब्बे",
  95: "पचान्नब्बे",
  96: "छयान्नब्बे",
  97: "सतान्नब्बे",
  98: "अठान्नब्बे",
  99: "उनान्सय",
};

function neBelow100(n: number): string {
  if (n < 20) return NE_ONES[n];
  return NE_COMPOUND[n] ?? `${n}`; // fallback should never be hit
}

function neBelow1000(n: number): string {
  if (n < 100) return neBelow100(n);
  return (
    NE_ONES[Math.floor(n / 100)] +
    " सय" +
    (n % 100 ? " " + neBelow100(n % 100) : "")
  );
}

/** Converts a non-negative integer to Nepali words (lakh/crore scale). */
function toNepaliWords(n: number): string {
  if (n === 0) return "शून्य";
  const parts: string[] = [];
  const crore = Math.floor(n / 1_00_00_000);
  n %= 1_00_00_000;
  const lakh = Math.floor(n / 1_00_000);
  n %= 1_00_000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(neBelow1000(crore) + " करोड");
  if (lakh) parts.push(neBelow100(lakh) + " लाख");
  if (thousand) parts.push(neBelow1000(thousand) + " हजार");
  if (n) parts.push(neBelow1000(n));
  return parts.join(" ");
}

/**
 * Converts a numeric NPR amount to its word representation.
 * e.g. 125000.50 → "One Lakh Twenty Five Thousand Rupees and Fifty Paisa" (en)
 *                 → "एक लाख पच्चीस हजार रुपैयाँ र पचास पैसा" (ne)
 * Returns an empty string for 0 or NaN.
 */
export function amountInWords(
  amount: string | number,
  locale: string = "en",
): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n) || n <= 0) return "";
  const rupees = Math.floor(n);
  const paisa = Math.round((n - rupees) * 100);

  if (locale === "ne") {
    const rupeePart = toNepaliWords(rupees) + " रुपैयाँ";
    const paisaPart = paisa > 0 ? " र " + toNepaliWords(paisa) + " पैसा" : "";
    return rupeePart + paisaPart + " मात्र";
  }
  const rupeePart = toEnglishWords(rupees) + " Rupees";
  const paisaPart = paisa > 0 ? " and " + toEnglishWords(paisa) + " Paisa" : "";
  return rupeePart + paisaPart + " Only";
}

/**
 * "YYYY-MM-DD" (AD, as stored) -> its Bikram Sambat display, e.g. "11 Aswin 2083" (en) /
 * "११ आश्विन २०८३" (ne). Every date shown in the UI is BS — see CLAUDE.md.
 */
export function formatDate(ymd: string, locale: string = "en"): string {
  const bs = adToBs(ymd);
  return toNepaliDigits(
    `${bs.date} ${bsMonthName(bs.year, bs.month, locale)} ${bs.year}`,
    locale,
  );
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
  const time = new Intl.DateTimeFormat(tag, {
    timeStyle: "short",
    timeZone: TIME_ZONE,
  }).format(d);
  return `${formatDate(dateInNepal(d), locale)}, ${time}`;
}

/** Today's date in Nepal as "YYYY-MM-DD". */
export function todayInNepal(now: Date = new Date()): string {
  return dateInNepal(now);
}
