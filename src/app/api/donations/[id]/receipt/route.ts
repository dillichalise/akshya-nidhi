import { getDonationForReceipt } from "@/db/queries/donations";
import { authorize } from "@/lib/auth/session";
import { getReceiptLabels } from "@/lib/receipts/labels";
import { buildReceiptPdf } from "@/lib/receipts/pdf";
import { receiptFileName } from "@/lib/receipts/shared";

export const runtime = "nodejs";

const UUID = /^[0-9a-f-]{36}$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await authorize("donation:receipt");
  if (!user) return new Response("Forbidden", { status: 403 });

  const { id } = await params;
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });

  const donation = await getDonationForReceipt(id);
  if (!donation) return new Response("Not found", { status: 404 });
  // Data-entry staff can only reprint receipts for donations they recorded themselves;
  // admins/super_admins (who already see the full donations list) may fetch any.
  if (user.role === "user" && donation.createdBy !== user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  const { labels, locale } = await getReceiptLabels(donation);
  const buf = await buildReceiptPdf(donation, labels, locale);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${receiptFileName(donation)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
