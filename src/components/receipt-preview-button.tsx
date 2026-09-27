"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { btnGhost, btnPrimary } from "./ui";

export function ReceiptPreviewButton({
  receiptUrl,
  fileName,
}: {
  receiptUrl: string;
  fileName: string;
}) {
  const t = useTranslations("receipt");
  const [open, setOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Open/close the native <dialog>
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      el.showModal();
    } else {
      el.close();
    }
  }, [open]);

  // Close on backdrop click (click outside the inner panel)
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) setOpen(false);
  }, []);

  // Close on Escape (already handled by <dialog> natively, but sync state)
  const handleClose = useCallback(() => setOpen(false), []);

  const handlePrint = () => {
    iframeRef.current?.contentWindow?.print();
  };

  return (
    <>
      {/* Trigger — same icon-button style as Edit */}
      <button
        type="button"
        title={t("linkLabel")}
        aria-label={t("linkLabel")}
        onClick={() => setOpen(true)}
        className="group relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-600 hover:bg-stone-50 hover:text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600/30"
      >
        {/* Document icon */}
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

      {/* Native <dialog> modal — rendered in-place, portalled by the browser */}
      <dialog
        ref={dialogRef}
        onClose={handleClose}
        onClick={handleBackdropClick}
        className="m-auto w-full max-w-3xl rounded-xl border-0 bg-transparent p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        {/* Inner panel — clicks here don't bubble to the backdrop handler */}
        <div
          className="flex flex-col overflow-hidden rounded-xl bg-white"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
            <h2 className="text-base font-semibold text-stone-800">
              {t("previewTitle")}
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
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

          {/* PDF iframe */}
          <div className="h-[70vh] w-full bg-stone-100">
            {open && (
              <iframe
                ref={iframeRef}
                src={receiptUrl}
                title={t("previewTitle")}
                className="h-full w-full border-0"
              />
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 border-t border-stone-200 px-4 py-3">
            <button
              type="button"
              onClick={handlePrint}
              className={btnGhost + " gap-2"}
            >
              {/* Printer icon */}
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
              {/* Download icon */}
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
      </dialog>
    </>
  );
}
