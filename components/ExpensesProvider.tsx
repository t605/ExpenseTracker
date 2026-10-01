"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Expense } from "@/lib/types";
import type { ValidExpense } from "@/lib/validation";
import { loadExpenses, newId, saveExpenses } from "@/lib/storage";

interface ExpensesContextValue {
  expenses: Expense[];
  /** False until localStorage has been read in the browser. */
  loaded: boolean;
  /** Set when localStorage could not be read or written. */
  storageError: string | null;
  addExpense: (value: ValidExpense) => void;
  updateExpense: (id: string, value: ValidExpense) => void;
  deleteExpense: (id: string) => void;
}

const ExpensesContext = createContext<ExpensesContextValue | null>(null);

export function ExpensesProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  // Never write back before the first read, or we would wipe saved data with [].
  const readOk = useRef(false);

  useEffect(() => {
    try {
      setExpenses(loadExpenses());
      readOk.current = true;
    } catch {
      setStorageError(
        "Your saved expenses could not be read. New expenses will not be saved until this is fixed.",
      );
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded || !readOk.current) return;
    try {
      saveExpenses(expenses);
      setStorageError(null);
    } catch {
      setStorageError("Could not save to this browser (storage may be full or blocked).");
    }
  }, [expenses, loaded]);

  const addExpense = useCallback((value: ValidExpense) => {
    const expense: Expense = { ...value, id: newId(), createdAt: new Date().toISOString() };
    setExpenses((prev) => [expense, ...prev]);
  }, []);

  const updateExpense = useCallback((id: string, value: ValidExpense) => {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...value } : e)));
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const value = useMemo(
    () => ({ expenses, loaded, storageError, addExpense, updateExpense, deleteExpense }),
    [expenses, loaded, storageError, addExpense, updateExpense, deleteExpense],
  );

  return <ExpensesContext.Provider value={value}>{children}</ExpensesContext.Provider>;
}

export function useExpenses(): ExpensesContextValue {
  const ctx = useContext(ExpensesContext);
  if (!ctx) throw new Error("useExpenses must be used inside <ExpensesProvider>");
  return ctx;
}
