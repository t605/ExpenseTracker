"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useExpenses } from "@/components/ExpensesProvider";
import { useExpenseActions } from "@/components/ExpenseActions";
import { SummaryCards } from "@/components/SummaryCards";
import { CategoryChart, MonthlyChart } from "@/components/Charts";
import { ExpenseList } from "@/components/ExpenseList";
import { Card, LoadingState } from "@/components/ui";
import { sortExpenses } from "@/lib/filter";

export default function DashboardPage() {
  const { expenses, loaded } = useExpenses();
  const { openAdd } = useExpenseActions();
  const now = useMemo(() => new Date(), []);
  const recent = useMemo(() => sortExpenses(expenses, "newest").slice(0, 5), [expenses]);

  if (!loaded) return <LoadingState />;

  if (expenses.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <h1 className="text-xl font-semibold">Welcome to Expense Tracker</h1>
        <p className="mt-2 text-sm text-slate-600">
          You have not added any expenses yet. Add your first one and this page will show where your money goes.
          Your data stays in this browser only.
        </p>
        <button
          type="button"
          onClick={openAdd}
          className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Add your first expense
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      <SummaryCards expenses={expenses} now={now} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Spending by category">
          <CategoryChart expenses={expenses} />
        </Card>
        <Card title="Last 6 months">
          <MonthlyChart expenses={expenses} now={now} />
        </Card>
      </div>
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Recent expenses</h2>
          <Link href="/expenses" className="text-sm font-medium text-indigo-600 hover:underline">
            View all
          </Link>
        </div>
        <ExpenseList expenses={recent} />
      </div>
    </div>
  );
}
