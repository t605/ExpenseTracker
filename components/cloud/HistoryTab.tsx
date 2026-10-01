"use client";

import { useState } from "react";
import { DESTINATIONS, TEMPLATES } from "@/lib/cloud/catalog";
import type { HistoryEntry, Trigger } from "@/lib/cloud/types";
import { formatBytes, formatDateTime, timeAgo } from "@/lib/cloud/util";
import { useCloud } from "./CloudProvider";
import { CopyButton, ServiceBadge, StatusPill, secondaryButton } from "./ui";

type Filter = "all" | "success" | "failed";

const TRIGGER_LABELS: Record<Trigger, string> = {
  manual: "Manual",
  schedule: "Scheduled",
  "catch-up": "Catch-up",
};

export function HistoryTab({ onRetry }: { onRetry: (entry: HistoryEntry) => void }) {
  const { state, clearHistory } = useCloud();
  const [filter, setFilter] = useState<Filter>("all");
  const [confirmClear, setConfirmClear] = useState(false);

  const all = state.history;
  const shown = filter === "all" ? all : all.filter((h) => h.status === filter);
  const failedCount = all.filter((h) => h.status === "failed").length;
  const successCount = all.filter((h) => h.status === "success").length;

  if (all.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-sm font-medium text-slate-800">No exports yet</p>
        <p className="mt-1 text-sm text-slate-600">Every export, scheduled run and failure will be listed here with its time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg bg-slate-100 p-1" role="group" aria-label="Filter history">
          {(["all", "success", "failed"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${filter === f ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600"}`}
            >
              {f === "all" ? `All (${all.length})` : f === "success" ? `Succeeded (${successCount})` : `Failed (${failedCount})`}
            </button>
          ))}
        </div>
        {confirmClear ? (
          <span className="flex items-center gap-2 text-xs text-red-700">
            Clear all {all.length} entries?
            <button
              type="button"
              onClick={() => {
                clearHistory();
                setConfirmClear(false);
              }}
              className="rounded-md bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700"
            >
              Clear
            </button>
            <button type="button" onClick={() => setConfirmClear(false)} className={secondaryButton}>
              Keep
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmClear(true)} className="text-xs font-medium text-red-600 hover:underline">
            Clear history
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
          Nothing matches this filter.
        </p>
      ) : (
        <ol className="space-y-2" aria-label="Export history">
          {shown.map((h) => (
            <li key={h.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <ServiceBadge destination={h.destination} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {TEMPLATES[h.template].label} to {DESTINATIONS[h.destination].label}
                    </p>
                    {h.status === "success" ? (
                      <StatusPill tone="green">Succeeded</StatusPill>
                    ) : h.status === "skipped" ? (
                      <StatusPill tone="amber">Skipped</StatusPill>
                    ) : (
                      <StatusPill tone="red">Failed</StatusPill>
                    )}
                    <StatusPill tone={h.trigger === "manual" ? "slate" : "indigo"}>{TRIGGER_LABELS[h.trigger]}</StatusPill>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    <time dateTime={h.at}>{formatDateTime(h.at)}</time> ({timeAgo(h.at)})
                  </p>
                  {h.status === "success" ? (
                    <p className="mt-1 break-all text-xs text-slate-600">
                      {h.detail} &middot; {h.filename} &middot; {formatBytes(h.bytes)} &middot; {h.records} expense
                      {h.records === 1 ? "" : "s"}
                    </p>
                  ) : h.status === "skipped" ? (
                    <p className="mt-1 text-xs text-amber-800">{h.detail}</p>
                  ) : (
                    <p className="mt-1 text-xs text-red-700">{h.error || "Failed."}</p>
                  )}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 pl-12">
                {h.fingerprint && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    SHA-256 <code className="rounded bg-slate-100 px-1">{h.fingerprint.slice(0, 12)}</code>
                    <CopyButton text={h.fingerprint} label="Copy" className="rounded-md px-1.5 py-0.5 text-xs font-medium text-indigo-600 hover:underline" />
                  </span>
                )}
                {h.status === "failed" && (
                  <button type="button" onClick={() => onRetry(h)} className={secondaryButton}>
                    Retry
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
      <p className="text-xs text-slate-500">
        The fingerprint is a SHA-256 of the exported file. If a file is ever questioned, its fingerprint shows whether it was
        changed after export. History keeps the latest 100 entries on this browser.
      </p>
    </div>
  );
}
