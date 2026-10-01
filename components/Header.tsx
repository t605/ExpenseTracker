"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useExpenseActions } from "./ExpenseActions";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/expenses", label: "Expenses" },
];

export function Header() {
  const pathname = usePathname();
  const { openAdd } = useExpenseActions();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-4 sm:gap-8">
          <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white" aria-hidden="true">
              $
            </span>
            <span className="hidden sm:inline">Expense Tracker</span>
          </Link>
          <nav aria-label="Main" className="flex gap-1">
            {LINKS.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="whitespace-nowrap rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          <span className="sm:hidden">+ Add</span>
          <span className="hidden sm:inline">+ Add expense</span>
        </button>
      </div>
    </header>
  );
}
