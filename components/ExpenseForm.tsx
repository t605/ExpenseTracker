"use client";

import { useState } from "react";
import { CATEGORIES, type Expense, type ExpenseFormValues } from "@/lib/types";
import { centsToInputValue, todayISO } from "@/lib/format";
import { CURRENCY_INFO } from "@/lib/currency";
import { useCurrency } from "./CurrencyProvider";
import { MAX_DESCRIPTION, validateExpense, type FormErrors, type ValidExpense } from "@/lib/validation";

interface ExpenseFormProps {
  initial?: Expense;
  onSubmit: (value: ValidExpense) => void;
  onCancel: () => void;
}

const inputClass =
  "mt-1 block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

export function ExpenseForm({ initial, onSubmit, onCancel }: ExpenseFormProps) {
  const { currency } = useCurrency();
  const [values, setValues] = useState<ExpenseFormValues>(() => ({
    date: initial?.date ?? todayISO(),
    amount: initial ? centsToInputValue(initial.amountCents) : "",
    category: initial?.category ?? "",
    description: initial?.description ?? "",
  }));
  const [errors, setErrors] = useState<FormErrors>({});

  function set<K extends keyof ExpenseFormValues>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = validateExpense(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    onSubmit(result.value);
  }

  function field(key: keyof ExpenseFormValues) {
    return {
      "aria-invalid": errors[key] ? true : undefined,
      "aria-describedby": errors[key] ? `${key}-error` : undefined,
      className: `${inputClass} ${errors[key] ? "border-red-400" : "border-slate-300"}`,
    } as const;
  }

  function error(key: keyof ExpenseFormValues) {
    return errors[key] ? (
      <p id={`${key}-error`} className="mt-1 text-xs text-red-600">
        {errors[key]}
      </p>
    ) : null;
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-slate-700">
            Date
          </label>
          <input
            id="date"
            type="date"
            value={values.date}
            onChange={(e) => set("date", e.target.value)}
            {...field("date")}
          />
          {error("date")}
        </div>
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-slate-700">
            Amount ({CURRENCY_INFO[currency].symbol})
          </label>
          <input
            id="amount"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={values.amount}
            onChange={(e) => set("amount", e.target.value)}
            {...field("amount")}
          />
          {error("amount")}
        </div>
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-slate-700">
          Category
        </label>
        <select
          id="category"
          value={values.category}
          onChange={(e) => set("category", e.target.value)}
          {...field("category")}
        >
          <option value="">Choose a category...</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {error("category")}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-slate-700">
          Description
        </label>
        <input
          id="description"
          type="text"
          maxLength={MAX_DESCRIPTION + 20}
          placeholder="e.g. Lunch with Dana"
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          {...field("description")}
        />
        {error("description")}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          {initial ? "Save changes" : "Add expense"}
        </button>
      </div>
    </form>
  );
}
