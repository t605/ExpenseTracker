"use client";

import type { Expense } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { useExpenseActions } from "./ExpenseActions";
import { CategoryBadge } from "./ui";

export function ExpenseList({ expenses }: { expenses: Expense[] }) {
  const { openEdit, askDelete } = useExpenseActions();

  return (
    <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
      {expenses.map((e) => (
        <li key={e.id} className="flex items-center gap-3 px-4 py-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{e.description}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <CategoryBadge category={e.category} />
              <span>{formatDate(e.date)}</span>
            </p>
          </div>
          <p className="text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(e.amountCents)}</p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => openEdit(e)}
              aria-label={`Edit ${e.description}`}
              className="rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => askDelete(e)}
              aria-label={`Delete ${e.description}`}
              className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
