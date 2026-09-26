"use client";
import { useLocale } from "next-intl";
import { useTransition } from "react";
import { setLocaleAction } from "@/actions/locale";

export function LanguageSwitcher() {
  const locale = useLocale();
  const [pending, start] = useTransition();
  const opts = [
    { code: "en", label: "EN" },
    { code: "ne", label: "नेपाली" },
  ];
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-stone-300 text-sm" aria-busy={pending}>
      {opts.map((o) => (
        <button
          key={o.code}
          type="button"
          disabled={pending}
          aria-pressed={locale === o.code}
          onClick={() => start(() => setLocaleAction(o.code))}
          className={
            "min-h-9 px-3 " + (locale === o.code ? "bg-amber-700 text-white" : "bg-white text-stone-700 hover:bg-stone-50")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
