import { prepareReport } from "@/lib/reports/handler";
import { buildPdf } from "@/lib/reports/pdf";
import { fileBase } from "@/lib/reports/shared";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const r = await prepareReport(request);
  if ("error" in r) return r.error;
  const buf = await buildPdf(r.data, r.labels, r.locale);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileBase(r.data.from, r.data.to)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
