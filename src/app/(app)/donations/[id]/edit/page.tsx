import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { updateDonationAction } from "@/actions/donations";
import { DonationForm } from "@/components/donation-form";
import { Card, PageTitle } from "@/components/ui";
import { getDonation } from "@/db/queries/donations";
import { requirePermission } from "@/lib/auth/session";
import { todayInNepal } from "@/lib/format";

export default async function EditDonationPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("donation:edit");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const d = await getDonation(id);
  if (!d) notFound();
  const t = await getTranslations("donation");
  return (
    <div className="mx-auto max-w-xl">
      <PageTitle>{t("editTitle")}</PageTitle>
      <Card>
        <DonationForm
          action={updateDonationAction}
          donationId={d.id}
          today={todayInNepal()}
          cancelHref="/donations"
          initialState={{
            status: "idle",
            errors: {},
            values: {
              donorName: d.donorName,
              address: d.address,
              phone: d.phone,
              amount: d.amount,
              donationDate: d.donationDate,
              remarks: d.remarks ?? "",
            },
          }}
        />
      </Card>
    </div>
  );
}
