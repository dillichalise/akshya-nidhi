import "server-only";
import { getLocale, getTranslations } from "next-intl/server";
import {
  getDailySummary,
  getOverallSummary,
  getRangeSummary,
  type DailySummary,
} from "@/db/queries/reports";
import { authorize } from "@/lib/auth/session";
import { dateRangeSchema } from "@/lib/validation/donation";
import { MAX_RANGE_DAYS, periodText, rangeDays } from "./shared";

export type IesRow = Pick<DailySummary, "date" | "income" | "expenditure" | "savings">;

export type IesReportData = {
  period: string;
  totals: Pick<DailySummary, "income" | "expenditure" | "savings">;
  rows: IesRow[];
};

export type IesReportLabels = {
  title: string;
  date: string;
  income: string;
  expenditure: string;
  savings: string;
  total: string;
  overall: string;
};

export async function prepareIesReport(request: Request) {
  const user = await authorize("report:download");
  if (!user) return { error: new Response("Forbidden", { status: 403 }) } as const;

  const url = new URL(request.url);
  const overall = url.searchParams.get("overall") === "true";
  const [t, locale] = await Promise.all([
    getTranslations("reports"),
    getLocale(),
  ]);

  let data: IesReportData;
  if (overall) {
    const summary = await getOverallSummary();
    data = {
      period: t("overall"),
      totals: summary,
      rows: [{ date: "", income: summary.income, expenditure: summary.expenditure, savings: summary.savings }],
    };
  } else {
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") || from;
    const parsed = dateRangeSchema.safeParse({ from, to });
    if (!parsed.success || rangeDays(from, to) > MAX_RANGE_DAYS) {
      return { error: new Response("Invalid date range", { status: 400 }) } as const;
    }

    if (from === to) {
      const summary = await getDailySummary(from);
      data = {
        period: periodText(from, to, locale),
        totals: summary,
        rows: [summary],
      };
    } else {
      const summary = await getRangeSummary(from, to);
      data = {
        period: periodText(from, to, locale),
        totals: summary.totals,
        rows: summary.rows,
      };
    }
  }

  return {
    data,
    locale,
    labels: {
      title: t("incomeExpSavingsReport"),
      date: t("date"),
      income: t("income"),
      expenditure: t("expenditure"),
      savings: t("savings"),
      total: t("grandTotal"),
      overall: t("overall"),
    } satisfies IesReportLabels,
  } as const;
}