import type { Expense } from "@/lib/types";
import { CATEGORY_STYLES } from "@/lib/categories";
import { categoryTotals, recentMonthTotals } from "@/lib/analytics";
import { formatCurrency, monthLabel } from "@/lib/format";

/** Spending by category: a donut plus a legend that doubles as the accessible text. */
export function CategoryChart({ expenses }: { expenses: Expense[] }) {
  const data = categoryTotals(expenses);
  if (data.length === 0) return <p className="text-sm text-slate-500">No spending to show yet.</p>;

  const radius = 15.9155; // circumference = 100, so dash lengths are percentages
  let offset = 25; // start at 12 o'clock

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <svg viewBox="0 0 42 42" className="h-40 w-40 shrink-0" role="img" aria-label="Spending by category">
        <circle cx="21" cy="21" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        {data.map((d) => {
          const pct = d.share * 100;
          const circle = (
            <circle
              key={d.category}
              cx="21"
              cy="21"
              r={radius}
              fill="none"
              stroke={CATEGORY_STYLES[d.category].hex}
              strokeWidth="6"
              strokeDasharray={`${pct} ${100 - pct}`}
              strokeDashoffset={offset}
            />
          );
          offset -= pct;
          return circle;
        })}
      </svg>
      <ul className="w-full space-y-2 text-sm">
        {data.map((d) => (
          <li key={d.category} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm" style={{ background: CATEGORY_STYLES[d.category].hex }} aria-hidden="true" />
              {d.category}
            </span>
            <span className="text-slate-600">
              {formatCurrency(d.cents)} <span className="text-slate-400">&middot; {Math.round(d.share * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Last six months as bars. */
export function MonthlyChart({ expenses, now }: { expenses: Expense[]; now: Date }) {
  const months = recentMonthTotals(expenses, now, 6);
  const max = Math.max(...months.map((m) => m.cents), 1);

  return (
    <div>
      <div className="flex h-44 items-end gap-2 sm:gap-4" role="img" aria-label="Spending per month, last six months">
        {months.map((m) => (
          <div key={m.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] text-slate-500 sm:text-xs">{m.cents > 0 ? formatCurrency(m.cents) : ""}</span>
            <div
              className="w-full rounded-t-md bg-indigo-500"
              style={{ height: `${Math.max((m.cents / max) * 100, m.cents > 0 ? 3 : 0)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 sm:gap-4">
        {months.map((m) => (
          <span key={m.key} className="flex-1 text-center text-xs text-slate-500">
            {monthLabel(m.key)}
          </span>
        ))}
      </div>
    </div>
  );
}
