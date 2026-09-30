import { getLocale, getTranslations } from "next-intl/server";
import {
  getDailySummary,
  getReport,
  getRangeSummary,
} from "@/db/queries/reports";
import { BsDatePicker } from "@/components/bs-date-picker";
import { Alert, btnGhost, btnPrimary, Card, PageTitle } from "@/components/ui";
import { requirePermission } from "@/lib/auth/session";
import {
  formatDate,
  formatNPR,
  localizedCount,
  todayInNepal,
  toNepaliDigits,
} from "@/lib/format";
import { MAX_RANGE_DAYS, periodText, rangeDays } from "@/lib/reports/shared";
import { dateRangeSchema } from "@/lib/validation/donation";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requirePermission("report:download");
  const sp = await searchParams;
  const [t, td, te, tc, locale] = await Promise.all([
    getTranslations("reports"),
    getTranslations("donation"),
    getTranslations("errors"),
    getTranslations("common"),
    getLocale(),
  ]);

  const submitted = sp.from !== undefined;
  const from = sp.from || todayInNepal();
  const to = sp.to || from; // blank "to" means a single date
  const parsed = submitted ? dateRangeSchema.safeParse({ from, to }) : null;
  const tooLarge = parsed?.success && rangeDays(from, to) > MAX_RANGE_DAYS;
  const isSingleDate = from === to;

  // Fetch donation report and I/E/S summary in parallel when valid
  const [report, iesSummary] =
    parsed?.success && !tooLarge
      ? await Promise.all([
          getReport(from, to),
          isSingleDate ? getDailySummary(from) : getRangeSummary(from, to),
        ])
      : [null, null];

  const qs = new URLSearchParams({ from, to }).toString();
  const summaryTotals = iesSummary
    ? "date" in iesSummary
      ? iesSummary
      : iesSummary.totals
    : null;

  return (
    <div>
      <PageTitle>{t("title")}</PageTitle>
      <Card className="mb-6">
        <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-sm text-stone-600">
            {tc("from")} ({t("single")})
            <BsDatePicker name="from" defaultValue={from} />
          </label>
          <label className="text-sm text-stone-600">
            {tc("to")} ({tc("optional")}: {t("range")})
            <BsDatePicker
              name="to"
              defaultValue={sp.to && sp.to !== from ? sp.to : ""}
              clearable
            />
          </label>
          <button className={btnPrimary}>{t("generate")}</button>
        </form>
      </Card>

      {parsed && !parsed.success && (
        <Alert kind="error">
          {te(parsed.error.issues[0].message as "range_invalid")}
        </Alert>
      )}
      {tooLarge && <Alert kind="error">{t("tooLarge")}</Alert>}

      {report && (
        <div className="mb-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                {t("donationDetailReport")} — {periodText(from, to, locale)}
              </h2>
              <p className="text-sm text-stone-500">
                {tc("records", { count: localizedCount(report.count, locale) })}
              </p>
            </div>
            {report.count > 0 && (
              <div className="flex gap-2">
                <a href={`/api/reports/pdf?${qs}`} className={btnGhost}>
                  {t("downloadPdf")}
                </a>
                <a href={`/api/reports/excel?${qs}`} className={btnGhost}>
                  {t("downloadExcel")}
                </a>
              </div>
            )}
          </div>

          {summaryTotals && (
            <section aria-label={t("summaryHeader")} className="mb-4">
              <h3 className="mb-2 text-sm font-semibold text-stone-700">
                {t("summaryHeader")}
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <Card>
                  <div className="text-sm text-stone-600">{t("income")}</div>
                  <div className="mt-1 text-xl font-semibold tabular-nums text-green-700">
                    {formatNPR(summaryTotals.income, locale)}
                  </div>
                </Card>
                <Card>
                  <div className="text-sm text-stone-600">{t("expenditure")}</div>
                  <div className="mt-1 text-xl font-semibold tabular-nums text-red-700">
                    {formatNPR(summaryTotals.expenditure, locale)}
                  </div>
                </Card>
                <Card>
                  <div className="text-sm text-stone-600">{t("savings")}</div>
                  <div className={`mt-1 text-xl font-semibold tabular-nums ${summaryTotals.savings.startsWith("-") ? "text-red-700" : "text-green-700"}`}>
                    {formatNPR(summaryTotals.savings, locale)}
                  </div>
                </Card>
              </div>
            </section>
          )}

          {report.count === 0 ? (
            <Card>
              <p className="text-stone-600">{tc("noData")}</p>
            </Card>
          ) : (
            <>
              {/* Table — md and above */}
              <Card className="!p-0 hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-stone-200 bg-stone-50 text-stone-600">
                    <tr>
                      <th className="px-3 py-2">{t("sn")}</th>
                      <th className="px-3 py-2">{td("date")}</th>
                      <th className="px-3 py-2">{td("name")}</th>
                      <th className="px-3 py-2">{td("phone")}</th>
                      <th className="px-3 py-2">{td("address")}</th>
                      <th className="px-3 py-2 text-right">{td("amount")}</th>
                      <th className="px-3 py-2">{td("remarks")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {report.rows.map((r, i) => (
                      <tr key={r.id} className="align-top">
                        <td className="px-3 py-2 text-stone-400">
                          {toNepaliDigits(i + 1, locale)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          {formatDate(r.donationDate, locale)}
                        </td>
                        <td className="px-3 py-2 font-medium">{r.donorName}</td>
                        <td className="whitespace-nowrap px-3 py-2">
                          {r.phone}
                        </td>
                        <td className="px-3 py-2">{r.address}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                          {formatNPR(r.amount, locale)}
                        </td>
                        <td className="px-3 py-2 text-stone-600">
                          {r.remarks}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-stone-300 bg-amber-50 font-semibold">
                    <tr>
                      <td colSpan={5} className="px-3 py-2 text-right">
                        {t("grandTotal")}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                        {formatNPR(report.total, locale)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </Card>

              {/* Cards — below md */}
              <div className="md:hidden">
                <ul className="space-y-3">
                  {report.rows.map((r, i) => (
                    <li
                      key={r.id}
                      className="rounded-xl border border-stone-200 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-stone-400 tabular-nums">
                              {toNepaliDigits(i + 1, locale)}.
                            </span>
                            <span className="font-medium">{r.donorName}</span>
                          </div>
                          <div className="mt-0.5 text-sm text-stone-500">
                            {r.phone && (
                              <a
                                href={`tel:${r.phone}`}
                                className="text-amber-700 underline underline-offset-2 hover:text-amber-900"
                              >
                                {r.phone}
                              </a>
                            )}
                            {r.phone && r.address && <span> · </span>}
                            {r.address}
                          </div>
                          {r.remarks && (
                            <div className="mt-0.5 text-sm text-stone-400">
                              {r.remarks}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="font-semibold tabular-nums text-stone-900">
                            {formatNPR(r.amount, locale)}
                          </div>
                          <div className="text-xs text-stone-400 tabular-nums">
                            {formatDate(r.donationDate, locale)}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                {/* Grand total footer */}
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-right">
                  <span className="text-sm text-stone-600">
                    {t("grandTotal")}:{" "}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatNPR(report.total, locale)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Income / Expenditure / Savings Section */}
      {iesSummary && (
        <div className="mt-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                {t("incomeExpSavingsReport")} — {periodText(from, to, locale)}
              </h2>
            </div>
            <div className="flex gap-2">
              <a href={`/api/reports/ies/pdf?${qs}`} className={btnGhost}>
                {t("downloadPdf")}
              </a>
              <a href={`/api/reports/ies/excel?${qs}`} className={btnGhost}>
                {t("downloadExcel")}
              </a>
            </div>
          </div>

          {isSingleDate && "date" in iesSummary ? (
            /* Single date mode: stat cards */
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <div className="text-sm font-medium text-stone-600">
                  {t("income")}
                </div>
                <div className="mt-1 text-2xl font-bold text-green-700 tabular-nums">
                  {formatNPR(iesSummary.income, locale)}
                </div>
                <div className="mt-0.5 text-xs text-stone-500">
                  {tc("records", {
                    count: localizedCount(iesSummary.donationCount, locale),
                  })}
                </div>
              </Card>
              <Card>
                <div className="text-sm font-medium text-stone-600">
                  {t("expenditure")}
                </div>
                <div className="mt-1 text-2xl font-bold text-red-700 tabular-nums">
                  {formatNPR(iesSummary.expenditure, locale)}
                </div>
                <div className="mt-0.5 text-xs text-stone-500">
                  {tc("records", {
                    count: localizedCount(iesSummary.expenditureCount, locale),
                  })}
                </div>
              </Card>
              <Card>
                <div className="text-sm font-medium text-stone-600">
                  {t("savings")}
                </div>
                <div
                  className={`mt-1 text-2xl font-bold tabular-nums ${Number(iesSummary.savings) >= 0 ? "text-green-700" : "text-red-700"}`}
                >
                  {formatNPR(iesSummary.savings, locale)}
                </div>
                <div className="mt-0.5 text-xs text-stone-500">
                  {Number(iesSummary.savings) >= 0
                    ? t("positive")
                    : t("negative")}
                </div>
              </Card>
            </div>
          ) : "rows" in iesSummary ? (
            /* Date range mode: table with daily breakdown */
            <div>
              {/* Table — md and above */}
              <Card className="!p-0 hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-stone-200 bg-stone-50 text-stone-600">
                    <tr>
                      <th className="px-3 py-2">{td("date")}</th>
                      <th className="px-3 py-2 text-right">{t("income")}</th>
                      <th className="px-3 py-2 text-right">
                        {t("expenditure")}
                      </th>
                      <th className="px-3 py-2 text-right">{t("savings")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {iesSummary.rows.map((r) => (
                      <tr key={r.date} className="align-top">
                        <td className="whitespace-nowrap px-3 py-2">
                          {formatDate(r.date, locale)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-green-700">
                          {formatNPR(r.income, locale)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-red-700">
                          {formatNPR(r.expenditure, locale)}
                        </td>
                        <td
                          className={`whitespace-nowrap px-3 py-2 text-right tabular-nums font-medium ${Number(r.savings) >= 0 ? "text-green-700" : "text-red-700"}`}
                        >
                          {formatNPR(r.savings, locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-stone-300 bg-amber-50 font-semibold">
                    <tr>
                      <td className="px-3 py-2 text-right">
                        {t("grandTotal")}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-green-700">
                        {formatNPR(iesSummary.totals.income, locale)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-red-700">
                        {formatNPR(iesSummary.totals.expenditure, locale)}
                      </td>
                      <td
                        className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${Number(iesSummary.totals.savings) >= 0 ? "text-green-700" : "text-red-700"}`}
                      >
                        {formatNPR(iesSummary.totals.savings, locale)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </Card>

              {/* Cards — below md */}
              <div className="md:hidden">
                <ul className="space-y-3">
                  {iesSummary.rows.map((r) => (
                    <li
                      key={r.date}
                      className="rounded-xl border border-stone-200 bg-white p-4"
                    >
                      <div className="mb-2 font-medium">
                        {formatDate(r.date, locale)}
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <div className="text-stone-600">{t("income")}</div>
                          <div className="font-semibold text-green-700 tabular-nums">
                            {formatNPR(r.income, locale)}
                          </div>
                        </div>
                        <div>
                          <div className="text-stone-600">
                            {t("expenditure")}
                          </div>
                          <div className="font-semibold text-red-700 tabular-nums">
                            {formatNPR(r.expenditure, locale)}
                          </div>
                        </div>
                        <div>
                          <div className="text-stone-600">{t("savings")}</div>
                          <div
                            className={`font-semibold tabular-nums ${Number(r.savings) >= 0 ? "text-green-700" : "text-red-700"}`}
                          >
                            {formatNPR(r.savings, locale)}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                {/* Grand total footer */}
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="mb-2 text-sm font-semibold">
                    {t("grandTotal")}
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-stone-600">{t("income")}</div>
                      <div className="font-semibold text-green-700 tabular-nums">
                        {formatNPR(iesSummary.totals.income, locale)}
                      </div>
                    </div>
                    <div>
                      <div className="text-stone-600">{t("expenditure")}</div>
                      <div className="font-semibold text-red-700 tabular-nums">
                        {formatNPR(iesSummary.totals.expenditure, locale)}
                      </div>
                    </div>
                    <div>
                      <div className="text-stone-600">{t("savings")}</div>
                      <div
                        className={`font-semibold tabular-nums ${Number(iesSummary.totals.savings) >= 0 ? "text-green-700" : "text-red-700"}`}
                      >
                        {formatNPR(iesSummary.totals.savings, locale)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
