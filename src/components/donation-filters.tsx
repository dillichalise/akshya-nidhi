"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BsDatePicker } from "./bs-date-picker";
import { btnGhost, btnPrimary, inputCls } from "./ui";

const DEBOUNCE_MS = 3000;

function buildUrl(q: string, from: string, to: string) {
  const u = new URLSearchParams();
  if (q.trim()) u.set("q", q.trim());
  if (from) u.set("from", from);
  if (to) u.set("to", to);
  const s = u.toString();
  return s ? `/donations?${s}` : "/donations";
}

/**
 * Search + date filters. Typing in the search box applies itself 3 seconds after the
 * last keystroke; Enter or the Filter button applies immediately (plain GET form).
 * The page remounts this component (via `key`) whenever the applied filters change.
 */
export function DonationFilters({ q, from, to }: { q: string; from: string; to: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [query, setQuery] = useState(q);
  const [dateFrom, setDateFrom] = useState(from);
  const [dateTo, setDateTo] = useState(to);

  useEffect(() => {
    if (query.trim() === q) return; // nothing new to apply
    const id = setTimeout(() => router.replace(buildUrl(query, dateFrom, dateTo)), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query, dateFrom, dateTo, q, router]);

  return (
    <form className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-end">
      <input
        name="q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("donation.searchPlaceholder")}
        aria-label={t("common.search")}
        className={inputCls}
      />
      <label className="text-sm text-stone-600">
        {t("common.from")}
        <BsDatePicker name="from" value={dateFrom} onChange={setDateFrom} clearable />
      </label>
      <label className="text-sm text-stone-600">
        {t("common.to")}
        <BsDatePicker name="to" value={dateTo} onChange={setDateTo} clearable />
      </label>
      <button className={btnPrimary}>{t("common.filter")}</button>
      <Link href="/donations" className={btnGhost}>
        {t("common.clear")}
      </Link>
    </form>
  );
}
