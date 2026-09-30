import "server-only";
import {
  getDailySummary,
  getRangeSummary,
  getReport,
} from "@/db/queries/reports";
import { authorize } from "@/lib/auth/session";
import { dateRangeSchema } from "@/lib/validation/donation";
import { getReportLabels } from "./labels";
import { MAX_RANGE_DAYS, rangeDays, type ReportData, type ReportLabels } from "./shared";

/** Shared auth → validate → query → labels pipeline for the PDF and Excel routes. */
export async function prepareReport(request: Request) {
  const user = await authorize("report:download");
  if (!user) return { error: new Response("Forbidden", { status: 403 }) } as const;

  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") || from;
  const parsed = dateRangeSchema.safeParse({ from, to });
  if (!parsed.success || rangeDays(from, to) > MAX_RANGE_DAYS) {
    return { error: new Response("Invalid date range", { status: 400 }) } as const;
  }
  const [report, summary] = await Promise.all([
    getReport(from, to),
    from === to
      ? getDailySummary(from).then(({ income, expenditure, savings }) => ({ income, expenditure, savings }))
      : getRangeSummary(from, to).then(({ totals }) => totals),
  ]);
  const data: ReportData = { from, to, ...report, summary };
  const { labels, locale } = await getReportLabels({ from, to, generatedBy: user.fullName, count: report.count });
  return { data, labels: labels as ReportLabels, locale } as const;
}
