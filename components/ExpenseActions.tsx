"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Expense } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { useExpenses } from "./ExpensesProvider";
import { useCurrency } from "./CurrencyProvider";
import { useToast } from "./Toasts";
import { Modal } from "./Modal";
import { ExpenseForm } from "./ExpenseForm";

interface ActionsValue {
  openAdd: () => void;
  openEdit: (expense: Expense) => void;
  askDelete: (expense: Expense) => void;
}

const ActionsContext = createContext<ActionsValue | null>(null);

type Dialog = { kind: "add" } | { kind: "edit"; expense: Expense } | { kind: "delete"; expense: Expense } | null;

/** Owns the add / edit / delete dialogs so every page can open them. */
export function ExpenseActionsProvider({ children }: { children: React.ReactNode }) {
  const { addExpense, updateExpense, deleteExpense } = useExpenses();
  const toast = useToast();
  const { formatMoney } = useCurrency();
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = useCallback(() => setDialog(null), []);

  const value = useMemo<ActionsValue>(
    () => ({
      openAdd: () => setDialog({ kind: "add" }),
      openEdit: (expense) => setDialog({ kind: "edit", expense }),
      askDelete: (expense) => setDialog({ kind: "delete", expense }),
    }),
    [],
  );

  return (
    <ActionsContext.Provider value={value}>
      {children}

      {dialog?.kind === "add" && (
        <Modal title="Add expense" onClose={close}>
          <ExpenseForm
            onCancel={close}
            onSubmit={(v) => {
              addExpense(v);
              toast("Expense added");
              close();
            }}
          />
        </Modal>
      )}

      {dialog?.kind === "edit" && (
        <Modal title="Edit expense" onClose={close}>
          <ExpenseForm
            initial={dialog.expense}
            onCancel={close}
            onSubmit={(v) => {
              updateExpense(dialog.expense.id, v);
              toast("Expense updated");
              close();
            }}
          />
        </Modal>
      )}

      {dialog?.kind === "delete" && (
        <Modal title="Delete this expense?" onClose={close}>
          <p className="text-sm text-slate-600">
            {dialog.expense.description} &middot; {formatMoney(dialog.expense.amountCents)} &middot;{" "}
            {formatDate(dialog.expense.date)}
          </p>
          <p className="mt-2 text-sm text-slate-600">This cannot be undone.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={close}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                deleteExpense(dialog.expense.id);
                toast("Expense deleted");
                close();
              }}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </ActionsContext.Provider>
  );
}

export function useExpenseActions(): ActionsValue {
  const ctx = useContext(ActionsContext);
  if (!ctx) throw new Error("useExpenseActions must be used inside <ExpenseActionsProvider>");
  return ctx;
}
