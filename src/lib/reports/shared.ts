import { formatDate } from "@/lib/format";

export type ReportRow = {
  id: string;
  donorName: string;
  address: string;
  phone: string;
  amount: string;
  donationDate: string;
  remarks: string | null;
};

export type ReportData = {
  from: string;
  to: string;
  rows: ReportRow[];
  total: string;
  count: number;
  summary: { income: string; expenditure: string; savings: string };
};

export type ReportLabels = {
  title: string;
  period: string;
  generatedOn: string;
  generatedBy: string;
  grandTotal: string;
  records: string;
  sn: string;
  date: string;
  name: string;
  phone: string;
  address: string;
  amount: string;
  remarks: string;
  page: string;
  summaryHeader: string;
  income: string;
  expenditure: string;
  savings: string;
};

/** Longest range a report may span (keeps serverless exports bounded). */
export const MAX_RANGE_DAYS = 731;

export function rangeDays(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
}

export function periodText(from: string, to: string, locale: string): string {
  return from === to ? formatDate(from, locale) : `${formatDate(from, locale)} – ${formatDate(to, locale)}`;
}

export function fileBase(from: string, to: string): string {
  return from === to ? `donations_${from}` : `donations_${from}_to_${to}`;
}
