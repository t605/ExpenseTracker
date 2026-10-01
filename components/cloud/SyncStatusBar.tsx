"use client";

import { DESTINATIONS } from "@/lib/cloud/catalog";
import { timeAgo } from "@/lib/cloud/util";
import { useCloud } from "./CloudProvider";
import { ServiceBadge, Spinner, StatusPill } from "./ui";

/** The "how is everything doing" strip at the top of the Cloud page. */
export function SyncStatusBar() {
  const { state, activity } = useCloud();
  // A skipped run (nothing to send) does not change whether things are in sync.
  const last = state.history.find((h) => h.status !== "skipped");
  const lastOk = state.history.find((h) => h.status === "success");
  const failedSinceOk = last?.status === "failed";
  const activeSchedules = state.schedules.filter((s) => s.enabled).length;

  return (
    <section
      aria-label="Sync status"
      className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-5 text-white shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Export &amp; Share</h1>
          <p className="mt-1 text-sm text-indigo-100">
            Send reports to your accountant, keep copies in the cloud, share a link. All demo: nothing leaves this device.
          </p>
        </div>
        <div role="status" aria-live="polite" className="text-right">
          {activity ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
              <Spinner className="h-3.5 w-3.5" /> Syncing
            </span>
          ) : failedSinceOk ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-red-500/90 px-3 py-1 text-sm font-medium">
              <span className="h-2 w-2 rounded-full bg-white" aria-hidden="true" /> Last export failed
            </span>
          ) : lastOk ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/20 px-3 py-1 text-sm font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-300" aria-hidden="true" /> All synced
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
              <span className="h-2 w-2 rounded-full bg-white/70" aria-hidden="true" /> Nothing exported yet
            </span>
          )}
          {lastOk && !activity && (
            <p className="mt-1 text-xs text-indigo-100">Last successful export {timeAgo(lastOk.at)}</p>
          )}
        </div>
      </div>

      {activity && (
        <div className="mt-4 rounded-xl bg-white/10 p-3">
          <p className="text-sm font-medium">{activity.title}</p>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={activity.steps.length}
            aria-valuenow={activity.index + 1}
            aria-label="Export progress"
          >
            <div
              className="h-full rounded-full bg-white transition-all duration-500"
              style={{ width: `${((activity.index + 1) / activity.steps.length) * 100}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-indigo-100">
            {activity.steps[activity.index]}
            {activity.trigger !== "manual" && " (scheduled)"}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-indigo-100">
        <span className="flex items-center gap-2">
          {state.connections.length === 0 ? (
            "No services connected"
          ) : (
            <>
              <span className="flex -space-x-1.5">
                {state.connections.map((c) => (
                  <span key={c.destination} title={DESTINATIONS[c.destination].label} className="rounded-xl ring-2 ring-indigo-600">
                    <ServiceBadge destination={c.destination} size="sm" />
                  </span>
                ))}
              </span>
              {state.connections.length} connected
            </>
          )}
        </span>
        <span>
          {activeSchedules} active schedule{activeSchedules === 1 ? "" : "s"}
        </span>
        <span>
          {state.history.length} export{state.history.length === 1 ? "" : "s"} in history
        </span>
        <StatusPill tone="indigo">Demo mode</StatusPill>
      </div>
    </section>
  );
}
