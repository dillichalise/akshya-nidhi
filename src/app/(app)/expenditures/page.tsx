import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { deleteExpenditureAction } from "@/actions/expenditures";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { ExpenditureFilters } from "@/components/expenditure-filters";
import { Pagination } from "@/components/pagination";
import { btnGhost, btnPrimary, Card, PageTitle } from "@/components/ui";
import {
  listExpenditures,
  type ExpenditureSortColumn,
  type SortOrder,
} from "@/db/queries/expenditures";
import { can } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import {
  formatDate,
  formatNPR,
  localizedCount,
  toNepaliDigits,
} from "@/lib/format";

const PAGE_SIZE = 20;
const ymd = /^\d{4}-\d{2}-\d{2}$/;
const SORT_COLS = new Set<string>([
  "expenditureDate",
  "title",
  "amount",
  "returnAmount",
]);

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

export default async function ExpendituresPage({
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
  const user = await requirePermission("expenditure:list");
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 100) || undefined;
  const from = sp.from && ymd.test(sp.from) ? sp.from : undefined;
  const to = sp.to && ymd.test(sp.to) ? sp.to : undefined;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const sort: ExpenditureSortColumn | undefined = SORT_COLS.has(sp.sort ?? "")
    ? (sp.sort as ExpenditureSortColumn)
    : undefined;
  const order: SortOrder = sp.order === "asc" ? "asc" : "desc";

  const [{ rows, total, totals }, t, tc, tn, locale] = await Promise.all([
    listExpenditures({ q, from, to, page, pageSize: PAGE_SIZE, sort, order }),
    getTranslations("expenditure"),
    getTranslations("common"),
    getTranslations("nav"),
    getLocale(),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canEdit = can(user.role, "expenditure:edit");
  const canDelete = can(user.role, "expenditure:delete");

  const sortHref = (col: ExpenditureSortColumn) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (from) u.set("from", from);
    if (to) u.set("to", to);
    u.set("page", "1");
    u.set("sort", col);
    u.set("order", sort === col && order === "asc" ? "desc" : "asc");
    return `/expenditures?${u}`;
  };

  const hrefFor = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (from) u.set("from", from);
    if (to) u.set("to", to);
    if (sort) u.set("sort", sort);
    if (sort) u.set("order", order);
    u.set("page", String(p));
    return `/expenditures?${u}`;
  };

  const excelHref = (() => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (from) u.set("from", from);
    if (to) u.set("to", to);
    return `/api/expenditures/excel?${u}`;
  })();

  const renderSortTh = (
    col: ExpenditureSortColumn,
    children: React.ReactNode,
    className?: string,
  ) => (
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
          <Link href="/expenditures/new" className={btnPrimary}>
            {tn("addExpenditure")}
          </Link>
        }
      >
        {t("listTitle")}
      </PageTitle>

      <Card className="mb-4">
        <ExpenditureFilters
          key={`${q ?? ""}|${from ?? ""}|${to ?? ""}`}
          q={q ?? ""}
          from={from ?? ""}
          to={to ?? ""}
        />
      </Card>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-stone-600">
          {tc("records", { count: localizedCount(total, locale) })}
        </p>
        {rows.length > 0 && (
          <a href={excelHref} className={btnGhost}>
            {t("downloadExcel")}
          </a>
        )}
      </div>

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
                  {renderSortTh("expenditureDate", t("date"))}
                  {renderSortTh("title", t("title"))}
                  {renderSortTh("amount", t("amount"), "text-right")}
                  {renderSortTh(
                    "returnAmount",
                    t("returnAmount"),
                    "text-right",
                  )}
                  <th className="px-3 py-2 text-right">{t("actualSpend")}</th>
                  <th className="px-3 py-2">{t("remarks")}</th>
                  <th className="px-3 py-2">{t("addedBy")}</th>
                  {(canEdit || canDelete) && (
                    <th className="px-3 py-2">{tc("actions")}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((r) => {
                  const net = (
                    BigInt(Math.round(Number(r.amount) * 100)) -
                    BigInt(Math.round(Number(r.returnAmount) * 100))
                  ).toString();
                  const netFormatted = formatNPR(
                    (Number(net) / 100).toFixed(2),
                    locale,
                  );
                  return (
                    <tr key={r.id} className="align-top">
                      <td className="whitespace-nowrap px-3 py-2">
                        {formatDate(r.expenditureDate, locale)}
                      </td>
                      <td className="px-3 py-2 font-medium">{r.title}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                        {formatNPR(r.amount, locale)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-green-700">
                        {Number(r.returnAmount) > 0
                          ? formatNPR(r.returnAmount, locale)
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums font-medium">
                        {netFormatted}
                      </td>
                      <td className="max-w-48 px-3 py-2 text-stone-600">
                        {r.remarks}
                      </td>
                      <td className="px-3 py-2 text-stone-600">
                        {r.createdByName}
                      </td>
                      {(canEdit || canDelete) && (
                        <td className="whitespace-nowrap px-3 py-2">
                          <div className="flex gap-1">
                            {canEdit && (
                              <Link
                                href={`/expenditures/${r.id}/edit`}
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
                                action={deleteExpenditureAction}
                                className="relative"
                              >
                                <input type="hidden" name="id" value={r.id} />
                                <ConfirmDeleteButton
                                  iconOnly
                                  tooltip={tc("delete")}
                                  confirmMessage={t("confirmDelete")}
                                />
                              </form>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              {/* Totals footer */}
              <tfoot className="border-t-2 border-stone-300 bg-amber-50 font-semibold text-sm">
                <tr>
                  <td
                    colSpan={2}
                    className="px-3 py-2 text-right text-stone-600"
                  >
                    {tc("total")}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {formatNPR(totals.amount, locale)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-green-700">
                    {formatNPR(totals.returnAmount, locale)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {formatNPR(totals.net, locale)}
                  </td>
                  <td colSpan={canEdit || canDelete ? 3 : 2} />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Cards on phones */}
          <ul className="space-y-3 md:hidden">
            {rows.map((r, i) => {
              const net = (
                BigInt(Math.round(Number(r.amount) * 100)) -
                BigInt(Math.round(Number(r.returnAmount) * 100))
              ).toString();
              const netFormatted = formatNPR(
                (Number(net) / 100).toFixed(2),
                locale,
              );
              return (
                <li
                  key={r.id}
                  className="rounded-xl border border-stone-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">{r.title}</div>
                      <div className="mt-0.5 text-sm text-stone-500">
                        {toNepaliDigits(i + 1 + (page - 1) * PAGE_SIZE, locale)}
                        . {formatDate(r.expenditureDate, locale)} ·{" "}
                        {r.createdByName}
                      </div>
                      {r.remarks && (
                        <div className="mt-0.5 text-sm text-stone-400">
                          {r.remarks}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-semibold tabular-nums">
                        {netFormatted}
                      </div>
                      {Number(r.returnAmount) > 0 && (
                        <div className="text-xs text-green-700 tabular-nums">
                          {t("returnAmount")}:{" "}
                          {formatNPR(r.returnAmount, locale)}
                        </div>
                      )}
                    </div>
                  </div>
                  {(canEdit || canDelete) && (
                    <div className="mt-3 flex gap-1">
                      {canEdit && (
                        <Link
                          href={`/expenditures/${r.id}/edit`}
                          aria-label={tc("edit")}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-600 hover:bg-stone-50"
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
                        <form action={deleteExpenditureAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <ConfirmDeleteButton
                            iconOnly
                            tooltip={tc("delete")}
                            confirmMessage={t("confirmDelete")}
                          />
                        </form>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Mobile totals */}
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-right md:hidden">
            <div className="text-sm text-stone-600">
              {t("actualSpend")}:{" "}
              <span className="font-semibold tabular-nums">
                {formatNPR(totals.net, locale)}
              </span>
            </div>
            <div className="text-xs text-stone-500 tabular-nums">
              {t("amount")}: {formatNPR(totals.amount, locale)} ·{" "}
              {t("returnAmount")}: {formatNPR(totals.returnAmount, locale)}
            </div>
          </div>
        </>
      )}
      <Pagination page={page} pages={pages} hrefFor={hrefFor} />
    </div>
  );
}
