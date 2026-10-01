import type { Category } from "./types";

/** Class names are written out in full so Tailwind can find them. */
export const CATEGORY_STYLES: Record<Category, { hex: string; badge: string; bar: string }> = {
  Food: { hex: "#f59e0b", badge: "bg-amber-100 text-amber-800", bar: "bg-amber-500" },
  Transportation: { hex: "#0ea5e9", badge: "bg-sky-100 text-sky-800", bar: "bg-sky-500" },
  Entertainment: { hex: "#a855f7", badge: "bg-purple-100 text-purple-800", bar: "bg-purple-500" },
  Shopping: { hex: "#ec4899", badge: "bg-pink-100 text-pink-800", bar: "bg-pink-500" },
  Bills: { hex: "#ef4444", badge: "bg-red-100 text-red-800", bar: "bg-red-500" },
  Other: { hex: "#64748b", badge: "bg-slate-200 text-slate-700", bar: "bg-slate-500" },
};
