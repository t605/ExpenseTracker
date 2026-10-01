/**
 * The currency is a DISPLAY choice: amounts are stored as plain cents with no currency attached, and
 * switching currency changes only the symbol shown. Nothing is converted.
 */
export const CURRENCIES = ["ILS", "USD", "EUR"] as const;

export type Currency = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = "USD";

export const CURRENCY_INFO: Record<Currency, { symbol: string; label: string }> = {
  ILS: { symbol: "₪", label: "₪ ש\"ח" },
  USD: { symbol: "$", label: "$ Dollar" },
  EUR: { symbol: "€", label: "€ Euro" },
};

export const CURRENCY_STORAGE_KEY = "expense-tracker:currency";

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}

/** Saved choice, or the default when nothing valid is saved or storage is unavailable. */
export function loadCurrency(): Currency {
  try {
    const saved = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
    return isCurrency(saved) ? saved : DEFAULT_CURRENCY;
  } catch {
    return DEFAULT_CURRENCY;
  }
}

export function saveCurrency(currency: Currency): void {
  try {
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
  } catch {
    // Private mode or full storage: the choice then lasts until the page is closed.
  }
}
