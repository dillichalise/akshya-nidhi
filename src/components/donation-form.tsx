"use client";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { type FormState } from "@/actions/types";
import { amountInWords, formatNPR } from "@/lib/format";
import { BsDatePicker } from "./bs-date-picker";
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

  // Live amount preview — initialise from existing value when editing.
  const [rawAmount, setRawAmount] = useState(v.amount ?? "");

  // After a successful add, clear the preview and focus the first field.
  useEffect(() => {
    if (state.status === "success") {
      setRawAmount("");
      nameRef.current?.focus();
    }
  }, [state]);

  // Derive formatted preview values from rawAmount.
  const amountNum = Number(rawAmount);
  const formattedAmount =
    rawAmount.trim() !== "" && Number.isFinite(amountNum) && amountNum > 0
      ? formatNPR(amountNum, locale)
      : null;
  const wordsAmount =
    rawAmount.trim() !== "" && Number.isFinite(amountNum) && amountNum > 0
      ? amountInWords(amountNum, locale)
      : null;

  // A fresh key after each success (set by the server action) remounts the form with empty fields.
  const formKey = state.values._ts ?? "form";

  return (
    <form
      key={formKey}
      ref={formRef}
      action={formAction}
      className="space-y-4"
      noValidate
    >
      {donationId && <input type="hidden" name="id" value={donationId} />}
      {state.status === "success" && state.message && (
        <Alert kind="success">
          {t(state.message)}
          {v.receiptId && (
            <>
              {" "}
              <a
                href={`/api/donations/${v.receiptId}/receipt`}
                className="font-medium underline"
              >
                {t("receipt.download")}
              </a>
            </>
          )}
        </Alert>
      )}
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
          aria-invalid={!!state.errors.donorName}
          aria-describedby="donorName-error"
          className={inputCls}
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
          aria-invalid={!!state.errors.address}
          aria-describedby="address-error"
          className={inputCls}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("donation.phone")} name="phone" error={err("phone")}>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            defaultValue={v.phone}
            autoComplete="off"
            aria-invalid={!!state.errors.phone}
            aria-describedby="phone-error"
            className={inputCls}
          />
        </Field>
        <Field label={t("donation.amount")} name="amount" error={err("amount")}>
          <input
            id="amount"
            name="amount"
            inputMode="decimal"
            defaultValue={v.amount}
            autoComplete="off"
            aria-invalid={!!state.errors.amount}
            aria-describedby="amount-error"
            className={inputCls + " tabular-nums"}
            onChange={(e) => setRawAmount(e.target.value)}
          />
          {formattedAmount && (
            <p className="mt-1 text-sm font-medium tabular-nums text-stone-700">
              {formattedAmount}
            </p>
          )}
          {wordsAmount && (
            <p className="mt-0.5 text-xs italic text-stone-500">
              {wordsAmount}
            </p>
          )}
        </Field>
      </div>
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
  );
}
