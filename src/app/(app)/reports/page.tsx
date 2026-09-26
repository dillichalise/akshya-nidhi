import { getLocale, getTranslations } from "next-intl/server";
import { getReport } from "@/db/queries/reports";
import { Alert, btnGhost, btnPrimary, Card, inputCls, PageTitle } from "@/components/ui";
import { requirePermission } from "@/lib/auth/session";
import { formatDate, formatNPR, todayInNepal } from "@/lib/format";
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
  const report = parsed?.success && !tooLarge ? await getReport(from, to) : null;
  const qs = new URLSearchParams({ from, to }).toString();

  return (
    <div>
      <PageTitle>{t("title")}</PageTitle>
      <Card className="mb-6">
        <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-sm text-stone-600">
            {tc("from")} ({t("single")})
            <input type="date" name="from" defaultValue={from} required className={inputCls} />
          </label>
          <label className="text-sm text-stone-600">
            {tc("to")} ({tc("optional")}: {t("range")})
            <input type="date" name="to" defaultValue={sp.to && sp.to !== from ? sp.to : ""} className={inputCls} />
          </label>
          <button className={btnPrimary}>{t("generate")}</button>
        </form>
      </Card>

      {parsed && !parsed.success && <Alert kind="error">{te(parsed.error.issues[0].message as "range_invalid")}</Alert>}
      {tooLarge && <Alert kind="error">{t("tooLarge")}</Alert>}

      {report && (
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{t("summary", { period: periodText(from, to, locale) })}</h2>
              <p className="text-sm text-stone-500">{tc("records", { count: report.count })}</p>
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

          {report.count === 0 ? (
            <Card>
              <p className="text-stone-600">{tc("noData")}</p>
            </Card>
          ) : (
            <Card className="!p-0 overflow-x-auto">
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
                      <td className="px-3 py-2 text-stone-400">{i + 1}</td>
                      <td className="whitespace-nowrap px-3 py-2">{formatDate(r.donationDate, locale)}</td>
                      <td className="px-3 py-2 font-medium">{r.donorName}</td>
                      <td className="whitespace-nowrap px-3 py-2">{r.phone}</td>
                      <td className="px-3 py-2">{r.address}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatNPR(r.amount)}</td>
                      <td className="px-3 py-2 text-stone-600">{r.remarks}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-stone-300 bg-amber-50 font-semibold">
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-right">
                      {t("grandTotal")}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatNPR(report.total)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
