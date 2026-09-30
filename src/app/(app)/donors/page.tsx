import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { BsDatePicker } from "@/components/bs-date-picker";
import { Pagination } from "@/components/pagination";
import { Alert, btnGhost, btnPrimary, Card, inputCls, PageTitle } from "@/components/ui";
import { listDonorSummaries } from "@/db/queries/reports";
import { requirePermission } from "@/lib/auth/session";
import { formatDate, formatNPR, localizedCount, toNepaliDigits } from "@/lib/format";

const PAGE_SIZE = 20;
const ymd = /^\d{4}-\d{2}-\d{2}$/;
const moneyPattern = /^\d+(\.\d{1,2})?$/;

function toPaisa(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * BigInt(100) + BigInt((fraction + "00").slice(0, 2));
}

export default async function DonorsPage({
  searchParams,
}: {
  searchParams: Promise<{
    minTotal?: string;
    maxTotal?: string;
    donationType?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  await requirePermission("donation:list");
  const params = await searchParams;
  const minInput = params.minTotal ?? "";
  const maxInput = params.maxTotal ?? "";
  const fromInput = params.from ?? "";
  const toInput = params.to ?? "";
  const moneyValid =
    (!minInput || moneyPattern.test(minInput)) &&
    (!maxInput || moneyPattern.test(maxInput)) &&
    (!minInput || !maxInput || toPaisa(maxInput) >= toPaisa(minInput));
  const dateValid =
    (!fromInput || ymd.test(fromInput)) &&
    (!toInput || ymd.test(toInput)) &&
    (!fromInput || !toInput || fromInput <= toInput);
  const filtersValid = moneyValid && dateValid;
  const minTotal = filtersValid && minInput ? minInput : undefined;
  const maxTotal = filtersValid && maxInput ? maxInput : undefined;
  const from = filtersValid && fromInput ? fromInput : undefined;
  const to = filtersValid && toInput ? toInput : undefined;
  const donationType =
    params.donationType && ["cash", "non_cash", "other"].includes(params.donationType)
      ? (params.donationType as "cash" | "non_cash" | "other")
      : undefined;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const [{ rows, total }, t, td, tc, locale] = await Promise.all([
    listDonorSummaries({
      minTotal,
      maxTotal,
      donationType,
      from,
      to,
      page,
      pageSize: PAGE_SIZE,
    }),
    getTranslations("donors"),
    getTranslations("donation"),
    getTranslations("common"),
    getLocale(),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const hrefFor = (nextPage: number) => {
    const query = new URLSearchParams();
    if (minTotal) query.set("minTotal", minTotal);
    if (maxTotal) query.set("maxTotal", maxTotal);
    if (donationType) query.set("donationType", donationType);
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    query.set("page", String(nextPage));
    return `/donors?${query}`;
  };

  return (
    <div>
      <PageTitle>{t("title")}</PageTitle>
      <Card className="mb-4">
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <label className="text-sm text-stone-600">
            {t("minTotal")}
            <input name="minTotal" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={minInput} className={inputCls} />
          </label>
          <label className="text-sm text-stone-600">
            {t("maxTotal")}
            <input name="maxTotal" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={maxInput} className={inputCls} />
          </label>
          <label className="text-sm text-stone-600">
            {td("donationType")}
            <select name="donationType" defaultValue={donationType ?? ""} className={inputCls}>
              <option value="">{td("allTypes")}</option>
              <option value="cash">{td("cash")}</option>
              <option value="non_cash">{td("nonCash")}</option>
              <option value="other">{td("other")}</option>
            </select>
          </label>
          <label className="text-sm text-stone-600">
            {tc("from")}
            <BsDatePicker name="from" defaultValue={fromInput} clearable />
          </label>
          <label className="text-sm text-stone-600">
            {tc("to")}
            <BsDatePicker name="to" defaultValue={toInput} clearable />
          </label>
          <div className="grid grid-cols-2 items-end gap-2">
            <button className={btnPrimary}>{tc("filter")}</button>
            <Link href="/donors" className={btnGhost}>{tc("clear")}</Link>
          </div>
        </form>
      </Card>

      {!filtersValid && <Alert kind="error">{t("invalidFilters")}</Alert>}
      <p className="mb-2 text-sm text-stone-600">
        {tc("records", { count: localizedCount(total, locale) })}
      </p>

      {rows.length === 0 ? (
        <Card><p className="text-stone-600">{t("noResults")}</p></Card>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-stone-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-stone-600">
                <tr>
                  <th className="px-3 py-2">{td("name")}</th>
                  <th className="px-3 py-2">{td("phone")}</th>
                  <th className="px-3 py-2">{td("address")}</th>
                  <th className="px-3 py-2 text-right">{t("cashTotal")}</th>
                  <th className="px-3 py-2 text-right">{t("nonCashCount")}</th>
                  <th className="px-3 py-2 text-right">{t("otherCount")}</th>
                  <th className="px-3 py-2 text-right">{t("donationCount")}</th>
                  <th className="px-3 py-2">{t("lastDonation")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((row) => (
                  <tr key={`${row.donorName}-${row.phone}`}>
                    <td className="px-3 py-2 font-medium">{row.donorName}</td>
                    <td className="px-3 py-2">{row.phone}</td>
                    <td className="px-3 py-2">{row.address}</td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">{formatNPR(row.totalCash, locale)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{toNepaliDigits(row.nonCashCount, locale)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{toNepaliDigits(row.otherCount, locale)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{toNepaliDigits(row.donationCount, locale)}</td>
                    <td className="whitespace-nowrap px-3 py-2">{formatDate(row.lastDonationDate, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {rows.map((row) => (
              <li key={`${row.donorName}-${row.phone}`} className="rounded-lg border border-stone-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{row.donorName}</div>
                    <div className="text-sm text-stone-600">{row.phone} · {row.address}</div>
                  </div>
                  <div className="shrink-0 text-right font-semibold tabular-nums">{formatNPR(row.totalCash, locale)}</div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>{t("nonCashCount")}: {toNepaliDigits(row.nonCashCount, locale)}</div>
                  <div>{t("otherCount")}: {toNepaliDigits(row.otherCount, locale)}</div>
                  <div>{t("donationCount")}: {toNepaliDigits(row.donationCount, locale)}</div>
                  <div>{t("lastDonation")}: {formatDate(row.lastDonationDate, locale)}</div>
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={page} pages={pages} hrefFor={hrefFor} />
        </>
      )}
    </div>
  );
}