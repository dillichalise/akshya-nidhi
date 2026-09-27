import { getLocale, getTranslations } from "next-intl/server";
import { TopDonorsTable } from "@/components/top-donors-table";
import { Card, PageTitle } from "@/components/ui";
import { getTopDonors, getTotals } from "@/db/queries/reports";
import { requirePermission } from "@/lib/auth/session";
import {
  amountInWords,
  formatDate,
  formatNPR,
  localizedCount,
} from "@/lib/format";

// Always fresh: totals must reflect the latest donations.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requirePermission("dashboard:view");
  const [totals, topToday, topOverall, t, locale] = await Promise.all([
    getTotals(),
    getTopDonors("today"),
    getTopDonors("overall"),
    getTranslations("dashboard"),
    getLocale(),
  ]);
  return (
    <div className="space-y-6">
      <PageTitle>{t("title")}</PageTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <div className="text-sm text-stone-600">
            {t("totalToday")} · {formatDate(totals.todayDate, locale)}
          </div>
          <div className="mt-1 text-3xl font-semibold tabular-nums text-amber-800">
            {formatNPR(totals.today.total, locale)}
          </div>
          <div className="mt-1 text-base font-medium text-amber-700">
            {amountInWords(totals.today.total, locale)}
          </div>
          <div className="mt-1 text-sm text-stone-500">
            {t("donations", {
              count: localizedCount(totals.today.count, locale),
            })}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-stone-600">{t("totalOverall")}</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums text-amber-800">
            {formatNPR(totals.overall.total, locale)}
          </div>
          <div className="mt-1 text-base font-medium text-amber-700">
            {amountInWords(totals.overall.total, locale)}
          </div>
          <div className="mt-1 text-sm text-stone-500">
            {t("donations", {
              count: localizedCount(totals.overall.count, locale),
            })}
          </div>
        </Card>
      </div>
      <TopDonorsTable title={t("topToday")} donors={topToday} />
      <TopDonorsTable title={t("topOverall")} donors={topOverall} />
    </div>
  );
}
