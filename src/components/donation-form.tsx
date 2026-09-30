"use client";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { type FormState } from "@/actions/types";
import { amountInWords, formatAmountInput, formatNPR } from "@/lib/format";
import { receiptFileName } from "@/lib/receipts/shared";
import { BsDatePicker } from "./bs-date-picker";
import { ReceiptPreviewModal } from "./receipt-preview-button";
import { Alert, btnGhost, btnPrimary, Field, inputCls } from "./ui";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function DonationForm({
  action,
  initialState,
  today,
  donationId,
  cancelHref,
}: {
  action: Action;
  initialState: FormState;
  today: string;
  donationId?: string;
  cancelHref?: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const v = state.values;
  const err = (f: string) =>
    state.errors[f] ? t(`errors.${state.errors[f]}`) : undefined;

  // Live amount state.
  // rawAmount  — plain numeric string (digits + optional dot), used for validation/submit.
  // displayAmount — comma-grouped display string shown in the visible input.
  // Donation type state
  const [donationType, setDonationType] = useState<
    "cash" | "non_cash" | "other"
  >((v.donationType as "cash" | "non_cash" | "other") ?? "cash");

  // Live amount state (only used for cash donations)
  const [rawAmount, setRawAmount] = useState(v.amount ?? "");
  const [displayAmount, setDisplayAmount] = useState(
    v.amount ? formatAmountInput(v.amount) : "",
  );

  // Reset amount when switching away from cash
  useEffect(() => {
    if (donationType !== "cash") {
      setRawAmount("");
      setDisplayAmount("");
    }
  }, [donationType]);

  // Receipt modal state — only relevant on the "add" form (not edit).
  const [receiptOpen, setReceiptOpen] = useState(false);
  // Track the last saved receiptId so closing and re-opening modal still works.
  const [savedReceiptId, setSavedReceiptId] = useState<string | null>(null);
  const [savedDate, setSavedDate] = useState<string>("");

  // After a successful save, open the receipt modal and clear the amount preview.
  useEffect(() => {
    if (state.status === "success" && v.receiptId) {
      setSavedReceiptId(v.receiptId);
      setSavedDate(v.donationDate ?? "");
      setReceiptOpen(true);
      setRawAmount("");
      setDisplayAmount("");
      // Focus will move to the name field once the modal is closed
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, v._ts]); // _ts changes on each success, re-running even if receiptId stays same

  // When the modal closes, focus the first field so the next entry is quick.
  const handleModalClose = () => {
    setReceiptOpen(false);
    nameRef.current?.focus();
  };

  // Derive formatted preview values from rawAmount (only for cash donations).
  const amountNum = Number(rawAmount);
  const formattedAmount =
    donationType === "cash" &&
    rawAmount.trim() !== "" &&
    Number.isFinite(amountNum) &&
    amountNum > 0
      ? formatNPR(amountNum, locale)
      : null;
  const wordsAmount =
    donationType === "cash" &&
    rawAmount.trim() !== "" &&
    Number.isFinite(amountNum) &&
    amountNum > 0
      ? amountInWords(amountNum, locale)
      : null;

  // A fresh key after each success (set by the server action) remounts the form with empty fields.
  const formKey = state.values._ts ?? "form";

  const receiptUrl = savedReceiptId
    ? `/api/donations/${savedReceiptId}/receipt`
    : null;
  const downloadName = savedReceiptId
    ? `${receiptFileName({ id: savedReceiptId, donationDate: savedDate })}.pdf`
    : "";

  return (
    <>
      {/* Receipt preview modal — auto-opens after a successful add */}
      {receiptUrl && (
        <ReceiptPreviewModal
          open={receiptOpen}
          onClose={handleModalClose}
          receiptUrl={receiptUrl}
          fileName={downloadName}
          extraActions={
            <button
              type="button"
              onClick={handleModalClose}
              className={btnPrimary}
            >
              {/* Plus icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mr-1.5 h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {t("donation.addAnother")}
            </button>
          }
        />
      )}

      <form
        key={formKey}
        ref={formRef}
        action={formAction}
        className="space-y-4"
        noValidate
      >
        {donationId && <input type="hidden" name="id" value={donationId} />}
        {state.status === "error" && state.message && (
          <Alert kind="error">{t(state.message)}</Alert>
        )}

        <Field
          label={t("donation.name")}
          name="donorName"
          error={err("donorName")}
        >
          <input
            ref={nameRef}
            id="donorName"
            name="donorName"
            defaultValue={v.donorName}
            autoComplete="off"
            maxLength={50}
            aria-invalid={!!state.errors.donorName}
            aria-describedby="donorName-error"
            className={inputCls}
            onKeyDown={(e) => {
              // Block digits and most symbols — allow letters, spaces, hyphens, apostrophes, and control keys
              const allowed =
                e.key.length > 1 || // control keys (Backspace, ArrowLeft, etc.)
                e.ctrlKey ||
                e.metaKey ||
                /^[\p{L}\p{M}'\- ]$/u.test(e.key);
              if (!allowed) e.preventDefault();
            }}
          />
        </Field>
        <Field
          label={t("donation.address")}
          name="address"
          error={err("address")}
        >
          <input
            id="address"
            name="address"
            defaultValue={v.address}
            autoComplete="off"
            maxLength={100}
            aria-invalid={!!state.errors.address}
            aria-describedby="address-error"
            className={inputCls}
            onKeyDown={(e) => {
              // Allow letters, digits, spaces, , . - : and control keys
              const allowed =
                e.key.length > 1 ||
                e.ctrlKey ||
                e.metaKey ||
                /^[\p{L}\p{M}\d\s,.\-:]$/u.test(e.key);
              if (!allowed) e.preventDefault();
            }}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("donation.phone")} name="phone" error={err("phone")}>
            {/* Nepal flag + country code block */}
            <div
              className={
                "flex overflow-hidden rounded-lg border border-stone-300 bg-white " +
                "focus-within:border-amber-600 focus-within:ring-2 focus-within:ring-amber-600/30 " +
                (state.errors.phone ? "border-red-500" : "")
              }
            >
              <span className="flex items-center gap-1.5 border-r border-stone-300 bg-stone-50 px-3 text-sm font-semibold text-stone-600 select-none whitespace-nowrap">
                {/* Nepal flag emoji */}
                🇳🇵 +977
              </span>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                defaultValue={v.phone}
                autoComplete="off"
                aria-invalid={!!state.errors.phone}
                aria-describedby="phone-error"
                placeholder="98XXXXXXXX"
                className={
                  "block w-full min-h-11 bg-transparent px-3 py-2 text-base " +
                  "text-stone-900 tabular-nums placeholder:text-stone-400 " +
                  "focus:outline-none"
                }
                onKeyDown={(e) => {
                  const allowed =
                    e.key.length > 1 ||
                    e.ctrlKey ||
                    e.metaKey ||
                    /^\d$/.test(e.key);
                  if (!allowed) e.preventDefault();
                }}
              />
            </div>
          </Field>
        </div>

        {/* Donation Type Selection */}
        <Field
          label={t("donation.donationType")}
          name="donationType"
          error={err("donationType")}
        >
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="donationType"
                value="cash"
                checked={donationType === "cash"}
                onChange={(e) =>
                  setDonationType(
                    e.target.value as "cash" | "non_cash" | "other",
                  )
                }
                className="h-4 w-4 text-amber-600 focus:ring-amber-600 focus:ring-2"
              />
              <span className="text-sm font-medium text-stone-700">
                {t("donation.cash")}
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="donationType"
                value="non_cash"
                checked={donationType === "non_cash"}
                onChange={(e) =>
                  setDonationType(
                    e.target.value as "cash" | "non_cash" | "other",
                  )
                }
                className="h-4 w-4 text-amber-600 focus:ring-amber-600 focus:ring-2"
              />
              <span className="text-sm font-medium text-stone-700">
                {t("donation.nonCash")}
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="donationType"
                value="other"
                checked={donationType === "other"}
                onChange={(e) =>
                  setDonationType(
                    e.target.value as "cash" | "non_cash" | "other",
                  )
                }
                className="h-4 w-4 text-amber-600 focus:ring-amber-600 focus:ring-2"
              />
              <span className="text-sm font-medium text-stone-700">
                {t("donation.other")}
              </span>
            </label>
          </div>
        </Field>

        {/* Amount field - only for cash donations */}
        {donationType === "cash" && (
          <Field
            label={t("donation.amount")}
            name="amount"
            error={err("amount")}
          >
            {/* Hidden field carries the raw value for server action validation */}
            <input type="hidden" name="amount" value={rawAmount} />

            {/* Visible grouped input with currency prefix addon */}
            <div
              className={
                "flex overflow-hidden rounded-lg border border-stone-300 bg-white " +
                "focus-within:border-amber-600 focus-within:ring-2 focus-within:ring-amber-600/30 " +
                (state.errors.amount ? "border-red-500" : "")
              }
            >
              {/* Currency badge */}
              <span className="flex items-center border-r border-stone-300 bg-stone-50 px-3 text-sm font-semibold text-stone-600 select-none">
                {locale === "ne" ? "रु." : "Rs."}
              </span>

              {/* Amount input — shows comma-grouped value, no border/ring (handled by wrapper) */}
              <input
                id="amount"
                inputMode="decimal"
                value={displayAmount}
                autoComplete="off"
                aria-invalid={!!state.errors.amount}
                aria-describedby="amount-error"
                placeholder="0"
                className={
                  "block w-full min-h-11 bg-transparent px-3 py-2 text-base " +
                  "text-stone-900 tabular-nums placeholder:text-stone-400 " +
                  "focus:outline-none"
                }
                onChange={(e) => {
                  const raw = e.target.value.replace(/,/g, "");
                  setRawAmount(raw);
                  setDisplayAmount(formatAmountInput(raw));
                }}
                onKeyDown={(e) => {
                  // Allow digits, a single decimal point, and control keys
                  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
                    if (!/[\d.]/.test(e.key)) {
                      e.preventDefault();
                      return;
                    }
                    // Block a second decimal point
                    if (e.key === "." && rawAmount.includes(".")) {
                      e.preventDefault();
                    }
                  }
                }}
              />
            </div>

            {wordsAmount && (
              <p className="mt-0.5 text-xs text-stone-500">{wordsAmount}</p>
            )}
          </Field>
        )}

        {/* Non-cash amount field - optional with default "0" */}
        {donationType !== "cash" && (
          <Field
            label={`${t("donation.amount")} (${t("common.optional")})`}
            name="amount"
            error={err("amount")}
          >
            {/* Hidden field carries the raw value for server action validation */}
            <input type="hidden" name="amount" value={rawAmount || "0"} />

            {/* Visible grouped input with currency prefix addon */}
            <div
              className={
                "flex overflow-hidden rounded-lg border border-stone-300 bg-white " +
                "focus-within:border-amber-600 focus-within:ring-2 focus-within:ring-amber-600/30 " +
                (state.errors.amount ? "border-red-500" : "")
              }
            >
              {/* Currency badge */}
              <span className="flex items-center border-r border-stone-300 bg-stone-50 px-3 text-sm font-semibold text-stone-600 select-none">
                {locale === "ne" ? "रु." : "Rs."}
              </span>

              {/* Amount input — shows comma-grouped value, no border/ring (handled by wrapper) */}
              <input
                id="amount"
                inputMode="decimal"
                value={displayAmount}
                autoComplete="off"
                aria-invalid={!!state.errors.amount}
                aria-describedby="amount-error"
                placeholder="0"
                className={
                  "block w-full min-h-11 bg-transparent px-3 py-2 text-base " +
                  "text-stone-900 tabular-nums placeholder:text-stone-400 " +
                  "focus:outline-none"
                }
                onChange={(e) => {
                  const raw = e.target.value.replace(/,/g, "");
                  setRawAmount(raw);
                  setDisplayAmount(formatAmountInput(raw));
                }}
                onKeyDown={(e) => {
                  // Allow digits, a single decimal point, and control keys
                  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
                    if (!/[\d.]/.test(e.key)) {
                      e.preventDefault();
                      return;
                    }
                    // Block a second decimal point
                    if (e.key === "." && rawAmount.includes(".")) {
                      e.preventDefault();
                    }
                  }
                }}
              />
            </div>

            {wordsAmount && (
              <p className="mt-0.5 text-xs text-stone-500">{wordsAmount}</p>
            )}
          </Field>
        )}

        {/* Item description field - only for non-cash donations */}
        {donationType === "non_cash" && (
          <Field
            label={t("donation.itemDescription")}
            name="itemDescription"
            error={err("itemDescription")}
          >
            <textarea
              id="itemDescription"
              name="itemDescription"
              rows={3}
              defaultValue={v.itemDescription}
              aria-invalid={!!state.errors.itemDescription}
              aria-describedby="itemDescription-error"
              className={inputCls}
              placeholder={t("donation.itemDescriptionPlaceholder")}
            />
          </Field>
        )}

        {/* Other description field - only for other donations */}
        {donationType === "other" && (
          <Field
            label={t("donation.otherDescription")}
            name="otherDescription"
            error={err("otherDescription")}
          >
            <textarea
              id="otherDescription"
              name="otherDescription"
              rows={3}
              defaultValue={v.otherDescription}
              aria-invalid={!!state.errors.otherDescription}
              aria-describedby="otherDescription-error"
              className={inputCls}
              placeholder={t("donation.otherDescriptionPlaceholder")}
            />
          </Field>
        )}

        <Field
          label={t("donation.date")}
          name="donationDate"
          error={err("donationDate")}
        >
          <BsDatePicker
            name="donationDate"
            max={today}
            defaultValue={v.donationDate ?? today}
            aria-invalid={!!state.errors.donationDate}
            aria-describedby="donationDate-error"
          />
        </Field>

        <Field
          label={`${t("donation.remarks")} (${t("common.optional")})`}
          name="remarks"
          error={err("remarks")}
        >
          <textarea
            id="remarks"
            name="remarks"
            rows={3}
            defaultValue={v.remarks}
            aria-invalid={!!state.errors.remarks}
            aria-describedby="remarks-error"
            className={inputCls}
          />
        </Field>
        <div className="flex flex-wrap gap-3 pt-2">
          <button className={btnPrimary} disabled={pending}>
            {pending ? t("common.saving") : t("common.save")}
          </button>
          {cancelHref && (
            <Link href={cancelHref} className={btnGhost}>
              {t("common.cancel")}
            </Link>
          )}
        </div>
      </form>
    </>
  );
}
