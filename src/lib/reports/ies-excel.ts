import "server-only";
import ExcelJS from "exceljs";
import { formatDate } from "@/lib/format";
import type { IesReportData, IesReportLabels } from "./ies-handler";

const NPR_FORMAT = "[>=10000000]##\\,##\\,##\\,##0.00;[>=100000]##\\,##\\,##0.00;##,##0.00";

export async function buildIesExcel(data: IesReportData, labels: IesReportLabels, locale: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Income-Expenditure", { views: [{ state: "frozen", ySplit: 8 }] });

  sheet.mergeCells("A1:D1");
  sheet.getCell("A1").value = labels.title;
  sheet.getCell("A1").font = { bold: true, size: 14 };
  sheet.mergeCells("A2:D2");
  sheet.getCell("A2").value = data.period;

  const summaryRows = [
    [labels.income, Number(data.totals.income)],
    [labels.expenditure, Number(data.totals.expenditure)],
    [labels.savings, Number(data.totals.savings)],
  ];
  summaryRows.forEach(([label, amount], index) => {
    const row = sheet.getRow(index + 4);
    row.values = [label, amount];
    row.getCell(2).numFmt = NPR_FORMAT;
    if (index === 2) row.font = { bold: true };
  });

  const header = sheet.getRow(8);
  header.values = [labels.date, labels.income, labels.expenditure, labels.savings];
  header.font = { bold: true };
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
    cell.border = { bottom: { style: "thin" } };
  });

  data.rows.forEach((item) => {
    const row = sheet.addRow([
      item.date ? formatDate(item.date, locale) : labels.overall,
      Number(item.income),
      Number(item.expenditure),
      Number(item.savings),
    ]);
    [2, 3, 4].forEach((column) => { row.getCell(column).numFmt = NPR_FORMAT; });
  });

  const firstDataRow = 9;
  const lastDataRow = firstDataRow + data.rows.length - 1;
  const totals = sheet.addRow([
    labels.total,
    { formula: `SUM(B${firstDataRow}:B${Math.max(lastDataRow, firstDataRow)})`, result: Number(data.totals.income) },
    { formula: `SUM(C${firstDataRow}:C${Math.max(lastDataRow, firstDataRow)})`, result: Number(data.totals.expenditure) },
    { formula: `SUM(D${firstDataRow}:D${Math.max(lastDataRow, firstDataRow)})`, result: Number(data.totals.savings) },
  ]);
  totals.font = { bold: true };
  [2, 3, 4].forEach((column) => { totals.getCell(column).numFmt = NPR_FORMAT; });
  totals.eachCell((cell) => { cell.border = { top: { style: "thin" } }; });

  [24, 18, 18, 18].forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
  return Buffer.from(await workbook.xlsx.writeBuffer());
}