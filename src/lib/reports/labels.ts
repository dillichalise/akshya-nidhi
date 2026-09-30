import "server-only";
import { getLocale, getTranslations } from "next-intl/server";
import { formatDateTime, localizedCount } from "@/lib/format";
import { periodText, type ReportLabels } from "./shared";

/** Report labels in the current locale (from the locale cookie). */
export async function getReportLabels(opts: { from: string; to: string; generatedBy: string; count: number }) {
  const [t, td, tc, locale] = await Promise.all([
    getTranslations("reports"),
    getTranslations("donation"),
    getTranslations("common"),
    getLocale(),
  ]);
  const labels: ReportLabels = {
    title: t("summary", { period: periodText(opts.from, opts.to, locale) }),
    period: periodText(opts.from, opts.to, locale),
    generatedOn: t("generatedOn", { when: formatDateTime(new Date(), locale) }),
    generatedBy: t("generatedBy", { name: opts.generatedBy }),
    grandTotal: t("grandTotal"),
    records: tc("records", { count: localizedCount(opts.count, locale) }),
    sn: t("sn"),
    date: td("date"),
    name: td("name"),
    phone: td("phone"),
    address: td("address"),
    amount: td("amount"),
    remarks: td("remarks"),
    page: tc("page", { page: "{page}", pages: "{pages}" }),
    summaryHeader: t("summaryHeader"),
    income: t("income"),
    expenditure: t("expenditure"),
    savings: t("savings"),
  };
  return { labels, locale };
}
