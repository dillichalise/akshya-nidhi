import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { btnPrimary, PageTitle } from "@/components/ui";
import { listUsers } from "@/db/queries/users";
import { can } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { dateInNepal, formatDate } from "@/lib/format";

export default async function UsersPage() {
  const me = await requirePermission("user:list");
  const [users, t, tc, locale] = await Promise.all([
    listUsers(),
    getTranslations("users"),
    getTranslations("common"),
    getLocale(),
  ]);
  const canManage = can(me.role, "user:manage");
  return (
    <div>
      <PageTitle
        actions={
          canManage && (
            <Link href="/users/new" className={btnPrimary}>
              {t("new")}
            </Link>
          )
        }
      >
        {t("title")}
      </PageTitle>

      {/* Table — md and above */}
      <div className="hidden overflow-x-auto rounded-xl border border-stone-200 bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-stone-600">
            <tr>
              <th className="px-3 py-2">{t("fullName")}</th>
              <th className="px-3 py-2">{t("username")}</th>
              <th className="px-3 py-2">{t("phone")}</th>
              <th className="px-3 py-2">{t("role")}</th>
              <th className="px-3 py-2">{t("status")}</th>
              <th className="px-3 py-2">{t("createdAt")}</th>
              {canManage && <th className="px-3 py-2">{tc("actions")}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-3 py-2 font-medium">{u.fullName}</td>
                <td className="px-3 py-2">{u.username}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  {u.phone ? (
                    <a
                      href={`tel:${u.phone}`}
                      className="text-amber-700 underline underline-offset-2 hover:text-amber-900"
                    >
                      {u.phone}
                    </a>
                  ) : (
                    <span className="text-stone-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2">{t(`roles.${u.role}`)}</td>
                <td className="px-3 py-2">
                  <span
                    className={u.isActive ? "text-green-700" : "text-stone-400"}
                  >
                    {u.isActive ? t("active") : t("inactive")}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {formatDate(dateInNepal(u.createdAt), locale)}
                </td>
                {canManage && (
                  <td className="px-3 py-2">
                    <Link
                      href={`/users/${u.id}`}
                      title={tc("edit")}
                      aria-label={tc("edit")}
                      className="group relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-600 hover:bg-stone-50 hover:text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600/30"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      <span
                        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-stone-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                        role="tooltip"
                      >
                        {tc("edit")}
                      </span>
                    </Link>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards — below md */}
      <ul className="space-y-3 md:hidden">
        {users.map((u) => (
          <li
            key={u.id}
            className="rounded-xl border border-stone-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium">{u.fullName}</div>
                <div className="text-xs text-stone-500">@{u.username}</div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-stone-600">
                  <span
                    className={
                      u.isActive
                        ? "font-medium text-green-700"
                        : "text-stone-400"
                    }
                  >
                    {u.isActive ? t("active") : t("inactive")}
                  </span>
                  <span>{t(`roles.${u.role}`)}</span>
                  {u.phone && (
                    <a
                      href={`tel:${u.phone}`}
                      className="text-amber-700 underline underline-offset-2 hover:text-amber-900"
                    >
                      {u.phone}
                    </a>
                  )}
                </div>
                <div className="mt-1 text-xs text-stone-400">
                  {formatDate(dateInNepal(u.createdAt), locale)}
                </div>
              </div>
              {canManage && (
                <Link
                  href={`/users/${u.id}`}
                  title={tc("edit")}
                  aria-label={tc("edit")}
                  className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-600 hover:bg-stone-50 hover:text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600/30"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
