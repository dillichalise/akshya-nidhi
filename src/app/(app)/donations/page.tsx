import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { deleteDonationAction } from "@/actions/donations";
import { DonationFilters } from "@/components/donation-filters";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Pagination } from "@/components/pagination";
import { ReceiptPreviewButton } from "@/components/receipt-preview-button";
import { btnPrimary, Card, PageTitle } from "@/components/ui";
import {
  listDonations,
  type SortColumn,
  type SortOrder,
} from "@/db/queries/donations";
import { can } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { formatDate, formatNPR, localizedCount } from "@/lib/format";
import { receiptFileName } from "@/lib/receipts/shared";

const PAGE_SIZE = 20;
const ymd = /^\d{4}-\d{2}-\d{2}$/;
const SORT_COLS = new Set<string>([
  "donationDate",
  "donorName",
  "address",
  "amount",
]);

/** Chevron icons for sort direction indicator */
function SortIcon({ active, order }: { active: boolean; order: SortOrder }) {
  if (!active) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="ml-1 inline h-3 w-3 opacity-30"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 5v14M5 12l7-7 7 7" />
      </svg>
    );
  }
  return order === "asc" ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="ml-1 inline h-3 w-3 text-amber-700"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="ml-1 inline h-3 w-3 text-amber-700"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12l7 7 7-7" />
    </svg>
  );
}

export default async function DonationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    from?: string;
    to?: string;
    page?: string;
    sort?: string;
    order?: string;
  }>;
}) {
  const user = await requirePermission("donation:list");
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 100) || undefined;
  const from = sp.from && ymd.test(sp.from) ? sp.from : undefined;
  const to = sp.to && ymd.test(sp.to) ? sp.to : undefined;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const sort: SortColumn | undefined = SORT_COLS.has(sp.sort ?? "")
    ? (sp.sort as SortColumn)
    : undefined;
  const order: SortOrder = sp.order === "asc" ? "asc" : "desc";

  const [{ rows, total }, t, tc, tn, locale] = await Promise.all([
    listDonations({ q, from, to, page, pageSize: PAGE_SIZE, sort, order }),
    getTranslations("donation"),
    getTranslations("common"),
    getTranslations("nav"),
    getLocale(),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canEdit = can(user.role, "donation:edit");
  const canDelete = can(user.role, "donation:delete");
  const canReceipt = can(user.role, "donation:receipt");

  /** Build a URL preserving all current params but changing sort/order/page */
  const sortHref = (col: SortColumn) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (from) u.set("from", from);
    if (to) u.set("to", to);
    u.set("page", "1");
    u.set("sort", col);
    // Toggle direction if already sorted on this col, otherwise default to asc
    u.set("order", sort === col && order === "asc" ? "desc" : "asc");
    return `/donations?${u}`;
  };

  const hrefFor = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (from) u.set("from", from);
    if (to) u.set("to", to);
    if (sort) u.set("sort", sort);
    if (sort) u.set("order", order);
    u.set("page", String(p));
    return `/donations?${u}`;
  };

  const SortTh = ({
    col,
    className,
    children,
  }: {
    col: SortColumn;
    className?: string;
    children: React.ReactNode;
  }) => (
    <th className={`px-3 py-2 ${className ?? ""}`}>
      <Link
        href={sortHref(col)}
        className="inline-flex items-center gap-0.5 hover:text-amber-800"
      >
        {children}
        <SortIcon active={sort === col} order={order} />
      </Link>
    </th>
  );

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
        <DonationFilters
          key={`${q ?? ""}|${from ?? ""}|${to ?? ""}`}
          q={q ?? ""}
          from={from ?? ""}
          to={to ?? ""}
        />
      </Card>

      <p className="mb-2 text-sm text-stone-600">
        {tc("records", { count: localizedCount(total, locale) })}
      </p>

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
                  <SortTh col="donationDate">{t("date")}</SortTh>
                  <SortTh col="donorName">{t("name")}</SortTh>
                  <th className="px-3 py-2">{t("phone")}</th>
                  <SortTh col="address">{t("address")}</SortTh>
                  <SortTh col="amount" className="text-right">
                    {t("amount")}
                  </SortTh>
                  <th className="px-3 py-2">{t("remarks")}</th>
                  <th className="px-3 py-2">{t("addedBy")}</th>
                  {(canEdit || canDelete || canReceipt) && (
                    <th className="px-3 py-2">{tc("actions")}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="whitespace-nowrap px-3 py-2">
                      {formatDate(r.donationDate, locale)}
                    </td>
                    <td className="px-3 py-2 font-medium">{r.donorName}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <a
                        href={`tel:${r.phone}`}
                        className="text-amber-700 underline underline-offset-2 hover:text-amber-900"
                      >
                        {r.phone}
                      </a>
                    </td>
                    <td className="px-3 py-2">{r.address}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                      {formatNPR(r.amount, locale)}
                    </td>
                    <td className="max-w-48 px-3 py-2 text-stone-600">
                      {r.remarks}
                    </td>
                    <td className="px-3 py-2 text-stone-600">
                      {r.createdByName}
                    </td>
                    {(canEdit || canDelete || canReceipt) && (
                      <td className="whitespace-nowrap px-3 py-2">
                        <div className="flex gap-1">
                          {canReceipt && (
                            <ReceiptPreviewButton
                              receiptUrl={`/api/donations/${r.id}/receipt`}
                              fileName={`${receiptFileName(r)}.pdf`}
                            />
                          )}
                          {canEdit && (
                            <Link
                              href={`/donations/${r.id}/edit`}
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
                          )}
                          {canDelete && (
                            <form
                              action={deleteDonationAction}
                              className="relative"
                            >
                              <input type="hidden" name="id" value={r.id} />
                              <ConfirmDeleteButton
                                iconOnly
                                tooltip={tc("delete")}
                              />
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
              <li
                key={r.id}
                className="rounded-xl border border-stone-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{r.donorName}</div>
                    <div className="text-sm text-stone-600">
                      <a
                        href={`tel:${r.phone}`}
                        className="text-amber-700 underline underline-offset-2 hover:text-amber-900"
                      >
                        {r.phone}
                      </a>
                      {" · "}
                      {r.address}
                    </div>
                  </div>
                  <div className="text-right font-semibold tabular-nums">
                    {formatNPR(r.amount, locale)}
                  </div>
                </div>
                <div className="mt-1 text-sm text-stone-500">
                  {formatDate(r.donationDate, locale)} · {r.createdByName}
                </div>
                {r.remarks && (
                  <div className="mt-1 text-sm text-stone-600">{r.remarks}</div>
                )}
                {(canEdit || canDelete || canReceipt) && (
                  <div className="mt-3 flex gap-1">
                    {canReceipt && (
                      <ReceiptPreviewButton
                        receiptUrl={`/api/donations/${r.id}/receipt`}
                        fileName={`${receiptFileName(r)}.pdf`}
                      />
                    )}
                    {canEdit && (
                      <Link
                        href={`/donations/${r.id}/edit`}
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
                      </Link>
                    )}
                    {canDelete && (
                      <form action={deleteDonationAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <ConfirmDeleteButton iconOnly tooltip={tc("delete")} />
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
