"use client";

import { useExpenses } from "./ExpensesProvider";

export function StorageBanner() {
  const { storageError } = useExpenses();
  if (!storageError) return null;
  return (
    <div role="alert" className="border-b border-red-200 bg-red-50 px-4 py-2 text-center text-sm text-red-800">
      {storageError}
    </div>
  );
}
