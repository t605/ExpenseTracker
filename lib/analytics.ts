import { CATEGORIES, type Category, type Expense } from "./types";
import { monthKey, monthKeyOf } from "./format";

export function totalCents(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amountCents, 0);
}

export function monthTotalCents(expenses: Expense[], key: string): number {
  return totalCents(expenses.filter((e) => monthKey(e.date) === key));
}

export function previousMonthKey(now: Date): string {
  return monthKeyOf(new Date(now.getFullYear(), now.getMonth() - 1, 1));
}

export interface CategoryTotal {
  category: Category;
  cents: number;
  share: number; // 0..1
}

/** Only categories with spending, biggest first. */
export function categoryTotals(expenses: Expense[]): CategoryTotal[] {
  const total = totalCents(expenses);
  return CATEGORIES.map((category) => {
    const cents = totalCents(expenses.filter((e) => e.category === category));
    return { category, cents, share: total > 0 ? cents / total : 0 };
  })
    .filter((c) => c.cents > 0)
    .sort((a, b) => b.cents - a.cents);
}

export interface MonthTotal {
  key: string;
  cents: number;
}

/** The last `count` calendar months ending with the current one, oldest first. */
export function recentMonthTotals(expenses: Expense[], now: Date, count = 6): MonthTotal[] {
  const out: MonthTotal[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const key = monthKeyOf(new Date(now.getFullYear(), now.getMonth() - i, 1));
    out.push({ key, cents: monthTotalCents(expenses, key) });
  }
  return out;
}

/** Percentage change from previous to current; null when there is nothing to compare with. */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
