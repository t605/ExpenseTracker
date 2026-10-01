"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_CURRENCY, loadCurrency, saveCurrency, type Currency } from "@/lib/currency";
import { formatCurrency } from "@/lib/format";

interface CurrencyValue {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  /** Cents -> "₪1,234.50" in the chosen currency. */
  formatMoney: (cents: number) => string;
}

const CurrencyContext = createContext<CurrencyValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(DEFAULT_CURRENCY);

  // Read after mount (the server render cannot know the saved choice). Nothing is written here,
  // only when the user picks a currency, so a failed read can never overwrite the saved value.
  useEffect(() => {
    setCurrencyState(loadCurrency());
  }, []);

  const setCurrency = useCallback((next: Currency) => {
    setCurrencyState(next);
    saveCurrency(next);
  }, []);

  const value = useMemo<CurrencyValue>(
    () => ({ currency, setCurrency, formatMoney: (cents) => formatCurrency(cents, currency) }),
    [currency, setCurrency],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside <CurrencyProvider>");
  return ctx;
}
