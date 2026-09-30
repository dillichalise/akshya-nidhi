"use client";
import { useTranslations } from "next-intl";
import { btnDanger } from "./ui";

/** Submits its parent form only after the user confirms.
 *  Pass `iconOnly` to render a compact icon button with a hover tooltip instead of text.
 *  Pass `confirmMessage` to override the default confirmation text. */
export function ConfirmDeleteButton({
  iconOnly,
  tooltip,
  confirmMessage,
}: {
  iconOnly?: boolean;
  tooltip?: string;
  confirmMessage?: string;
}) {
  const t = useTranslations();
  const label = tooltip ?? t("common.delete");
  const message = confirmMessage ?? t("donation.confirmDelete");

  if (iconOnly) {
    return (
      <button
        type="button"
        title={label}
        aria-label={label}
        className="group relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-300 bg-white text-red-600 hover:bg-red-50 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-400/40"
        onClick={(e) => {
          if (!confirm(message)) e.preventDefault();
          else
            (
              e.currentTarget.closest("form") as HTMLFormElement
            )?.requestSubmit();
        }}
      >
        {/* Trash icon */}
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
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
        <span
          className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-stone-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
          role="tooltip"
        >
          {label}
        </span>
      </button>
    );
  }

  return (
    <button
      className={btnDanger}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {t("common.delete")}
    </button>
  );
}
