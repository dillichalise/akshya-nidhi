"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { type FormState } from "@/actions/types";
import { amountInWords, formatAmountInput, formatNPR } from "@/lib/format";
import { BsDatePicker } from "./bs-date-picker";
import { Alert, btnGhost, btnPrimary, Field, inputCls } from "./ui";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function ExpenditureForm({
  action,
  initialState,
  today,
  expenditureId,
  cancelHref,
}: {
  action: Action;
  initialState: FormState;
  today: string;
  expenditureId?: string;
  cancelHref?: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(action, initialState);
  const v = state.values;
  const err = (f: string) =>
    state.errors[f] ? t(`errors.${state.errors[f]}`) : undefined;

  // Amount state — comma-grouped display, raw numeric for submit.
  const [rawAmount, setRawAmount] = useState(v.amount ?? "");
  const [displayAmount, setDisplayAmount] = useState(
    v.amount ? formatAmountInput(v.amount) : "",
  );

  // Return amount state.
  const [rawReturn, setRawReturn] = useState(v.returnAmount ?? "");
  const [displayReturn, setDisplayReturn] = useState(
    v.returnAmount && v.returnAmount !== "0"
      ? formatAmountInput(v.returnAmount)
      : "",
  );

  // Compute actual spend: amount − returnAmount (BigInt-safe string arithmetic).
  const computeActualSpend = (): string | null => {
    const a = Number(rawAmount);
    const r = Number(rawReturn || "0");
    if (!Number.isFinite(a) || a <= 0) return null;
    const net = a - r;
    if (net < 0) return null;
    return formatNPR(net, locale);
  };

  const actualSpend = computeActualSpend();
  const amountNum = Number(rawAmount);
  const wordsAmount =
    rawAmount.trim() !== "" && Number.isFinite(amountNum) && amountNum > 0
      ? amountInWords(amountNum, locale)
      : null;

  const formKey = state.values._ts ?? "form";

  return (
    <form key={formKey} action={formAction} className="space-y-4" noValidate>
      {expenditureId && (
        <input type="hidden" name="id" value={expenditureId} />
      )}
      {state.status === "error" && state.message && (
        <Alert kind="error">{t(state.message as "errors.generic")}</Alert>
      )}
      {state.status === "success" && state.message && (
        <Alert kind="success">{t(state.message as "expenditure.added")}</Alert>
      )}

      <Field
        label={t("expenditure.title")}
        name="title"
        error={err("title")}
      >
        <input
          id="title"
          name="title"
          defaultValue={v.title}
          autoComplete="off"
          maxLength={100}
          aria-invalid={!!state.errors.title}
          aria-describedby="title-error"
          className={inputCls}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("expenditure.amount")}
          name="amount"
          error={err("amount")}
        >
          {/* Hidden raw value for server validation */}
          <input type="hidden" name="amount" value={rawAmount} />
          <div
            className={
              "flex overflow-hidden rounded-lg border border-stone-300 bg-white " +
              "focus-within:border-amber-600 focus-within:ring-2 focus-within:ring-amber-600/30 " +
              (state.errors.amount ? "border-red-500" : "")
            }
          >
            <span className="flex items-center border-r border-stone-300 bg-stone-50 px-3 text-sm font-semibold text-stone-600 select-none">
              {locale === "ne" ? "रु." : "Rs."}
            </span>
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
                "text-stone-900 tabular-nums placeholder:text-stone-400 focus:outline-none"
              }
              onChange={(e) => {
                const raw = e.target.value.replace(/,/g, "");
                setRawAmount(raw);
                setDisplayAmount(formatAmountInput(raw));
              }}
              onKeyDown={(e) => {
                if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
                  if (!/[\d.]/.test(e.key)) {
                    e.preventDefault();
                    return;
                  }
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

        <Field
          label={`${t("expenditure.returnAmount")} (${t("common.optional")})`}
          name="returnAmount"
          error={err("returnAmount")}
        >
          {/* Hidden raw value for server validation */}
          <input type="hidden" name="returnAmount" value={rawReturn} />
          <div
            className={
              "flex overflow-hidden rounded-lg border border-stone-300 bg-white " +
              "focus-within:border-amber-600 focus-within:ring-2 focus-within:ring-amber-600/30 " +
              (state.errors.returnAmount ? "border-red-500" : "")
            }
          >
            <span className="flex items-center border-r border-stone-300 bg-stone-50 px-3 text-sm font-semibold text-stone-600 select-none">
              {locale === "ne" ? "रु." : "Rs."}
            </span>
            <input
              id="returnAmount"
              inputMode="decimal"
              value={displayReturn}
              autoComplete="off"
              aria-invalid={!!state.errors.returnAmount}
              aria-describedby="returnAmount-error"
              placeholder="0"
              className={
                "block w-full min-h-11 bg-transparent px-3 py-2 text-base " +
                "text-stone-900 tabular-nums placeholder:text-stone-400 focus:outline-none"
              }
              onChange={(e) => {
                const raw = e.target.value.replace(/,/g, "");
                setRawReturn(raw);
                setDisplayReturn(formatAmountInput(raw));
              }}
              onKeyDown={(e) => {
                if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
                  if (!/[\d.]/.test(e.key)) {
                    e.preventDefault();
                    return;
                  }
                  if (e.key === "." && rawReturn.includes(".")) {
                    e.preventDefault();
                  }
                }
              }}
            />
          </div>
          {actualSpend !== null && (
            <p className="mt-0.5 text-xs text-stone-500">
              {t("expenditure.actualSpend")}: {actualSpend}
            </p>
          )}
        </Field>
      </div>

      <Field
        label={t("expenditure.date")}
        name="expenditureDate"
        error={err("expenditureDate")}
      >
        <BsDatePicker
          name="expenditureDate"
          max={today}
          defaultValue={v.expenditureDate ?? today}
          aria-invalid={!!state.errors.expenditureDate}
          aria-describedby="expenditureDate-error"
        />
      </Field>

      <Field
        label={`${t("expenditure.remarks")} (${t("common.optional")})`}
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
