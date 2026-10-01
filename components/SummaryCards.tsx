"use client";

import type { Expense } from "@/lib/types";
import { monthKeyOf, monthLabel } from "@/lib/format";
import { useCurrency } from "./CurrencyProvider";
import { categoryTotals, monthTotalCents, percentChange, previousMonthKey, totalCents } from "@/lib/analytics";

function StatCard({ label, value, hint }: { label: string; value: string; hint?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 truncate text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function SummaryCards({ expenses, now }: { expenses: Expense[]; now: Date }) {
  const { formatMoney } = useCurrency();
  const key = monthKeyOf(now);
  const thisMonth = monthTotalCents(expenses, key);
  const lastMonth = monthTotalCents(expenses, previousMonthKey(now));
  const change = percentChange(thisMonth, lastMonth);
  const top = categoryTotals(expenses)[0];
  const total = totalCents(expenses);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total spending" value={formatMoney(total)} hint={`${expenses.length} expense${expenses.length === 1 ? "" : "s"}`} />
      <StatCard
        label={`Spent in ${monthLabel(key, true)}`}
        value={formatMoney(thisMonth)}
        hint={
          change === null ? (
            "No spending last month to compare"
          ) : (
            <span className={change > 0 ? "text-red-600" : "text-emerald-600"}>
              {change > 0 ? "↑" : change < 0 ? "↓" : ""} {Math.abs(change)}% vs last month
            </span>
          )
        }
      />
      <StatCard
        label="Average expense"
        value={formatMoney(expenses.length ? Math.round(total / expenses.length) : 0)}
        hint="Across all expenses"
      />
      <StatCard
        label="Top category"
        value={top ? top.category : "-"}
        hint={top ? `${formatMoney(top.cents)} (${Math.round(top.share * 100)}% of spending)` : "Add an expense to see this"}
      />
    </div>
  );
}
