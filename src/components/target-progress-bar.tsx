import { getLocale, getTranslations } from "next-intl/server";
import {
  amountInWords,
  formatNPR,
  localizedCount,
  toNepaliDigits,
} from "@/lib/format";
import { Card } from "./ui";

// Overall fundraising target for the event (NPR).
// Set EVENT_TARGET_AMOUNT in your .env file. Falls back to Rs 10,00,000 if unset.
const TARGET_AMOUNT = Number(process.env.EVENT_TARGET_AMOUNT ?? 1000000);

export async function TargetProgressBar({
  total,
  count,
}: {
  total: string;
  count: number;
}) {
  const [t, locale] = await Promise.all([
    getTranslations("dashboard"),
    getLocale(),
  ]);

  const collected = Number(total);
  const pct = Math.min((collected / TARGET_AMOUNT) * 100, 100);
  const pctDisplay = pct.toFixed(1);
  const remaining = Math.max(TARGET_AMOUNT - collected, 0);

  return (
    <Card>
      {/* Header — label on top, amount below on mobile to avoid overflow */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
        <div>
          <div className="text-sm font-medium text-stone-600">
            {t("eventTarget")}
          </div>
          <div className="mt-0.5 text-xs text-stone-400">
            {t("eventPeriod")}
          </div>
        </div>
        <div className="sm:text-right">
          <div className="text-xl font-semibold tabular-nums text-amber-800 sm:text-2xl">
            {formatNPR(total, locale)}
          </div>
          {/* amountInWords is long — clamp to 2 lines so it never pushes layout */}
          <div className="mt-0.5 text-xs text-stone-500">
            {amountInWords(total, locale)}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("targetProgress", {
            pct: toNepaliDigits(pctDisplay, locale),
          })}
          className="h-4 w-full overflow-hidden rounded-full bg-stone-100"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-700 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="font-semibold text-amber-800">
            {toNepaliDigits(pctDisplay, locale)}%
          </span>
          <span className="text-right text-stone-500">
            {t("targetOf", { amount: formatNPR(TARGET_AMOUNT, locale) })}
          </span>
        </div>
      </div>

      {/* Footer stats — always 3 equal columns */}
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-stone-100 pt-3">
        <div>
          <div className="text-xs text-stone-500">{t("donationsShort")}</div>
          <div className="mt-0.5 text-sm font-semibold tabular-nums text-stone-700">
            {localizedCount(count, locale)}
          </div>
        </div>
        <div>
          <div className="text-xs text-stone-500">{t("remaining")}</div>
          <div className="mt-0.5 text-sm font-semibold tabular-nums text-stone-700">
            {remaining > 0 ? formatNPR(remaining.toFixed(2), locale) : "—"}
          </div>
        </div>
        <div>
          <div className="text-xs text-stone-500">{t("avgPerDonation")}</div>
          <div className="mt-0.5 text-sm font-semibold tabular-nums text-stone-700">
            {count > 0
              ? formatNPR((collected / count).toFixed(2), locale)
              : "—"}
          </div>
        </div>
      </div>
    </Card>
  );
}
