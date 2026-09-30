import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { updateExpenditureAction } from "@/actions/expenditures";
import { ExpenditureForm } from "@/components/expenditure-form";
import { Card, PageTitle } from "@/components/ui";
import { getExpenditure } from "@/db/queries/expenditures";
import { requirePermission } from "@/lib/auth/session";
import { todayInNepal } from "@/lib/format";

export default async function EditExpenditurePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("expenditure:edit");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const e = await getExpenditure(id);
  if (!e) notFound();
  const t = await getTranslations("expenditure");
  return (
    <div className="mx-auto max-w-xl">
      <PageTitle>{t("editTitle")}</PageTitle>
      <Card>
        <ExpenditureForm
          action={updateExpenditureAction}
          expenditureId={e.id}
          today={todayInNepal()}
          cancelHref="/expenditures"
          initialState={{
            status: "idle",
            errors: {},
            values: {
              title: e.title,
              amount: e.amount,
              returnAmount: e.returnAmount,
              expenditureDate: e.expenditureDate,
              remarks: e.remarks ?? "",
            },
          }}
        />
      </Card>
    </div>
  );
}
