import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { EditUserForm, ResetPasswordForm } from "@/components/user-forms";
import { Card, PageTitle } from "@/components/ui";
import { getUserById } from "@/db/queries/users";
import { requirePermission } from "@/lib/auth/session";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("user:manage");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const user = await getUserById(id);
  if (!user) notFound();
  const t = await getTranslations("users");
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageTitle>
        {t("editTitle")}: {user.username}
      </PageTitle>
      <Card>
        <EditUserForm user={user} />
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-semibold">{t("resetTitle")}</h2>
        <ResetPasswordForm userId={user.id} />
      </Card>
    </div>
  );
}
