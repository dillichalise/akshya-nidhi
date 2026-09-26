import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LoginForm } from "@/components/login-form";
import { Card } from "@/components/ui";
import { homePathFor } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(homePathFor(user.role));
  const t = await getTranslations();
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-4 px-4 py-8">
      <div className="flex justify-end">
        <LanguageSwitcher />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-amber-800">{t("common.appName")}</h1>
        <p className="text-sm text-stone-500">{t("login.subtitle")}</p>
      </div>
      <Card>
        <h2 className="mb-4 text-lg font-semibold">{t("login.title")}</h2>
        <LoginForm />
      </Card>
    </main>
  );
}
