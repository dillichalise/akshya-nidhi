"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string };
export type NavUser = { fullName: string; role: string };

/**
 * Mobile hamburger menu + slide-in drawer.
 * Renders a hamburger button that is only visible below `md`.
 * The horizontal tab bar in AppShell is only visible at `md+`.
 */
export function NavDrawer({
  items,
  user,
  logoutLabel,
  logoutAction,
}: {
  items: NavItem[];
  user: NavUser;
  logoutLabel: string;
  logoutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Prevent body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Hamburger button — visible only below md */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-600 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-600/30 md:hidden"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        id="mobile-nav-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out md:hidden " +
          (open ? "translate-x-0" : "-translate-x-full")
        }
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-4">
          <span className="text-base font-semibold text-amber-800">Menu</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-600/30"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
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

        {/* Nav links — scrollable if many items */}
        <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Main">
          <ul className="space-y-0.5">
            {items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={
                      "flex min-h-12 items-center rounded-xl px-4 text-sm font-medium transition-colors " +
                      (active
                        ? "bg-amber-50 text-amber-900"
                        : "text-stone-700 hover:bg-stone-100 hover:text-stone-900 active:bg-stone-200")
                    }
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer — user info + logout */}
        <div className="shrink-0 border-t border-stone-200 px-4 py-4">
          {/* User identity */}
          <div className="mb-3 px-1">
            <div className="text-sm font-medium text-stone-800">
              {user.fullName}
            </div>
            <div className="text-xs text-stone-500">{user.role}</div>
          </div>
          {/* Logout */}
          <form action={logoutAction} onSubmit={() => setOpen(false)}>
            <button
              type="submit"
              className="flex w-full min-h-11 items-center gap-3 rounded-xl px-4 text-sm font-medium text-red-600 hover:bg-red-50 active:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400/40 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {logoutLabel}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
