import { getTranslations } from "next-intl/server";
import { createExpenditureAction } from "@/actions/expenditures";
import { idleState } from "@/actions/types";
import { ExpenditureForm } from "@/components/expenditure-form";
import { Card, PageTitle } from "@/components/ui";
import { requirePermission } from "@/lib/auth/session";
import { todayInNepal } from "@/lib/format";

export default async function NewExpenditurePage() {
  await requirePermission("expenditure:create");
  const t = await getTranslations("expenditure");
  return (
    <div className="mx-auto max-w-xl">
      <PageTitle>{t("addTitle")}</PageTitle>
      <Card>
        <ExpenditureForm
          action={createExpenditureAction}
          initialState={idleState}
          today={todayInNepal()}
        />
      </Card>
    </div>
  );
}
