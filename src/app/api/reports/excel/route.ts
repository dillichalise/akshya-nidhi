import { buildExcel } from "@/lib/reports/excel";
import { prepareReport } from "@/lib/reports/handler";
import { fileBase } from "@/lib/reports/shared";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const r = await prepareReport(request);
  if ("error" in r) return r.error;
  const buf = await buildExcel(r.data, r.labels, r.locale);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileBase(r.data.from, r.data.to)}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
