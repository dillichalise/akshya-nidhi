import { getTranslations } from "next-intl/server";
import { CreateUserForm } from "@/components/user-forms";
import { Card, PageTitle } from "@/components/ui";
import { requirePermission } from "@/lib/auth/session";

export default async function NewUserPage() {
  await requirePermission("user:manage");
  const t = await getTranslations("users");
  return (
    <div className="mx-auto max-w-xl">
      <PageTitle>{t("new")}</PageTitle>
      <Card>
        <CreateUserForm />
      </Card>
    </div>
  );
}
