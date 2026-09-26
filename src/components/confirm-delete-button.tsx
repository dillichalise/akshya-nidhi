"use client";
import { useTranslations } from "next-intl";
import { btnDanger } from "./ui";

/** Submits its parent form only after the user confirms. */
export function ConfirmDeleteButton() {
  const t = useTranslations();
  return (
    <button
      className={btnDanger}
      onClick={(e) => {
        if (!confirm(t("donation.confirmDelete"))) e.preventDefault();
      }}
    >
      {t("common.delete")}
    </button>
  );
}
