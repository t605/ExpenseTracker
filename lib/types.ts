export const CATEGORIES = [
  "Food",
  "Transportation",
  "Entertainment",
  "Shopping",
  "Bills",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Expense {
  id: string;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  /** Whole cents, so sums never suffer from floating-point errors. */
  amountCents: number;
  category: Category;
  description: string;
  createdAt: string;
}

/** Raw form values: everything is a string until validated. */
export interface ExpenseFormValues {
  date: string;
  amount: string;
  category: string;
  description: string;
}

export interface ExpenseFilters {
  search: string;
  category: Category | "All";
  from: string;
  to: string;
}

export type SortKey = "newest" | "oldest" | "highest" | "lowest";

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}
