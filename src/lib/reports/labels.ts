import "server-only";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { periodText, type ReportLabels } from "./shared";

/** Report labels in the current locale (from the locale cookie). */
export async function getReportLabels(opts: { from: string; to: string; generatedBy: string; count: number }) {
  const [t, td, tc, locale, format] = await Promise.all([
    getTranslations("reports"),
    getTranslations("donation"),
    getTranslations("common"),
    getLocale(),
    getFormatter(),
  ]);
  const labels: ReportLabels = {
    title: t("summary", { period: periodText(opts.from, opts.to, locale) }),
    period: periodText(opts.from, opts.to, locale),
    generatedOn: t("generatedOn", { when: format.dateTime(new Date(), { dateStyle: "medium", timeStyle: "short" }) }),
    generatedBy: t("generatedBy", { name: opts.generatedBy }),
    grandTotal: t("grandTotal"),
    records: tc("records", { count: opts.count }),
    sn: t("sn"),
    date: td("date"),
    name: td("name"),
    phone: td("phone"),
    address: td("address"),
    amount: td("amount"),
    remarks: td("remarks"),
    page: tc("page", { page: "{page}", pages: "{pages}" }),
  };
  return { labels, locale };
}
