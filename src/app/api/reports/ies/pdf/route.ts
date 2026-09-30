import { prepareIesReport } from "@/lib/reports/ies-handler";
import { buildIesPdf } from "@/lib/reports/ies-pdf";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const result = await prepareIesReport(request);
  if ("error" in result) return result.error;

  const buffer = await buildIesPdf(result.data, result.labels, result.locale);
  const filename = result.data.period === result.labels.overall
    ? "income-expenditure-savings-overall.pdf"
    : `income-expenditure-savings-${new URL(request.url).searchParams.get("from")}-${new URL(request.url).searchParams.get("to") || new URL(request.url).searchParams.get("from")}.pdf`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}