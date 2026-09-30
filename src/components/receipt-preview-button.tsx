"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { btnGhost, btnPrimary } from "./ui";

// ─── shared types ─────────────────────────────────────────────────────────────

type LoadedReceipt = { receiptUrl: string; blobUrl: string };

// ─── ReceiptPreviewModal ───────────────────────────────────────────────────────
// Standalone modal — caller controls `open` / `onClose`.
// Optional `extraActions` renders additional buttons in the footer (left side).

export function ReceiptPreviewModal({
  open,
  onClose,
  receiptUrl,
  fileName,
  extraActions,
}: {
  open: boolean;
  onClose: () => void;
  receiptUrl: string;
  fileName: string;
  extraActions?: React.ReactNode;
}) {
  const t = useTranslations("receipt");
  const [loadedReceipt, setLoadedReceipt] = useState<LoadedReceipt | null>(
    null,
  );
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const blobUrl =
    loadedReceipt?.receiptUrl === receiptUrl ? loadedReceipt.blobUrl : null;
  const loadFailed = failedUrl === receiptUrl;
  const isLoading = open && !blobUrl && !loadFailed;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Fetch PDF as blob the first time the modal opens; reuse on subsequent opens.
  useEffect(() => {
    if (
      !open ||
      loadedReceipt?.receiptUrl === receiptUrl ||
      failedUrl === receiptUrl
    ) {
      return;
    }

    let cancelled = false;
    fetch(receiptUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        setLoadedReceipt({ receiptUrl, blobUrl });
      })
      .catch(() => {
        if (!cancelled) setFailedUrl(receiptUrl);
      });

    return () => {
      cancelled = true;
    };
  }, [open, receiptUrl, loadedReceipt, failedUrl]);

  // Revoke cached URLs when replaced or when the modal unmounts.
  useEffect(() => {
    if (!loadedReceipt) return;
    return () => {
      URL.revokeObjectURL(loadedReceipt.blobUrl);
    };
  }, [loadedReceipt]);

  // Sync native <dialog> open state
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) onClose();
    },
    [onClose],
  );

  const handlePrint = () => iframeRef.current?.contentWindow?.print();

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={handleBackdropClick}
      className="m-auto w-[calc(100%-2rem)] max-w-3xl rounded-xl border-0 bg-transparent p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div
        className="flex h-[90dvh] max-h-[90dvh] flex-col overflow-hidden rounded-xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-stone-200 px-4 py-3">
          <h2 className="text-base font-semibold text-stone-800">
            {t("previewTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600/30"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* PDF preview area */}
        <div className="relative min-h-0 flex-1 bg-stone-100">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-stone-500">
              <svg
                className="h-8 w-8 animate-spin text-amber-700"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4l3-3-3-3V0a12 12 0 00-12 12h4z"
                />
              </svg>
              <span className="text-sm">Loading…</span>
            </div>
          )}
          {loadFailed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-red-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-sm">
                Could not load receipt. Use Download instead.
              </p>
            </div>
          )}
          {blobUrl && (
            <iframe
              ref={iframeRef}
              src={blobUrl}
              title={t("previewTitle")}
              className="h-full w-full border-0"
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-4 py-3">
          {/* Left slot — extra actions (e.g. Add New Donation) */}
          <div className="flex gap-2">{extraActions}</div>

          {/* Right slot — print + download */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handlePrint}
              disabled={!blobUrl}
              className={btnGhost + " gap-2 disabled:opacity-50"}
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
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              {t("print")}
            </button>
            <a
              href={receiptUrl}
              download={fileName}
              className={btnPrimary + " gap-2"}
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
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {t("download")}
            </a>
          </div>
        </div>
      </div>
    </dialog>
  );
}

// ─── ReceiptPreviewButton ──────────────────────────────────────────────────────
// Icon button that owns its own open state and renders ReceiptPreviewModal.

export function ReceiptPreviewButton({
  receiptUrl,
  fileName,
}: {
  receiptUrl: string;
  fileName: string;
}) {
  const t = useTranslations("receipt");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        title={t("linkLabel")}
        aria-label={t("linkLabel")}
        onClick={() => setOpen(true)}
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
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <span
          className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-stone-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
          role="tooltip"
        >
          {t("linkLabel")}
        </span>
      </button>

      <ReceiptPreviewModal
        open={open}
        onClose={() => setOpen(false)}
        receiptUrl={receiptUrl}
        fileName={fileName}
      />
    </>
  );
}
