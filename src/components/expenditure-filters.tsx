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
  return s ? `/expenditures?${s}` : "/expenditures";
}

export function ExpenditureFilters({
  q,
  from,
  to,
}: {
  q: string;
  from: string;
  to: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [query, setQuery] = useState(q);
  const [dateFrom, setDateFrom] = useState(from);
  const [dateTo, setDateTo] = useState(to);

  useEffect(() => {
    if (query.trim() === q) return;
    const id = setTimeout(
      () => router.replace(buildUrl(query, dateFrom, dateTo)),
      DEBOUNCE_MS,
    );
    return () => clearTimeout(id);
  }, [query, dateFrom, dateTo, q, router]);

  return (
    <form className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-end">
      <input
        name="q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("expenditure.searchPlaceholder")}
        aria-label={t("common.search")}
        className={inputCls}
      />

      <div className="grid grid-cols-2 gap-3 sm:contents">
        <label className="text-sm text-stone-600">
          {t("common.from")}
          <BsDatePicker
            name="from"
            value={dateFrom}
            onChange={setDateFrom}
            clearable
          />
        </label>
        <label className="text-sm text-stone-600">
          {t("common.to")}
          <BsDatePicker
            name="to"
            value={dateTo}
            onChange={setDateTo}
            clearable
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:contents">
        <button className={btnPrimary}>{t("common.filter")}</button>
        <Link href="/expenditures" className={btnGhost}>
          {t("common.clear")}
        </Link>
      </div>
    </form>
  );
}
