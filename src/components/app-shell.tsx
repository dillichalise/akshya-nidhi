import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { logoutAction } from "@/actions/auth";
import { can, type Permission } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";
import { LanguageSwitcher } from "./language-switcher";

const items: { href: string; key: string; perm: Permission }[] = [
  { href: "/dashboard", key: "dashboard", perm: "dashboard:view" },
  { href: "/donations/new", key: "addDonation", perm: "donation:create" },
  { href: "/donations", key: "donations", perm: "donation:list" },
  { href: "/reports", key: "reports", perm: "report:download" },
  { href: "/users", key: "users", perm: "user:list" },
];

export async function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const t = await getTranslations();
  // Nav filtering is cosmetic — every page and action re-checks permissions on the server.
  const nav = items.filter((i) => can(user.role, i.perm));
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
          <div className="leading-tight">
            <div className="text-lg font-semibold text-amber-800">{t("common.appName")}</div>
            <div className="text-xs text-stone-500">{t("common.appTagline")}</div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <div className="hidden text-right text-sm leading-tight sm:block">
              <div className="font-medium">{user.fullName}</div>
              <div className="text-xs text-stone-500">{t(`users.roles.${user.role}`)}</div>
            </div>
            <form action={logoutAction}>
              <button className="min-h-9 rounded-lg border border-stone-300 px-3 text-sm hover:bg-stone-50">
                {t("common.logout")}
              </button>
            </form>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-2" aria-label="Main">
          {nav.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-stone-700 hover:bg-amber-50 hover:text-amber-900"
            >
              {t(`nav.${i.key}`)}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
