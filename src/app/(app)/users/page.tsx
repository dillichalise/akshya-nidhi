import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { btnGhost, btnPrimary, Card, PageTitle } from "@/components/ui";
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
      <Card className="!p-0 overflow-x-auto">
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
                      className={btnGhost + " !min-h-9 !px-3 !py-1 text-sm"}
                    >
                      {tc("edit")}
                    </Link>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
