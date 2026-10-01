import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate, monthLabel, parseAmountToCents, parseISODate, todayISO } from "@/lib/format";
import { validateExpense } from "@/lib/validation";
import { filterExpenses, sortExpenses } from "@/lib/filter";
import { categoryTotals, percentChange, recentMonthTotals, totalCents } from "@/lib/analytics";
import { csvCell, expensesToCSV } from "@/lib/csv";
import { sanitizeExpenses } from "@/lib/storage";
import { EMPTY_FILTERS } from "@/lib/filter";
import type { Expense } from "@/lib/types";

function exp(partial: Partial<Expense>): Expense {
  return {
    id: Math.random().toString(),
    date: "2026-10-01",
    amountCents: 1000,
    category: "Food",
    description: "Lunch",
    createdAt: "2026-10-01T10:00:00.000Z",
    ...partial,
  };
}

describe("amounts", () => {
  it("parses text to cents without float errors", () => {
    expect(parseAmountToCents("12.5")).toBe(1250);
    expect(parseAmountToCents("1,234.50")).toBe(123450);
    expect(parseAmountToCents("0.07")).toBe(7);
    expect(parseAmountToCents("19.99")).toBe(1999);
    expect(parseAmountToCents("5")).toBe(500);
  });
  it("rejects bad text", () => {
    for (const bad of ["", "abc", "-5", "1.234", "1e5", "12.", ".5", "1 2"]) {
      expect(parseAmountToCents(bad)).toBeNull();
    }
  });
  it("formats currency", () => {
    expect(formatCurrency(123456)).toBe("$1,234.56");
  });
});

describe("dates", () => {
  it("accepts real dates only", () => {
    expect(parseISODate("2026-02-28")).not.toBeNull();
    expect(parseISODate("2024-02-29")).not.toBeNull();
    expect(parseISODate("2026-02-30")).toBeNull();
    expect(parseISODate("2026-13-01")).toBeNull();
    expect(parseISODate("10/01/2026")).toBeNull();
  });
  it("formats dates and month labels with fixed names", () => {
    expect(formatDate("2026-09-28")).toBe("28 Sep 2026");
    expect(monthLabel("2026-09")).toBe("Sep");
    expect(monthLabel("2026-09", true)).toBe("September 2026");
  });
  it("todayISO uses the local date", () => {
    expect(todayISO(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("validation", () => {
  const good = { date: "2026-10-01", amount: "12.50", category: "Food", description: "  Lunch  " };
  it("accepts and normalises a good expense", () => {
    const r = validateExpense(good);
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(r.value).toEqual({ date: "2026-10-01", amountCents: 1250, category: "Food", description: "Lunch" });
  });
  it("reports every problem", () => {
    const r = validateExpense({ date: "", amount: "0", category: "Pets", description: " " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["amount", "category", "date", "description"]);
  });
  it("rejects too-long descriptions and huge amounts", () => {
    expect(validateExpense({ ...good, description: "x".repeat(101) }).ok).toBe(false);
    expect(validateExpense({ ...good, amount: "999999999.99" }).ok).toBe(true);
    expect(validateExpense({ ...good, amount: "1000000000" }).ok).toBe(false);
  });
});

describe("filter and sort", () => {
  const data = [
    exp({ id: "a", date: "2026-09-30", amountCents: 500, category: "Food", description: "Coffee" }),
    exp({ id: "b", date: "2026-10-01", amountCents: 9000, category: "Bills", description: "Electricity" }),
    exp({ id: "c", date: "2026-10-15", amountCents: 2000, category: "Food", description: "Dinner" }),
  ];
  it("filters by category, range (inclusive) and search", () => {
    expect(filterExpenses(data, { ...EMPTY_FILTERS, category: "Food" }).map((e) => e.id)).toEqual(["a", "c"]);
    expect(filterExpenses(data, { ...EMPTY_FILTERS, from: "2026-10-01", to: "2026-10-15" }).map((e) => e.id)).toEqual([
      "b",
      "c",
    ]);
    expect(filterExpenses(data, { ...EMPTY_FILTERS, search: "ELEC" }).map((e) => e.id)).toEqual(["b"]);
    expect(filterExpenses(data, { ...EMPTY_FILTERS, from: "2026-11-01", to: "2026-10-01" })).toEqual([]);
  });
  it("sorts without changing the original", () => {
    expect(sortExpenses(data, "newest").map((e) => e.id)).toEqual(["c", "b", "a"]);
    expect(sortExpenses(data, "highest").map((e) => e.id)).toEqual(["b", "c", "a"]);
    expect(data.map((e) => e.id)).toEqual(["a", "b", "c"]);
  });
});

describe("analytics", () => {
  const data = [
    exp({ date: "2026-10-01", amountCents: 1000, category: "Food" }),
    exp({ date: "2026-10-05", amountCents: 4000, category: "Bills" }),
    exp({ date: "2026-09-10", amountCents: 2000, category: "Food" }),
  ];
  it("totals and category shares", () => {
    expect(totalCents(data)).toBe(7000);
    const cats = categoryTotals(data);
    expect(cats.map((c) => c.category)).toEqual(["Bills", "Food"]);
    expect(cats[0].share).toBeCloseTo(4000 / 7000);
  });
  it("gives six months ending now, across a year boundary", () => {
    const months = recentMonthTotals(data, new Date(2026, 0, 15), 6);
    expect(months.map((m) => m.key)).toEqual(["2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01"]);
    const oct = recentMonthTotals(data, new Date(2026, 9, 15), 2);
    expect(oct).toEqual([
      { key: "2026-09", cents: 2000 },
      { key: "2026-10", cents: 5000 },
    ]);
  });
  it("percent change", () => {
    expect(percentChange(4000, 2000)).toBe(100);
    expect(percentChange(1000, 2000)).toBe(-50);
    expect(percentChange(1000, 0)).toBeNull();
  });
});

describe("csv", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(csvCell('say "hi", ok')).toBe('"say ""hi"", ok"');
    expect(csvCell("a\nb")).toBe('"a\nb"');
  });
  it("neutralises spreadsheet formulas", () => {
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell("@cmd")).toBe("'@cmd");
  });
  it("writes header and rows", () => {
    const csv = expensesToCSV([
      exp({ date: "2026-10-01", amountCents: 1250, category: "Food", description: "Lunch, big" }),
    ]);
    expect(csv).toBe('Date,Category,Description,Amount\r\n2026-10-01,Food,"Lunch, big",12.50\r\n');
  });
});

describe("storage sanitising", () => {
  it("drops damaged records and keeps good ones", () => {
    const good = exp({ id: "ok" });
    const out = sanitizeExpenses([
      good,
      null,
      5,
      { ...good, id: "bad1", amountCents: -1 },
      { ...good, id: "bad2", category: "Pets" },
      { ...good, id: "bad3", date: "2026-02-31" },
    ]);
    expect(out.map((e) => e.id)).toEqual(["ok"]);
    expect(sanitizeExpenses("nope")).toEqual([]);
  });
});
