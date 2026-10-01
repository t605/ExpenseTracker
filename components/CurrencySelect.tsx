"use client";

import { CURRENCIES, CURRENCY_INFO, isCurrency } from "@/lib/currency";
import { useCurrency } from "./CurrencyProvider";

export function CurrencySelect() {
  const { currency, setCurrency } = useCurrency();

  return (
    <select
      aria-label="Currency (changes the symbol only, amounts are not converted)"
      title="Currency symbol. Amounts are not converted."
      value={currency}
      onChange={(e) => {
        if (isCurrency(e.target.value)) setCurrency(e.target.value);
      }}
      className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      {CURRENCIES.map((c) => (
        <option key={c} value={c}>
          {CURRENCY_INFO[c].label}
        </option>
      ))}
    </select>
  );
}
