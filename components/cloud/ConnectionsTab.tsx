"use client";

import { useState } from "react";
import { DESTINATIONS, DESTINATION_ORDER } from "@/lib/cloud/catalog";
import type { DestinationId } from "@/lib/cloud/types";
import { formatBytes, formatDateTime, timeAgo } from "@/lib/cloud/util";
import { useCloud } from "./CloudProvider";
import { ServiceBadge, StatusPill, fieldClass, labelClass, primaryButton, secondaryButton } from "./ui";

const CONNECTABLE = DESTINATION_ORDER.filter((d) => DESTINATIONS[d].needsConnection);

export function ConnectionsTab({ onConnect }: { onConnect: (destination: DestinationId) => void }) {
  const { state, disconnect, setFolder } = useCloud();
  const [confirming, setConfirming] = useState<DestinationId | null>(null);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Connect a service once, then send any report to it, or let a schedule do it. These are demo connections: they
        show how the flow would feel, and nothing is sent to the real services.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {CONNECTABLE.map((id) => {
          const info = DESTINATIONS[id];
          const connection = state.connections.find((c) => c.destination === id);
          const entries = state.history.filter((h) => h.destination === id);
          const lastEntry = entries[0];
          const okEntries = entries.filter((h) => h.status === "success");
          const usedBytes = okEntries.reduce((sum, h) => sum + h.bytes, 0);
          const usedBy = state.schedules.filter((s) => s.destination === id && s.enabled).length;

          return (
            <section key={id} aria-label={info.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <ServiceBadge destination={id} size="lg" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-slate-900">{info.label}</h2>
                  <p className="text-xs text-slate-500">{info.blurb}</p>
                </div>
                {connection ? (
                  !lastEntry ? (
                    <StatusPill tone="slate">Never synced</StatusPill>
                  ) : lastEntry.status === "failed" ? (
                    <StatusPill tone="red">Sync error</StatusPill>
                  ) : (
                    <StatusPill tone="green">Synced</StatusPill>
                  )
                ) : (
                  <StatusPill tone="slate">Not connected</StatusPill>
                )}
              </div>

              {connection ? (
                <div className="mt-4 space-y-3">
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                    <dt className="text-slate-500">Account</dt>
                    <dd className="text-slate-800">{connection.account} (demo)</dd>
                    <dt className="text-slate-500">Connected</dt>
                    <dd className="text-slate-800">{formatDateTime(connection.connectedAt)}</dd>
                    <dt className="text-slate-500">Last sync</dt>
                    <dd className="text-slate-800">
                      {lastEntry ? `${timeAgo(lastEntry.at)}${lastEntry.status === "failed" ? " (failed)" : ""}` : "None yet"}
                    </dd>
                    <dt className="text-slate-500">Uploaded</dt>
                    <dd className="text-slate-800">
                      {okEntries.length} file{okEntries.length === 1 ? "" : "s"}, {formatBytes(usedBytes)}
                    </dd>
                    <dt className="text-slate-500">Schedules</dt>
                    <dd className="text-slate-800">
                      {usedBy} active
                    </dd>
                  </dl>
                  <div>
                    <label htmlFor={`folder-${id}`} className={labelClass}>
                      {info.kind === "sheets" ? "Save spreadsheets in" : "Default folder"}
                    </label>
                    <input
                      id={`folder-${id}`}
                      type="text"
                      maxLength={120}
                      value={connection.folder}
                      onChange={(e) => setFolder(id, e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  {confirming === id ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-red-50 p-2 text-xs text-red-800">
                      <span className="flex-1">
                        Disconnect {info.label}? Schedules that use it will be paused.
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          disconnect(id);
                          setConfirming(null);
                        }}
                        className="rounded-md bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700"
                      >
                        Disconnect
                      </button>
                      <button type="button" onClick={() => setConfirming(null)} className={secondaryButton}>
                        Keep
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirming(id)} className="text-xs font-medium text-red-600 hover:underline">
                      Disconnect
                    </button>
                  )}
                </div>
              ) : (
                <div className="mt-4">
                  <button type="button" onClick={() => onConnect(id)} className={primaryButton}>
                    Connect {info.label}
                  </button>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
