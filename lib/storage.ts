import { isCategory, type Expense } from "./types";
import { parseISODate } from "./format";

export const STORAGE_KEY = "expense-tracker:v1";

/** Keeps only well-formed records, so one damaged entry cannot break the app. */
export function sanitizeExpenses(raw: unknown): Expense[] {
  if (!Array.isArray(raw)) return [];
  const out: Expense[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const e = item as Record<string, unknown>;
    if (
      typeof e.id === "string" &&
      typeof e.date === "string" &&
      parseISODate(e.date) &&
      typeof e.amountCents === "number" &&
      Number.isInteger(e.amountCents) &&
      e.amountCents > 0 &&
      isCategory(e.category) &&
      typeof e.description === "string"
    ) {
      out.push({
        id: e.id,
        date: e.date,
        amountCents: e.amountCents,
        category: e.category,
        description: e.description,
        createdAt: typeof e.createdAt === "string" ? e.createdAt : new Date(0).toISOString(),
      });
    }
  }
  return out;
}

export function loadExpenses(): Expense[] {
  const text = window.localStorage.getItem(STORAGE_KEY);
  if (!text) return [];
  return sanitizeExpenses(JSON.parse(text));
}

export function saveExpenses(expenses: Expense[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
