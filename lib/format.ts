import { CURRENCIES, DEFAULT_CURRENCY, type Currency } from "./currency";

// en-US digit grouping for every currency, so "1,234.56" looks the same whatever the symbol is.
const currencyFormatters = Object.fromEntries(
  CURRENCIES.map((currency) => [currency, new Intl.NumberFormat("en-US", { style: "currency", currency })]),
) as Record<Currency, Intl.NumberFormat>;

export function formatCurrency(cents: number, currency: Currency = DEFAULT_CURRENCY): string {
  return currencyFormatters[currency].format(cents / 100);
}

export function parseISODate(iso: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(year, month - 1, day);
  if (check.getFullYear() !== year || check.getMonth() !== month - 1 || check.getDate() !== day) {
    return null;
  }
  return { year, month, day };
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-10-01" -> "1 Oct 2026". Fixed month names, so every browser prints the same text. */
export function formatDate(iso: string): string {
  const parts = parseISODate(iso);
  if (!parts) return iso;
  return `${parts.day} ${MONTHS[parts.month - 1].slice(0, 3)} ${parts.year}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Today in the user's own time zone (not UTC), as YYYY-MM-DD. */
export function todayISO(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** "2026-10-01" -> "2026-10" */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function monthLabel(key: string, long = false): string {
  const [y, m] = key.split("-").map(Number);
  const name = MONTHS[m - 1];
  return long ? `${name} ${y}` : name.slice(0, 3);
}

/**
 * "12.5" / "1,234.50" -> cents. Done on the text, not with floats.
 * Returns null when the text is not a plain amount with at most 2 decimals.
 */
export function parseAmountToCents(text: string): number | null {
  const cleaned = text.trim().replace(/,/g, "");
  const match = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) return null;
  const whole = Number(match[1]);
  const frac = Number((match[2] ?? "").padEnd(2, "0") || "0");
  return whole * 100 + frac;
}

export function centsToInputValue(cents: number): string {
  return (cents / 100).toFixed(2);
}
