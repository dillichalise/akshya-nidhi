import { getLocale, getTranslations } from "next-intl/server";
import type { DayOverDay } from "@/db/queries/reports";
import { formatNPR, localizedCount, toNepaliDigits } from "@/lib/format";
import { Card } from "./ui";

export async function DayOverDayCard({ data }: { data: DayOverDay }) {
  const [t, locale] = await Promise.all([
    getTranslations("dashboard"),
    getLocale(),
  ]);

  const deltaAmt = Number(data.deltaAmount ?? 0);
  const deltaCount = data.deltaCount ?? 0;
  const isUp = deltaAmt > 0;
  const isFlat = deltaAmt === 0;

  const arrow = isFlat ? "→" : isUp ? "↑" : "↓";
  const deltaColor = isFlat
    ? "text-stone-500"
    : isUp
      ? "text-emerald-700"
      : "text-red-600";
  const deltaBg = isFlat
    ? "bg-stone-100"
    : isUp
      ? "bg-emerald-50"
      : "bg-red-50";

  const absDelta = Math.abs(deltaAmt).toFixed(2);
  const absCount = Math.abs(deltaCount);

  return (
    <Card>
      <div className="text-sm text-stone-600">{t("dayOverDay")}</div>

      {/* Today row — stack on very small screens, side-by-side from xs */}
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-stone-500">{t("today")}</div>
          <div className="mt-0.5 text-xl font-semibold tabular-nums text-amber-800 sm:text-2xl">
            {formatNPR(data.today.total, locale)}
          </div>
          <div className="mt-0.5 text-sm text-stone-500">
            {t("donations", {
              count: localizedCount(data.today.count, locale),
            })}
          </div>
        </div>

        {/* Delta badge — shrinks text on mobile so it never overflows */}
        <div
          className={`flex shrink-0 flex-col items-end gap-1 rounded-lg px-2.5 py-2 sm:px-3 ${deltaBg}`}
        >
          <span className={`text-base font-bold sm:text-lg ${deltaColor}`}>
            {arrow} {formatNPR(absDelta, locale)}
          </span>
          <span className={`text-xs font-medium ${deltaColor}`}>
            {isFlat
              ? t("noChange")
              : `${isUp ? "+" : "−"}${toNepaliDigits(absCount, locale)} ${t("donationsShort")}`}
          </span>
        </div>
      </div>

      {/* Yesterday row */}
      <div className="mt-3 border-t border-stone-100 pt-3">
        <div className="text-xs font-medium text-stone-500">
          {t("yesterday")}
        </div>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
          <span className="text-lg font-medium tabular-nums text-stone-700">
            {formatNPR(data.yesterday.total, locale)}
          </span>
          <span className="text-sm text-stone-400">
            {t("donations", {
              count: localizedCount(data.yesterday.count, locale),
            })}
          </span>
        </div>
      </div>
    </Card>
  );
}
