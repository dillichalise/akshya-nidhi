/** Trim and collapse internal whitespace. */
export function collapseSpaces(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

/** Digits only; strips a leading Nepal country code (977). */
export function normalizePhone(s: string): string {
  let digits = s.replace(/\D/g, "");
  if (digits.startsWith("977") && digits.length >= 12) digits = digits.slice(3);
  return digits;
}
