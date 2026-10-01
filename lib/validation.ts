import { isCategory, type Category, type ExpenseFormValues } from "./types";
import { parseAmountToCents, parseISODate } from "./format";

export const MAX_DESCRIPTION = 100;
export const MAX_CENTS = 99_999_999_999; // 999,999,999.99

export type FormErrors = Partial<Record<keyof ExpenseFormValues, string>>;

export interface ValidExpense {
  date: string;
  amountCents: number;
  category: Category;
  description: string;
}

export function validateExpense(
  values: ExpenseFormValues,
): { ok: true; value: ValidExpense } | { ok: false; errors: FormErrors } {
  const errors: FormErrors = {};

  const date = values.date.trim();
  const parsed = parseISODate(date);
  if (!date) errors.date = "Choose a date.";
  else if (!parsed) errors.date = "Enter a valid date.";
  else if (parsed.year < 1970) errors.date = "Date must be 1970 or later.";

  const amountCents = parseAmountToCents(values.amount);
  if (!values.amount.trim()) errors.amount = "Enter an amount.";
  else if (amountCents === null) errors.amount = "Use numbers only, with up to 2 decimals (e.g. 12.50).";
  else if (amountCents <= 0) errors.amount = "Amount must be greater than zero.";
  else if (amountCents > MAX_CENTS) errors.amount = "Amount is too large.";

  if (!isCategory(values.category)) errors.category = "Choose a category.";

  const description = values.description.trim();
  if (!description) errors.description = "Add a short description.";
  else if (description.length > MAX_DESCRIPTION) {
    errors.description = `Keep it under ${MAX_DESCRIPTION} characters.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      date,
      amountCents: amountCents as number,
      category: values.category as Category,
      description,
    },
  };
}
