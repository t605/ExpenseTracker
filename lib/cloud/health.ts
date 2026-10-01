import type { Expense } from "../types";
import { todayISO } from "../format";

export interface HealthIssue {
  id: "empty" | "future" | "duplicates" | "short" | "outlier";
  level: "warn" | "info";
  message: string;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * A quick pre-flight check before data leaves the device. Nothing is changed: these are hints for
 * the person about to send a file to an accountant or a spreadsheet.
 */
export function dataHealth(expenses: Expense[], now: Date = new Date()): HealthIssue[] {
  const issues: HealthIssue[] = [];
  if (expenses.length === 0) {
    return [{ id: "empty", level: "warn", message: "There are no expenses yet, so the export would be empty." }];
  }

  const today = todayISO(now);
  const future = expenses.filter((e) => e.date > today).length;
  if (future > 0) {
    issues.push({ id: "future", level: "warn", message: `${plural(future, "expense is", "expenses are")} dated in the future.` });
  }

  const seen = new Map<string, number>();
  for (const e of expenses) {
    const key = `${e.date}|${e.amountCents}|${e.description.trim().toLowerCase()}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const duplicateGroups = Array.from(seen.values()).filter((n) => n > 1).length;
  if (duplicateGroups > 0) {
    issues.push({
      id: "duplicates",
      level: "warn",
      message: `${plural(duplicateGroups, "group", "groups")} of expenses look like duplicates (same day, amount and description).`,
    });
  }

  const short = expenses.filter((e) => e.description.trim().length < 3).length;
  if (short > 0) {
    issues.push({
      id: "short",
      level: "info",
      message: `${plural(short, "expense has", "expenses have")} a very short description, which is hard to read in a report.`,
    });
  }

  if (expenses.length >= 5) {
    const sorted = expenses.map((e) => e.amountCents).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const outliers = expenses.filter((e) => e.amountCents > median * 20).length;
    if (outliers > 0) {
      issues.push({
        id: "outlier",
        level: "info",
        message: `${plural(outliers, "amount is", "amounts are")} more than 20 times the typical expense. Worth a second look.`,
      });
    }
  }
  return issues;
}
