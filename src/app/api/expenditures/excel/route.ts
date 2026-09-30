import "server-only";
import ExcelJS from "exceljs";
import { getExpenditureReport } from "@/db/queries/expenditures";
import { authorize } from "@/lib/auth/session";
import { dateRangeSchema } from "@/lib/validation/donation";
import { formatDate, toNepaliDigits } from "@/lib/format";
import { getLocale } from "next-intl/server";

export const runtime = "nodejs";

const NPR_FORMAT = "[>=10000000]##\\,##\\,##\\,##0.00;[>=100000]##\\,##\\,##0.00;##,##0.00";

export async function GET(request: Request) {
  const user = await authorize("expenditure:list");
  if (!user) return new Response("Forbidden", { status: 403 });

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? undefined;
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? from ?? undefined;

  // Validate date range if provided
  if (from && to) {
    const parsed = dateRangeSchema.safeParse({ from, to });
    if (!parsed.success) {
      return new Response("Invalid date range", { status: 400 });
    }
  }

  const locale = await getLocale();

  // If no date range, fetch all expenditures by using a very broad range
  const reportFrom = from ?? "2020-01-01";
  const reportTo = to ?? "2099-12-31";

  const { rows, totals, count } = await getExpenditureReport(reportFrom, reportTo);

  // Filter by title if q is provided (since getExpenditureReport doesn't accept q param)
  const filteredRows = q
    ? rows.filter((r) => r.title.toLowerCase().includes(q.toLowerCase()))
    : rows;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Expenditures", { views: [{ state: "frozen", ySplit: 5 }] });

  // Title row
  ws.mergeCells("A1:H1");
  ws.getCell("A1").value = "Expenditure Report";
  ws.getCell("A1").font = { bold: true, size: 14 };

  // Period row
  ws.mergeCells("A2:H2");
  const periodText =
    from && to && from === to
      ? formatDate(from, locale)
      : from && to
        ? `${formatDate(from, locale)} – ${formatDate(to, locale)}`
        : "All records";
  ws.getCell("A2").value = periodText;

  // Filter info
  if (q) {
    ws.mergeCells("A3:H3");
    ws.getCell("A3").value = `Filtered by: "${q}"`;
    ws.getCell("A3").font = { color: { argb: "FF6B7280" } };
  }

  // Header row
  const header = ws.getRow(5);
  header.values = [
    "S.N.",
    "Date",
    "Title",
    "Amount",
    "Return Amount",
    "Actual Spend",
    "Remarks",
    "Added By",
  ];
  header.font = { bold: true };
  header.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
    c.border = { bottom: { style: "thin" } };
  });

  // Data rows
  filteredRows.forEach((r, i) => {
    const net = Number(r.amount) - Number(r.returnAmount);
    const row = ws.addRow([
      toNepaliDigits(i + 1, locale),
      formatDate(r.expenditureDate, locale),
      r.title,
      Number(r.amount),
      Number(r.returnAmount),
      net,
      r.remarks ?? "",
      r.createdByName ?? "",
    ]);
    row.getCell(4).numFmt = NPR_FORMAT;
    row.getCell(5).numFmt = NPR_FORMAT;
    row.getCell(6).numFmt = NPR_FORMAT;
  });

  // Totals row
  const first = 6;
  const last = 5 + filteredRows.length;
  const totalRow = ws.addRow([
    "",
    "",
    "TOTAL",
    { formula: `SUM(D${first}:D${Math.max(last, first)})`, result: Number(totals.amount) },
    { formula: `SUM(E${first}:E${Math.max(last, first)})`, result: Number(totals.returnAmount) },
    { formula: `SUM(F${first}:F${Math.max(last, first)})`, result: Number(totals.net) },
    "",
    "",
  ]);
  totalRow.font = { bold: true };
  totalRow.getCell(4).numFmt = NPR_FORMAT;
  totalRow.getCell(5).numFmt = NPR_FORMAT;
  totalRow.getCell(6).numFmt = NPR_FORMAT;
  totalRow.eachCell((c) => (c.border = { top: { style: "thin" } }));

  // Record count
  ws.addRow(["", "", `${toNepaliDigits(count, locale)} records`, "", "", "", "", ""]).font = {
    color: { argb: "FF6B7280" },
  };

  // Column widths
  [6, 16, 32, 18, 18, 18, 36, 24].forEach((w, i) => (ws.getColumn(i + 1).width = w));

  const buffer = Buffer.from(await wb.xlsx.writeBuffer());

  const filename = from && to && from === to
    ? `expenditures-${from}.xlsx`
    : from && to
      ? `expenditures-${from}-to-${to}.xlsx`
      : "expenditures-all.xlsx";

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
