import type { Expense } from "./types";

/**
 * Quotes a cell for CSV. Text starting with = + - @ would be run as a formula by
 * Excel, so it gets a leading apostrophe.
 */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? "'" + value : value;
  return /[",\r\n]/.test(safe) ? '"' + safe.replace(/"/g, '""') + '"' : safe;
}

export function expensesToCSV(expenses: Expense[]): string {
  const rows = [["Date", "Category", "Description", "Amount"]];
  for (const e of expenses) {
    rows.push([e.date, e.category, e.description, (e.amountCents / 100).toFixed(2)]);
  }
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function downloadCSV(filename: string, csv: string): void {
  // The BOM makes Excel read the file as UTF-8.
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
