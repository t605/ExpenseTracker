import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CURRENCIES, CURRENCY_STORAGE_KEY, DEFAULT_CURRENCY, isCurrency, loadCurrency, saveCurrency } from "@/lib/currency";
import { formatCurrency } from "@/lib/format";

describe("formatCurrency", () => {
  it("defaults to dollars", () => expect(formatCurrency(123456)).toBe("$1,234.56"));
  it("shows the shekel sign", () => expect(formatCurrency(123456, "ILS")).toBe("₪1,234.56"));
  it("shows the euro sign", () => expect(formatCurrency(123456, "EUR")).toBe("€1,234.56"));
  it("keeps the same digits in every currency (no conversion)", () => {
    for (const c of CURRENCIES) expect(formatCurrency(5, c)).toMatch(/0\.05$/);
  });
});

describe("currency choice", () => {
  it("recognises only the three currencies", () => {
    expect(CURRENCIES).toEqual(["ILS", "USD", "EUR"]);
    expect(isCurrency("EUR")).toBe(true);
    expect(isCurrency("GBP")).toBe(false);
    expect(isCurrency(undefined)).toBe(false);
  });

  describe("storage", () => {
    const store = new Map<string, string>();
    beforeEach(() => {
      store.clear();
      vi.stubGlobal("window", {
        localStorage: {
          getItem: (k: string) => store.get(k) ?? null,
          setItem: (k: string, v: string) => void store.set(k, v),
        },
      });
    });
    afterEach(() => vi.unstubAllGlobals());

    it("falls back to the default when nothing is saved", () => expect(loadCurrency()).toBe(DEFAULT_CURRENCY));
    it("round-trips a saved currency", () => {
      saveCurrency("ILS");
      expect(store.get(CURRENCY_STORAGE_KEY)).toBe("ILS");
      expect(loadCurrency()).toBe("ILS");
    });
    it("ignores a damaged saved value", () => {
      store.set(CURRENCY_STORAGE_KEY, "<script>");
      expect(loadCurrency()).toBe(DEFAULT_CURRENCY);
    });
    it("survives storage that throws", () => {
      vi.stubGlobal("window", {
        localStorage: {
          getItem: () => {
            throw new Error("blocked");
          },
          setItem: () => {
            throw new Error("blocked");
          },
        },
      });
      expect(loadCurrency()).toBe(DEFAULT_CURRENCY);
      expect(() => saveCurrency("EUR")).not.toThrow();
    });
  });
});
