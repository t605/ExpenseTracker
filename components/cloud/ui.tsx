"use client";

import { useState } from "react";
import { DESTINATIONS } from "@/lib/cloud/catalog";
import type { DestinationId } from "@/lib/cloud/types";

export type Tone = "green" | "amber" | "red" | "slate" | "indigo";

const TONES: Record<Tone, { pill: string; dot: string }> = {
  green: { pill: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  amber: { pill: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  red: { pill: "bg-red-50 text-red-700 ring-red-200", dot: "bg-red-500" },
  slate: { pill: "bg-slate-100 text-slate-600 ring-slate-200", dot: "bg-slate-400" },
  indigo: { pill: "bg-indigo-50 text-indigo-700 ring-indigo-200", dot: "bg-indigo-500" },
};

export function StatusPill({ tone, children, pulse = false }: { tone: Tone; children: React.ReactNode; pulse?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone].pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${TONES[tone].dot} ${pulse ? "animate-pulse" : ""}`} aria-hidden="true" />
      {children}
    </span>
  );
}

export function ServiceBadge({ destination, size = "md" }: { destination: DestinationId; size?: "sm" | "md" | "lg" }) {
  const info = DESTINATIONS[destination];
  const box = size === "lg" ? "h-11 w-11 text-lg" : size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm";
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-xl font-bold ${box} ${info.badge}`} aria-hidden="true">
      {info.initial}
    </span>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
        checked ? "bg-indigo-600" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`}
      />
    </button>
  );
}

export const fieldClass =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500";
export const labelClass = "mb-1 block text-xs font-medium text-slate-600";
export const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Copies text and shows "Copied" for a moment. Falls back to a text prompt when the clipboard is blocked. */
export function CopyButton({ text, label = "Copy", className = secondaryButton }: { text: string; label?: string; className?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 2000);
  }
  return (
    <button type="button" onClick={() => void copy()} className={className}>
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label}
    </button>
  );
}
