import { getTranslations } from "next-intl/server";
import { createDonationAction } from "@/actions/donations";
import { idleState } from "@/actions/types";
import { DonationForm } from "@/components/donation-form";
import { Card, PageTitle } from "@/components/ui";
import { requirePermission } from "@/lib/auth/session";
import { todayInNepal } from "@/lib/format";

export default async function NewDonationPage() {
  await requirePermission("donation:create");
  const t = await getTranslations("donation");
  return (
    <div className="mx-auto max-w-xl">
      <PageTitle>{t("addTitle")}</PageTitle>
      <Card>
        <DonationForm action={createDonationAction} initialState={idleState} today={todayInNepal()} />
      </Card>
    </div>
  );
}
