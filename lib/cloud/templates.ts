import { CATEGORIES, type Category, type Expense } from "../types";
import { csvCell } from "../csv";
import { centsToInputValue, monthKey } from "../format";
import { sortExpenses } from "../filter";
import type { Currency } from "../currency";
import type { TemplateId } from "./types";

export interface ReportContext {
  now: Date;
  currency: Currency;
}

/** A finished report: a plain table of text cells, ready for CSV, a share link, or a preview. */
export interface Report {
  template: TemplateId;
  title: string;
  subtitle: string;
  /** File name without extension. */
  fileBase: string;
  columns: string[];
  rows: string[][];
  /** Totals row, or null. */
  footer: string[] | null;
  /** Expenses the report was built from. */
  recordCount: number;
}

const sum = (list: Expense[]) => list.reduce((s, e) => s + e.amountCents, 0);

/** The tax year is the current year if it has any expenses, otherwise the latest year that does. */
export function taxYearFor(expenses: Expense[], now: Date): number {
  const current = now.getFullYear();
  if (expenses.some((e) => e.date.startsWith(`${current}-`))) return current;
  const years = expenses.map((e) => Number(e.date.slice(0, 4))).filter((y) => Number.isInteger(y));
  return years.length ? Math.max(...years) : current;
}

function fullReport(expenses: Expense[], { currency }: ReportContext, stamp: string): Report {
  const ordered = sortExpenses(expenses, "oldest");
  return {
    template: "full",
    title: "Full data",
    subtitle: `${ordered.length} expense${ordered.length === 1 ? "" : "s"}, oldest first`,
    fileBase: `expenses-${stamp}`,
    columns: ["Date", "Category", `Amount (${currency})`, "Description"],
    rows: ordered.map((e) => [e.date, e.category, centsToInputValue(e.amountCents), e.description]),
    footer: ordered.length ? ["Total", "", centsToInputValue(sum(ordered)), ""] : null,
    recordCount: ordered.length,
  };
}

function taxReport(expenses: Expense[], ctx: ReportContext): Report {
  const year = taxYearFor(expenses, ctx.now);
  const inYear = sortExpenses(
    expenses.filter((e) => e.date.startsWith(`${year}-`)),
    "oldest",
  );
  const rows: string[][] = [];
  for (const category of CATEGORIES) {
    const list = inYear.filter((e) => e.category === category);
    if (list.length === 0) continue;
    for (const e of list) rows.push([category, e.date, e.description, centsToInputValue(e.amountCents)]);
    rows.push([category, "", `Subtotal ${category}`, centsToInputValue(sum(list))]);
  }
  return {
    template: "tax",
    title: `Tax report ${year}`,
    subtitle: `Tax year ${year} (1 Jan to 31 Dec), grouped by category`,
    fileBase: `tax-report-${year}`,
    columns: ["Category", "Date", "Description", `Amount (${ctx.currency})`],
    rows,
    footer: inYear.length ? ["Total", "", "", centsToInputValue(sum(inYear))] : null,
    recordCount: inYear.length,
  };
}

function topCategory(list: Expense[]): Category {
  let best: Category = CATEGORIES[0];
  let bestCents = -1;
  for (const category of CATEGORIES) {
    const cents = sum(list.filter((e) => e.category === category));
    if (cents > bestCents) {
      best = category;
      bestCents = cents;
    }
  }
  return best;
}

function monthlyReport(expenses: Expense[], ctx: ReportContext, stamp: string): Report {
  const keys = Array.from(new Set(expenses.map((e) => monthKey(e.date)))).sort();
  const rows = keys.map((key) => {
    const list = expenses.filter((e) => monthKey(e.date) === key);
    const total = sum(list);
    return [
      key,
      String(list.length),
      centsToInputValue(total),
      centsToInputValue(Math.round(total / list.length)),
      centsToInputValue(Math.max(...list.map((e) => e.amountCents))),
      topCategory(list),
    ];
  });
  const total = sum(expenses);
  const cur = ctx.currency;
  return {
    template: "monthly",
    title: "Monthly summary",
    subtitle: `${keys.length} month${keys.length === 1 ? "" : "s"} with spending`,
    fileBase: `monthly-summary-${stamp}`,
    columns: ["Month", "Expenses", `Total (${cur})`, `Average (${cur})`, `Largest (${cur})`, "Top category"],
    rows,
    footer: expenses.length
      ? [
          "All months",
          String(expenses.length),
          centsToInputValue(total),
          centsToInputValue(Math.round(total / expenses.length)),
          centsToInputValue(Math.max(...expenses.map((e) => e.amountCents))),
          "",
        ]
      : null,
    recordCount: expenses.length,
  };
}

/** One decimal, done on integers: 64.3 */
function percentOf(part: number, whole: number): string {
  if (whole <= 0) return "0.0";
  return (Math.round((part * 1000) / whole) / 10).toFixed(1);
}

function categoryReport(expenses: Expense[], ctx: ReportContext, stamp: string): Report {
  const total = sum(expenses);
  const cur = ctx.currency;
  const groups = CATEGORIES.map((category) => ({ category, list: expenses.filter((e) => e.category === category) }))
    .filter((g) => g.list.length > 0)
    .sort((a, b) => sum(b.list) - sum(a.list));
  const rows = groups.map(({ category, list }) => {
    const cents = list.map((e) => e.amountCents);
    const dates = list.map((e) => e.date).sort();
    return [
      category,
      String(list.length),
      centsToInputValue(sum(list)),
      percentOf(sum(list), total),
      centsToInputValue(Math.round(sum(list) / list.length)),
      centsToInputValue(Math.min(...cents)),
      centsToInputValue(Math.max(...cents)),
      dates[0],
      dates[dates.length - 1],
    ];
  });
  return {
    template: "category",
    title: "Category analysis",
    subtitle: `${groups.length} categor${groups.length === 1 ? "y" : "ies"}, biggest first`,
    fileBase: `category-analysis-${stamp}`,
    columns: [
      "Category",
      "Expenses",
      `Total (${cur})`,
      "Share (%)",
      `Average (${cur})`,
      `Smallest (${cur})`,
      `Largest (${cur})`,
      "First",
      "Last",
    ],
    rows,
    footer: expenses.length
      ? [
          "All categories",
          String(expenses.length),
          centsToInputValue(total),
          "100.0",
          centsToInputValue(Math.round(total / expenses.length)),
          "",
          "",
          "",
          "",
        ]
      : null,
    recordCount: expenses.length,
  };
}

export function buildReport(template: TemplateId, expenses: Expense[], ctx: ReportContext): Report {
  const stamp = `${ctx.now.getFullYear()}-${String(ctx.now.getMonth() + 1).padStart(2, "0")}-${String(ctx.now.getDate()).padStart(2, "0")}`;
  switch (template) {
    case "tax":
      return taxReport(expenses, ctx);
    case "monthly":
      return monthlyReport(expenses, ctx, stamp);
    case "category":
      return categoryReport(expenses, ctx, stamp);
    default:
      return fullReport(expenses, ctx, stamp);
  }
}

/** Any table of text cells to CSV (also used for a report opened from a share link). */
export function tableToCSV(table: Pick<Report, "columns" | "rows" | "footer">): string {
  const lines = [table.columns, ...table.rows, ...(table.footer ? [table.footer] : [])];
  return lines.map((cells) => cells.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function reportToCSV(report: Report): string {
  return tableToCSV(report);
}
