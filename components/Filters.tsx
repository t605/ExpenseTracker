"use client";

import { CATEGORIES, type Category, type ExpenseFilters, type SortKey } from "@/lib/types";
import { EMPTY_FILTERS, hasActiveFilters } from "@/lib/filter";

interface FiltersProps {
  filters: ExpenseFilters;
  onChange: (f: ExpenseFilters) => void;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
}

const control =
  "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500";
const label = "block text-xs font-medium text-slate-600";

export function Filters({ filters, onChange, sort, onSortChange }: FiltersProps) {
  const set = <K extends keyof ExpenseFilters>(key: K, value: ExpenseFilters[K]) =>
    onChange({ ...filters, [key]: value });
  const rangeInvalid = Boolean(filters.from && filters.to && filters.from > filters.to);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="sm:col-span-2">
          <label htmlFor="search" className={label}>
            Search
          </label>
          <input
            id="search"
            type="search"
            placeholder="Description or category"
            value={filters.search}
            onChange={(e) => set("search", e.target.value)}
            className={control}
          />
        </div>
        <div>
          <label htmlFor="filter-category" className={label}>
            Category
          </label>
          <select
            id="filter-category"
            value={filters.category}
            onChange={(e) => set("category", e.target.value as Category | "All")}
            className={control}
          >
            <option value="All">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="from" className={label}>
            From
          </label>
          <input
            id="from"
            type="date"
            value={filters.from}
            onChange={(e) => set("from", e.target.value)}
            className={control}
          />
        </div>
        <div>
          <label htmlFor="to" className={label}>
            To
          </label>
          <input
            id="to"
            type="date"
            value={filters.to}
            onChange={(e) => set("to", e.target.value)}
            className={control}
          />
        </div>
        <div>
          <label htmlFor="sort" className={label}>
            Sort by
          </label>
          <select id="sort" value={sort} onChange={(e) => onSortChange(e.target.value as SortKey)} className={control}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest amount</option>
            <option value="lowest">Lowest amount</option>
          </select>
        </div>
      </div>
      {rangeInvalid && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          The From date is after the To date, so nothing can match.
        </p>
      )}
      {hasActiveFilters(filters) && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="mt-3 text-xs font-medium text-indigo-600 hover:underline"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
