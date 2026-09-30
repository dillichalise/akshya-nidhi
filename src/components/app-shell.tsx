import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { logoutAction } from "@/actions/auth";
import { can, type Permission } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";
import { LanguageSwitcher } from "./language-switcher";
import { NavDrawer } from "./nav-drawer";

const items: { href: string; key: string; perm: Permission }[] = [
  { href: "/dashboard", key: "dashboard", perm: "dashboard:view" },
  { href: "/donations/new", key: "addDonation", perm: "donation:create" },
  { href: "/donations", key: "donations", perm: "donation:list" },
  { href: "/donors", key: "donors", perm: "donation:list" },
  { href: "/expenditures", key: "expenditures", perm: "expenditure:list" },
  { href: "/reports", key: "reports", perm: "report:download" },
  { href: "/users", key: "users", perm: "user:list" },
];

export async function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const t = await getTranslations();
  // Nav filtering is cosmetic — every page and action re-checks permissions on the server.
  const nav = items.filter((i) => can(user.role, i.perm));
  const navItems = nav.map((i) => ({ href: i.href, label: t(`nav.${i.key}`) }));

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          {/* Hamburger — renders the button + drawer, visible only below md */}
          <NavDrawer
            items={navItems}
            user={{
              fullName: user.fullName,
              role: t(`users.roles.${user.role}`),
            }}
            logoutLabel={t("common.logout")}
            logoutAction={logoutAction}
          />

          {/* App name */}
          <div className="min-w-0 flex-1 leading-tight md:flex-none">
            <div className="truncate text-base font-semibold text-amber-800 sm:text-lg">
              {t("common.appName")}
            </div>
            <div className="hidden text-xs text-stone-500 sm:block">
              {t("common.appTagline")}
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            {/* User name/role — desktop only */}
            <div className="hidden text-right text-sm leading-tight md:block">
              <div className="font-medium">{user.fullName}</div>
              <div className="text-xs text-stone-500">
                {t(`users.roles.${user.role}`)}
              </div>
            </div>
            {/* Logout — desktop only (mobile users log out from the drawer) */}
            <form action={logoutAction} className="hidden md:block">
              <button
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-600 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-600/30"
                aria-label={t("common.logout")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                {t("common.logout")}
              </button>
            </form>
          </div>
        </div>

        {/* Horizontal tab bar — desktop only */}
        <nav
          className="mx-auto hidden max-w-6xl gap-0.5 overflow-x-auto px-3 pb-1 md:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Main"
        >
          {nav.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className="whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-amber-50 hover:text-amber-900 active:bg-amber-100"
            >
              {t(`nav.${i.key}`)}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-4 sm:py-6">
        {children}
      </main>
    </div>
  );
}
