import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { deleteDonationAction } from "@/actions/donations";
import { DonationFilters } from "@/components/donation-filters";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Pagination } from "@/components/pagination";
import { btnGhost, btnPrimary, Card, PageTitle } from "@/components/ui";
import { listDonations } from "@/db/queries/donations";
import { can } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { formatDate, formatNPR } from "@/lib/format";

const PAGE_SIZE = 20;
const ymd = /^\d{4}-\d{2}-\d{2}$/;

export default async function DonationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string; page?: string }>;
}) {
  const user = await requirePermission("donation:list");
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 100) || undefined;
  const from = sp.from && ymd.test(sp.from) ? sp.from : undefined;
  const to = sp.to && ymd.test(sp.to) ? sp.to : undefined;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const [{ rows, total }, t, tc, tn, tr, locale] = await Promise.all([
    listDonations({ q, from, to, page, pageSize: PAGE_SIZE }),
    getTranslations("donation"),
    getTranslations("common"),
    getTranslations("nav"),
    getTranslations("receipt"),
    getLocale(),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canEdit = can(user.role, "donation:edit");
  const canDelete = can(user.role, "donation:delete");
  const canReceipt = can(user.role, "donation:receipt");

  const hrefFor = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (from) u.set("from", from);
    if (to) u.set("to", to);
    u.set("page", String(p));
    return `/donations?${u}`;
  };

  return (
    <div>
      <PageTitle
        actions={
          <Link href="/donations/new" className={btnPrimary}>
            {tn("addDonation")}
          </Link>
        }
      >
        {t("listTitle")}
      </PageTitle>

      <Card className="mb-4">
        <DonationFilters key={`${q ?? ""}|${from ?? ""}|${to ?? ""}`} q={q ?? ""} from={from ?? ""} to={to ?? ""} />
      </Card>

      <p className="mb-2 text-sm text-stone-600">{tc("records", { count: total })}</p>

      {rows.length === 0 ? (
        <Card>
          <p className="text-stone-600">{tc("noData")}</p>
        </Card>
      ) : (
        <>
          {/* Table on wide screens */}
          <div className="hidden overflow-x-auto rounded-xl border border-stone-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-stone-600">
                <tr>
                  <th className="px-3 py-2">{t("date")}</th>
                  <th className="px-3 py-2">{t("name")}</th>
                  <th className="px-3 py-2">{t("phone")}</th>
                  <th className="px-3 py-2">{t("address")}</th>
                  <th className="px-3 py-2 text-right">{t("amount")}</th>
                  <th className="px-3 py-2">{t("remarks")}</th>
                  <th className="px-3 py-2">{t("addedBy")}</th>
                  {(canEdit || canDelete || canReceipt) && <th className="px-3 py-2">{tc("actions")}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="whitespace-nowrap px-3 py-2">{formatDate(r.donationDate, locale)}</td>
                    <td className="px-3 py-2 font-medium">{r.donorName}</td>
                    <td className="whitespace-nowrap px-3 py-2">{r.phone}</td>
                    <td className="px-3 py-2">{r.address}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatNPR(r.amount)}</td>
                    <td className="max-w-48 px-3 py-2 text-stone-600">{r.remarks}</td>
                    <td className="px-3 py-2 text-stone-600">{r.createdByName}</td>
                    {(canEdit || canDelete || canReceipt) && (
                      <td className="whitespace-nowrap px-3 py-2">
                        <div className="flex gap-2">
                          {canReceipt && (
                            <a
                              href={`/api/donations/${r.id}/receipt`}
                              className={btnGhost + " !min-h-9 !px-3 !py-1 text-sm"}
                            >
                              {tr("linkLabel")}
                            </a>
                          )}
                          {canEdit && (
                            <Link href={`/donations/${r.id}/edit`} className={btnGhost + " !min-h-9 !px-3 !py-1 text-sm"}>
                              {tc("edit")}
                            </Link>
                          )}
                          {canDelete && (
                            <form action={deleteDonationAction}>
                              <input type="hidden" name="id" value={r.id} />
                              <ConfirmDeleteButton />
                            </form>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards on phones */}
          <ul className="space-y-3 md:hidden">
            {rows.map((r) => (
              <li key={r.id} className="rounded-xl border border-stone-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{r.donorName}</div>
                    <div className="text-sm text-stone-600">
                      {r.phone} · {r.address}
                    </div>
                  </div>
                  <div className="text-right font-semibold tabular-nums">{formatNPR(r.amount)}</div>
                </div>
                <div className="mt-1 text-sm text-stone-500">
                  {formatDate(r.donationDate, locale)} · {r.createdByName}
                </div>
                {r.remarks && <div className="mt-1 text-sm text-stone-600">{r.remarks}</div>}
                {(canEdit || canDelete || canReceipt) && (
                  <div className="mt-3 flex gap-2">
                    {canReceipt && (
                      <a href={`/api/donations/${r.id}/receipt`} className={btnGhost + " !min-h-9 !px-3 !py-1 text-sm"}>
                        {tr("linkLabel")}
                      </a>
                    )}
                    {canEdit && (
                      <Link href={`/donations/${r.id}/edit`} className={btnGhost + " !min-h-9 !px-3 !py-1 text-sm"}>
                        {tc("edit")}
                      </Link>
                    )}
                    {canDelete && (
                      <form action={deleteDonationAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <ConfirmDeleteButton />
                      </form>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      <Pagination page={page} pages={pages} hrefFor={hrefFor} />
    </div>
  );
}
