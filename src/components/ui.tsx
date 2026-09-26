import { clsx } from "clsx";
import type { ReactNode } from "react";

export const inputCls =
  "block w-full min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 " +
  "placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/30 " +
  "disabled:bg-stone-100 aria-[invalid=true]:border-red-500";

export const btnPrimary =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-amber-700 px-5 py-2 text-base font-medium " +
  "text-white hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-600/50 disabled:opacity-60";

export const btnGhost =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-2 " +
  "text-base font-medium text-stone-800 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-600/30";

export const btnDanger =
  "inline-flex min-h-9 items-center justify-center rounded-lg border border-red-300 bg-white px-3 py-1 " +
  "text-sm font-medium text-red-700 hover:bg-red-50";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6", className)}>{children}</div>;
}

export function PageTitle({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold text-stone-900">{children}</h1>
      {actions}
    </div>
  );
}

export function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-stone-700">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-sm text-stone-500">{hint}</p>}
      {error && (
        <p id={`${name}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export function Alert({ kind, children }: { kind: "success" | "error"; children: ReactNode }) {
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={clsx(
        "rounded-lg border px-4 py-3 text-sm",
        kind === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800",
      )}
    >
      {children}
    </div>
  );
}
