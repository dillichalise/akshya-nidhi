"use client";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  adToBs,
  bsMonthName,
  bsToAd,
  daysInBsMonth,
  firstWeekdayOfBsMonth,
  todayBs,
  weekdayShortLabels,
} from "@/lib/bs-date";
import { formatDate, todayInNepal } from "@/lib/format";
import { inputCls } from "./ui";

/**
 * A Bikram Sambat calendar picker for a plain AD "YYYY-MM-DD" value. Staff pick the date
 * they know (BS); the field's actual value (submitted under `name`, passed to `onChange`)
 * is always the equivalent AD date — `donation_date` and friends stay AD end to end.
 */
export function BsDatePicker({
  name,
  id = name,
  value,
  defaultValue,
  onChange,
  max,
  clearable,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: {
  name: string;
  id?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (adYmd: string) => void;
  max?: string;
  clearable?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const locale = useLocale();
  const t = useTranslations("common");
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? "");
  const selected = value ?? internal;
  const todayAd = todayInNepal();

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<{ year: number; month: number }>(() => (selected ? adToBs(selected) : todayBs()));
  const rootRef = useRef<HTMLDivElement>(null);

  // Keep the open month in sync when the value changes from outside (e.g. a filter reset).
  // Adjusted during render (not an effect) per https://react.dev/learn/you-might-not-need-an-effect.
  const [syncedFor, setSyncedFor] = useState(selected);
  if (selected !== syncedFor) {
    setSyncedFor(selected);
    if (selected) {
      const bs = adToBs(selected);
      setView({ year: bs.year, month: bs.month });
    }
  }

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const select = (adYmd: string) => {
    if (!isControlled) setInternal(adYmd);
    onChange?.(adYmd);
    setOpen(false);
  };

  const weekdays = useMemo(() => weekdayShortLabels(locale), [locale]);
  const daysInMonth = daysInBsMonth(view.year, view.month);
  const leadingBlanks = firstWeekdayOfBsMonth(view.year, view.month);
  const cells = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => bsToAd(view.year, view.month, i + 1)),
    [view.year, view.month, daysInMonth],
  );

  const changeMonth = (delta: number) => {
    const m = view.month + delta;
    setView(m < 0 ? { year: view.year - 1, month: 11 } : m > 11 ? { year: view.year + 1, month: 0 } : { ...view, month: m });
  };

  const todayIsDisabled = !!max && todayAd > max;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={ariaDescribedBy}
        className={inputCls + " flex items-center justify-between gap-2 text-left" + (ariaInvalid ? " !border-red-500" : "")}
      >
        <span className={selected ? "" : "text-stone-400"}>{selected ? formatDate(selected, locale) : t("selectDate")}</span>
        <CalendarDays aria-hidden size={18} className="shrink-0 text-stone-400" />
      </button>
      <input type="hidden" name={name} value={selected} />

      {open && (
        <div
          role="dialog"
          className="absolute z-20 mt-1 w-72 rounded-xl border border-stone-200 bg-white p-3 shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              aria-label={t("previousMonth")}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-medium text-stone-800">
              {bsMonthName(view.year, view.month, locale)} {view.year}
            </span>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              aria-label={t("nextMonth")}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-stone-500">
            {weekdays.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-sm">
            {Array.from({ length: leadingBlanks }, (_, i) => <div key={`b${i}`} />)}
            {cells.map((adYmd, i) => {
              const disabled = !!max && adYmd > max;
              const isSelected = selected === adYmd;
              const isToday = adYmd === todayAd;
              return (
                <button
                  key={adYmd}
                  type="button"
                  disabled={disabled}
                  onClick={() => select(adYmd)}
                  className={
                    "flex h-8 w-8 items-center justify-center rounded-lg tabular-nums " +
                    (isSelected
                      ? "bg-amber-700 font-semibold text-white"
                      : isToday
                        ? "border border-amber-600 text-stone-800"
                        : disabled
                          ? "text-stone-300"
                          : "text-stone-800 hover:bg-amber-50")
                  }
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-stone-100 pt-2">
            <button
              type="button"
              disabled={todayIsDisabled}
              onClick={() => select(todayAd)}
              className="text-sm font-medium text-amber-700 hover:underline disabled:text-stone-300 disabled:hover:no-underline"
            >
              {t("today")}
            </button>
            {clearable && selected && (
              <button type="button" onClick={() => select("")} className="text-sm text-stone-500 hover:underline">
                {t("clear")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
