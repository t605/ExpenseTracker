import type { Expense, ExpenseFilters, SortKey } from "./types";

export const EMPTY_FILTERS: ExpenseFilters = { search: "", category: "All", from: "", to: "" };

export function hasActiveFilters(f: ExpenseFilters): boolean {
  return Boolean(f.search.trim() || f.category !== "All" || f.from || f.to);
}

/** Dates are YYYY-MM-DD, so plain string comparison is correct. */
export function filterExpenses(expenses: Expense[], f: ExpenseFilters): Expense[] {
  const term = f.search.trim().toLowerCase();
  return expenses.filter((e) => {
    if (f.category !== "All" && e.category !== f.category) return false;
    if (f.from && e.date < f.from) return false;
    if (f.to && e.date > f.to) return false;
    if (term && !`${e.description} ${e.category}`.toLowerCase().includes(term)) return false;
    return true;
  });
}

export function sortExpenses(expenses: Expense[], sort: SortKey): Expense[] {
  const copy = [...expenses];
  const byNewest = (a: Expense, b: Expense) =>
    b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
  switch (sort) {
    case "oldest":
      return copy.sort((a, b) => -byNewest(a, b));
    case "highest":
      return copy.sort((a, b) => b.amountCents - a.amountCents || byNewest(a, b));
    case "lowest":
      return copy.sort((a, b) => a.amountCents - b.amountCents || byNewest(a, b));
    default:
      return copy.sort(byNewest);
  }
}
