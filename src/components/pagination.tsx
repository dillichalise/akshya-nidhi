import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { btnGhost } from "./ui";

export async function Pagination({
  page,
  pages,
  hrefFor,
}: {
  page: number;
  pages: number;
  hrefFor: (page: number) => string;
}) {
  const t = await getTranslations("common");
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={btnGhost}>
          {t("previous")}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-stone-600">{t("page", { page, pages })}</span>
      {page < pages ? (
        <Link href={hrefFor(page + 1)} className={btnGhost}>
          {t("next")}
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
