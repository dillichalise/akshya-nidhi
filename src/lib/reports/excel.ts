import "server-only";
import ExcelJS from "exceljs";
import { formatDate } from "@/lib/format";
import type { ReportData, ReportLabels } from "./shared";

// Lakh/crore digit grouping (Nepal/India style) for the amount cells.
const NPR_FORMAT = "[>=10000000]##\\,##\\,##\\,##0.00;[>=100000]##\\,##\\,##0.00;##,##0.00";

export async function buildExcel(data: ReportData, labels: ReportLabels, locale: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Donations", { views: [{ state: "frozen", ySplit: 5 }] });

  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = labels.title;
  ws.getCell("A1").font = { bold: true, size: 14 };
  ws.mergeCells("A2:G2");
  ws.getCell("A2").value = labels.period;
  ws.mergeCells("A3:G3");
  ws.getCell("A3").value = `${labels.generatedOn} · ${labels.generatedBy}`;
  ws.getCell("A3").font = { color: { argb: "FF6B7280" } };

  const header = ws.getRow(5);
  header.values = [labels.sn, labels.date, labels.name, labels.phone, labels.address, labels.amount, labels.remarks];
  header.font = { bold: true };
  header.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
    c.border = { bottom: { style: "thin" } };
  });

  data.rows.forEach((r, i) => {
    const row = ws.addRow([
      i + 1,
      formatDate(r.donationDate, locale),
      r.donorName,
      r.phone,
      r.address,
      Number(r.amount),
      r.remarks ?? "",
    ]);
    row.getCell(4).numFmt = "@"; // phone as text so leading zeros survive
    row.getCell(6).numFmt = NPR_FORMAT;
  });

  const first = 6;
  const last = 5 + data.rows.length;
  const total = ws.addRow(["", "", "", "", labels.grandTotal, { formula: `SUM(F${first}:F${Math.max(last, first)})`, result: Number(data.total) }, ""]);
  total.font = { bold: true };
  total.getCell(6).numFmt = NPR_FORMAT;
  total.eachCell((c) => (c.border = { top: { style: "thin" } }));
  ws.addRow(["", "", "", "", labels.records, data.count]).font = { color: { argb: "FF6B7280" } };

  [6, 16, 28, 16, 36, 18, 36].forEach((w, i) => (ws.getColumn(i + 1).width = w));

  return Buffer.from(await wb.xlsx.writeBuffer());
}
