"use client";

import { useCallback, useState } from "react";
import type { DestinationId, HistoryEntry } from "@/lib/cloud/types";
import { LoadingState } from "../ui";
import { useExpenses } from "../ExpensesProvider";
import { useCloud } from "./CloudProvider";
import { SyncStatusBar } from "./SyncStatusBar";
import { ExportTab, type ExportPreset } from "./ExportTab";
import { SchedulesTab } from "./SchedulesTab";
import { ConnectionsTab } from "./ConnectionsTab";
import { SharesTab } from "./SharesTab";
import { HistoryTab } from "./HistoryTab";
import { ConnectModal } from "./ConnectModal";

type TabId = "export" | "schedules" | "connections" | "share" | "history";

export function CloudHub() {
  const { loaded: expensesLoaded } = useExpenses();
  const { loaded, state, storageError } = useCloud();
  const [tab, setTab] = useState<TabId>("export");
  const [connecting, setConnecting] = useState<DestinationId | null>(null);
  const [preset, setPreset] = useState<ExportPreset | null>(null);
  const closeConnect = useCallback(() => setConnecting(null), []);

  if (!loaded || !expensesLoaded) return <LoadingState label="Loading export and sharing..." />;

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "export", label: "Export" },
    { id: "schedules", label: "Schedules", count: state.schedules.length },
    { id: "connections", label: "Connections", count: state.connections.length },
    { id: "share", label: "Share links", count: state.shares.length },
    { id: "history", label: "History", count: state.history.length },
  ];

  function retry(entry: HistoryEntry) {
    setPreset({ template: entry.template, destination: entry.destination, nonce: Date.now() });
    setTab("export");
  }

  return (
    <div className="space-y-5">
      <SyncStatusBar />

      {storageError && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {storageError}
        </p>
      )}

      <div
        role="tablist"
        aria-label="Export and share sections"
        className="flex gap-1 overflow-x-auto rounded-xl bg-slate-200/60 p-1"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={tab === t.id ? `panel-${t.id}` : undefined}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => {
              const at = tabs.findIndex((x) => x.id === tab);
              let next: number;
              if (e.key === "ArrowRight") next = (at + 1) % tabs.length;
              else if (e.key === "ArrowLeft") next = (at + tabs.length - 1) % tabs.length;
              else if (e.key === "Home") next = 0;
              else if (e.key === "End") next = tabs.length - 1;
              else return;
              e.preventDefault();
              setTab(tabs[next].id);
              document.getElementById(`tab-${tabs[next].id}`)?.focus();
            }}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition ${
              tab === t.id ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="rounded-full bg-slate-100 px-1.5 text-xs text-slate-600">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "export" && <ExportTab onConnect={setConnecting} onGoTo={setTab} preset={preset} />}
        {tab === "schedules" && <SchedulesTab onConnect={setConnecting} />}
        {tab === "connections" && <ConnectionsTab onConnect={setConnecting} />}
        {tab === "share" && <SharesTab />}
        {tab === "history" && <HistoryTab onRetry={retry} />}
      </div>

      {connecting && <ConnectModal destination={connecting} onClose={closeConnect} />}
    </div>
  );
}
