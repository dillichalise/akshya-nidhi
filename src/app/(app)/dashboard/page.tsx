import { getLocale, getTranslations } from "next-intl/server";
import { DayOverDayCard } from "@/components/day-over-day-card";
import { DonationBarChart } from "@/components/donation-bar-chart";
import { DonationPieChart } from "@/components/donation-pie-chart";
import { TargetProgressBar } from "@/components/target-progress-bar";
import { TopDonorsTable } from "@/components/top-donors-table";
import { Card, PageTitle } from "@/components/ui";
import {
  getAmountDistribution,
  getDayOverDay,
  getEventDailyTotals,
  getEventTotal,
  getTopDonors,
  getTotals,
} from "@/db/queries/reports";
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
  const [
    totals,
    dayOverDay,
    eventTotal,
    dailyTotals,
    distribution,
    topToday,
    topOverall,
    t,
    locale,
  ] = await Promise.all([
    getTotals(),
    getDayOverDay(),
    getEventTotal(),
    getEventDailyTotals(),
    getAmountDistribution(),
    getTopDonors("today"),
    getTopDonors("overall"),
    getTranslations("dashboard"),
    getLocale(),
  ]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageTitle>{t("title")}</PageTitle>

      {/* ── Row 1: today / overall summary cards ── */}
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        <Card>
          <div className="text-sm text-stone-600">
            {t("totalToday")} · {formatDate(totals.todayDate, locale)}
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-amber-800 sm:text-3xl">
            {formatNPR(totals.today.total, locale)}
          </div>
          <div className="mt-1 text-sm font-medium text-amber-700 sm:text-base">
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
          <div className="mt-1 text-2xl font-semibold tabular-nums text-amber-800 sm:text-3xl">
            {formatNPR(totals.overall.total, locale)}
          </div>
          <div className="mt-1 text-sm font-medium text-amber-700 sm:text-base">
            {amountInWords(totals.overall.total, locale)}
          </div>
          <div className="mt-1 text-sm text-stone-500">
            {t("donations", {
              count: localizedCount(totals.overall.count, locale),
            })}
          </div>
        </Card>
      </div>

      {/* ── Row 2: day-over-day + target progress ── */}
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        <DayOverDayCard data={dayOverDay} />
        <TargetProgressBar total={eventTotal.total} count={eventTotal.count} />
      </div>

      {/* ── Row 3: interactive charts — stack on mobile, side-by-side from lg ── */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        {/* Bar chart — daily collections */}
        <Card className="min-w-0">
          <h2 className="mb-3 text-sm font-semibold text-stone-800 sm:mb-4 sm:text-base">
            {t("dailyChart")}
          </h2>
          {dailyTotals.length === 0 ? (
            <p className="py-10 text-center text-sm text-stone-400">—</p>
          ) : (
            <DonationBarChart
              data={dailyTotals}
              locale={locale}
              yLabel={t("dailyChart")}
              tooltipLabel={t("dailyChartAmount")}
            />
          )}
        </Card>

        {/* Pie chart — amount bracket distribution */}
        <Card className="min-w-0">
          <h2 className="mb-1 text-sm font-semibold text-stone-800 sm:text-base">
            {t("amountDistribution")}
          </h2>
          <p className="mb-2 text-xs text-stone-500 sm:mb-3">
            {t("amountDistributionDesc")}
          </p>
          {distribution.length === 0 ? (
            <p className="py-10 text-center text-sm text-stone-400">—</p>
          ) : (
            <DonationPieChart
              data={distribution}
              ariaLabel={t("amountDistribution")}
            />
          )}
        </Card>
      </div>

      {/* ── Row 4: top donors ── */}
      <TopDonorsTable title={t("topToday")} donors={topToday} />
      <TopDonorsTable title={t("topOverall")} donors={topOverall} />
    </div>
  );
}
