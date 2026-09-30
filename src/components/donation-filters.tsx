"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BsDatePicker } from "./bs-date-picker";
import { btnGhost, btnPrimary, inputCls } from "./ui";

const DEBOUNCE_MS = 3000;

function buildUrl(q: string, from: string, to: string, donationType: string, minAmt: string, maxAmt: string) {
  const u = new URLSearchParams();
  if (q.trim()) u.set("q", q.trim());
  if (from) u.set("from", from);
  if (to) u.set("to", to);
  if (donationType) u.set("type", donationType);
  if (minAmt) u.set("minAmt", minAmt);
  if (maxAmt) u.set("maxAmt", maxAmt);
  const s = u.toString();
  return s ? `/donations?${s}` : "/donations";
}

/**
 * Search + date filters. Typing in the search box applies itself 3 seconds after the
 * last keystroke; Enter or the Filter button applies immediately (plain GET form).
 * The page remounts this component (via `key`) whenever the applied filters change.
 */
export function DonationFilters({
  q,
  from,
  to,
  donationType,
  minAmt,
  maxAmt,
}: {
  q: string;
  from: string;
  to: string;
  donationType: string;
  minAmt: string;
  maxAmt: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [query, setQuery] = useState(q);
  const [dateFrom, setDateFrom] = useState(from);
  const [dateTo, setDateTo] = useState(to);
  const [typeFilter, setTypeFilter] = useState(donationType);
  const [minimum, setMinimum] = useState(minAmt);
  const [maximum, setMaximum] = useState(maxAmt);

  useEffect(() => {
    if (query.trim() === q && typeFilter === donationType && minimum === minAmt && maximum === maxAmt) return; // nothing new to apply
    const id = setTimeout(
      () => router.replace(buildUrl(query, dateFrom, dateTo, typeFilter, minimum, maximum)),
      DEBOUNCE_MS,
    );
    return () => clearTimeout(id);
  }, [query, dateFrom, dateTo, typeFilter, minimum, maximum, q, donationType, minAmt, maxAmt, router]);

  return (
    <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      {/* Search — full width on all breakpoints */}
      <input
        name="q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("donation.searchPlaceholder")}
        aria-label={t("common.search")}
        className={inputCls}
      />

      {/* Donation type filter */}
      <label className="text-sm text-stone-600">
        {t("donation.donationType")}
        <select
          name="type"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className={inputCls}
        >
          <option value="">{t("donation.allTypes")}</option>
          <option value="cash">{t("donation.cash")}</option>
          <option value="non_cash">{t("donation.nonCash")}</option>
          <option value="other">{t("donation.other")}</option>
        </select>
      </label>

      <label className="text-sm text-stone-600">
        {t("donation.minAmount")}
        <input
          name="minAmt"
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          value={minimum}
          onChange={(event) => setMinimum(event.target.value)}
          className={inputCls}
        />
      </label>
      <label className="text-sm text-stone-600">
        {t("donation.maxAmount")}
        <input
          name="maxAmt"
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          value={maximum}
          onChange={(event) => setMaximum(event.target.value)}
          className={inputCls}
        />
      </label>

      {/* Date pickers — side by side on mobile, individual columns on sm+ */}
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

      {/* Action buttons — side by side on mobile, individual columns on sm+ */}
      <div className="grid grid-cols-2 gap-3 sm:contents">
        <button className={btnPrimary}>{t("common.filter")}</button>
        <Link href="/donations" className={btnGhost}>
          {t("common.clear")}
        </Link>
      </div>
    </form>
  );
}
