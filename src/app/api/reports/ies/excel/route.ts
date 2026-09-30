import { prepareIesReport } from "@/lib/reports/ies-handler";
import { buildIesExcel } from "@/lib/reports/ies-excel";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const result = await prepareIesReport(request);
  if ("error" in result) return result.error;

  const buffer = await buildIesExcel(result.data, result.labels, result.locale);
  const params = new URL(request.url).searchParams;
  const from = params.get("from");
  const to = params.get("to") || from;
  const filename = params.get("overall") === "true"
    ? "income-expenditure-savings-overall.xlsx"
    : `income-expenditure-savings-${from}-${to}.xlsx`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}