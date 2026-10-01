"use client";

import { useMemo, useState } from "react";
import { useExpenses } from "@/components/ExpensesProvider";
import { useExpenseActions } from "@/components/ExpenseActions";
import { useToast } from "@/components/Toasts";
import { Filters } from "@/components/Filters";
import { ExpenseList } from "@/components/ExpenseList";
import { LoadingState } from "@/components/ui";
import { EMPTY_FILTERS, filterExpenses, hasActiveFilters, sortExpenses } from "@/lib/filter";
import { downloadCSV, expensesToCSV } from "@/lib/csv";
import { useCurrency } from "@/components/CurrencyProvider";
import { todayISO } from "@/lib/format";
import { totalCents } from "@/lib/analytics";
import type { ExpenseFilters, SortKey } from "@/lib/types";

export default function ExpensesPage() {
  const { expenses, loaded } = useExpenses();
  const { openAdd } = useExpenseActions();
  const toast = useToast();
  const { formatMoney } = useCurrency();
  const [filters, setFilters] = useState<ExpenseFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("newest");

  const visible = useMemo(() => sortExpenses(filterExpenses(expenses, filters), sort), [expenses, filters, sort]);

  if (!loaded) return <LoadingState />;

  function exportCSV() {
    try {
      downloadCSV(`expenses-${todayISO()}.csv`, expensesToCSV(visible));
      toast(`Exported ${visible.length} expense${visible.length === 1 ? "" : "s"}`);
    } catch {
      toast("Could not create the CSV file", "error");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
        <button
          type="button"
          onClick={exportCSV}
          disabled={visible.length === 0}
          className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Export CSV{hasActiveFilters(filters) ? " (filtered)" : ""}
        </button>
      </div>

      <Filters filters={filters} onChange={setFilters} sort={sort} onSortChange={setSort} />

      {expenses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-600">No expenses yet.</p>
          <button
            type="button"
            onClick={openAdd}
            className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Add your first expense
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-600">No expenses match these filters.</p>
          <button
            type="button"
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="mt-3 text-sm font-medium text-indigo-600 hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-600" aria-live="polite">
            Showing {visible.length} of {expenses.length} &middot; total{" "}
            <span className="font-semibold text-slate-900">{formatMoney(totalCents(visible))}</span>
          </p>
          <ExpenseList expenses={visible} />
        </>
      )}
    </div>
  );
}
