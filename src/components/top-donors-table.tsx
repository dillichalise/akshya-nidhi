import { getLocale, getTranslations } from "next-intl/server";
import type { TopDonor } from "@/db/queries/reports";
import { formatDate, formatNPR, toNepaliDigits } from "@/lib/format";
import { Card } from "./ui";

/**
 * Top donors, ranked by total. A donor with 2+ donations gets a "×N" badge;
 * hovering (or focusing/tapping) it lists each donation.
 */
export async function TopDonorsTable({
  title,
  donors,
}: {
  title: string;
  donors: TopDonor[];
}) {
  const [t, tc, locale] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("common"),
    getLocale(),
  ]);
  return (
    <Card className="!p-0">
      <h2 className="border-b border-stone-200 px-4 py-3 text-lg font-semibold">
        {title}
      </h2>
      {donors.length === 0 ? (
        <p className="px-4 py-6 text-stone-500">{tc("noData")}</p>
      ) : (
        <>
          {/* Table — md and above */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-stone-600">
                <tr>
                  <th className="w-10 px-3 py-2">#</th>
                  <th className="px-3 py-2">{t("donor")}</th>
                  <th className="px-3 py-2">{t("phone")}</th>
                  <th className="px-3 py-2">{t("address")}</th>
                  <th className="px-3 py-2 text-right">{t("amount")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {donors.map((d, i) => (
                  <tr key={`${d.phone}-${d.name}-${i}`} className="align-top">
                    <td className="px-3 py-2 text-stone-400">
                      {toNepaliDigits(i + 1, locale)}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      <span className="inline-flex flex-wrap items-center gap-2">
                        {d.name}
                        {d.count > 1 && (
                          <span className="group relative">
                            <button
                              type="button"
                              className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
                              aria-label={t("multiple", {
                                count: toNepaliDigits(d.count, locale),
                              })}
                            >
                              ×{toNepaliDigits(d.count, locale)}
                            </button>
                            <span
                              role="tooltip"
                              className="invisible absolute left-0 top-full z-10 mt-1 w-64 rounded-lg border border-stone-200 bg-white p-3 text-xs font-normal shadow-lg group-focus-within:visible group-hover:visible"
                            >
                              <span className="mb-1 block font-semibold">
                                {t("multiple", {
                                  count: toNepaliDigits(d.count, locale),
                                })}
                              </span>
                              {d.items.slice(0, 10).map((it, j) => (
                                <span
                                  key={j}
                                  className="flex justify-between gap-3 py-0.5 tabular-nums"
                                >
                                  <span>{formatDate(it.date, locale)}</span>
                                  <span>{formatNPR(it.amount, locale)}</span>
                                </span>
                              ))}
                              {d.items.length > 10 && (
                                <span className="block pt-1 text-stone-500">
                                  +{toNepaliDigits(d.items.length - 10, locale)}
                                </span>
                              )}
                            </span>
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">{d.phone}</td>
                    <td className="px-3 py-2">{d.address}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums">
                      {formatNPR(d.total, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards — below md */}
          <ul className="divide-y divide-stone-100 md:hidden">
            {donors.map((d, i) => (
              <li key={`${d.phone}-${d.name}-${i}`} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-stone-400 tabular-nums">
                        {toNepaliDigits(i + 1, locale)}.
                      </span>
                      <span className="font-medium">{d.name}</span>
                      {d.count > 1 && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                          ×{toNepaliDigits(d.count, locale)}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-sm text-stone-500">
                      <a
                        href={`tel:${d.phone}`}
                        className="text-amber-700 underline underline-offset-2"
                      >
                        {d.phone}
                      </a>
                      {d.address && <span> · {d.address}</span>}
                    </div>
                  </div>
                  <div className="shrink-0 text-right font-semibold tabular-nums text-stone-900">
                    {formatNPR(d.total, locale)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
