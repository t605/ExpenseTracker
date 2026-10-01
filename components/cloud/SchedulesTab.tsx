"use client";

import { useEffect, useState } from "react";
import {
  DESTINATIONS,
  FREQUENCY_LABELS,
  SCHEDULE_DESTINATIONS,
  TEMPLATES,
  TEMPLATE_ORDER,
  WEEKDAYS,
} from "@/lib/cloud/catalog";
import { describeTiming, formatHour, nextRun, nextRunOf, untilLabel } from "@/lib/cloud/schedule";
import type { DestinationId, Frequency, Schedule, TemplateId } from "@/lib/cloud/types";
import { formatDateTime, timeAgo } from "@/lib/cloud/util";
import { useCloud } from "./CloudProvider";
import { ServiceBadge, StatusPill, Toggle, fieldClass, labelClass, primaryButton, secondaryButton } from "./ui";

const FREQUENCIES: Frequency[] = ["daily", "weekly", "monthly"];
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const DAYS = Array.from({ length: 28 }, (_, d) => d + 1);

/** Re-renders every minute so "in 3 h" labels stay fresh. */
function useNow(everyMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), everyMs);
    return () => window.clearInterval(timer);
  }, [everyMs]);
  return now;
}

export function SchedulesTab({ onConnect }: { onConnect: (destination: DestinationId) => void }) {
  const { state, addSchedule, setScheduleEnabled, removeSchedule, runScheduleNow, pretendAway, activity } = useCloud();
  const now = useNow();

  const [name, setName] = useState("");
  const [template, setTemplate] = useState<TemplateId>("monthly");
  const [destination, setDestination] = useState<DestinationId>("email");
  const [recipient, setRecipient] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [weekday, setWeekday] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [hour, setHour] = useState(8);
  const [error, setError] = useState("");

  const info = DESTINATIONS[destination];
  const connected = state.connections.some((c) => c.destination === destination);
  const timing = { frequency, hour, weekday, dayOfMonth };
  const upcoming = nextRun(timing, now);

  function create(event: React.FormEvent) {
    event.preventDefault();
    const problem = addSchedule({
      name: name.trim() || `${TEMPLATES[template].label} to ${info.label}`,
      template,
      destination,
      frequency,
      hour,
      weekday,
      dayOfMonth,
      recipient,
    });
    setError(problem ?? "");
    if (!problem) setName("");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <section aria-labelledby="new-schedule" className="lg:col-span-2">
        <form onSubmit={create} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 id="new-schedule" className="text-sm font-semibold text-slate-900">
            New automatic export
          </h2>

          <div>
            <label htmlFor="sch-name" className={labelClass}>
              Name (optional)
            </label>
            <input
              id="sch-name"
              type="text"
              maxLength={40}
              placeholder={`${TEMPLATES[template].label} to ${info.label}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sch-template" className={labelClass}>
                Report
              </label>
              <select
                id="sch-template"
                value={template}
                onChange={(e) => setTemplate(e.target.value as TemplateId)}
                className={fieldClass}
              >
                {TEMPLATE_ORDER.map((t) => (
                  <option key={t} value={t}>
                    {TEMPLATES[t].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sch-dest" className={labelClass}>
                Send to
              </label>
              <select
                id="sch-dest"
                value={destination}
                onChange={(e) => setDestination(e.target.value as DestinationId)}
                className={fieldClass}
              >
                {SCHEDULE_DESTINATIONS.map((d) => (
                  <option key={d} value={d}>
                    {DESTINATIONS[d].label}
                    {DESTINATIONS[d].needsConnection && !state.connections.some((c) => c.destination === d)
                      ? " (not connected)"
                      : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {info.kind === "email" && (
            <div>
              <label htmlFor="sch-to" className={labelClass}>
                Email address
              </label>
              <input
                id="sch-to"
                type="email"
                autoComplete="off"
                placeholder="accountant@example.com"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className={fieldClass}
              />
            </div>
          )}
          {info.needsConnection && !connected && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900">
              <span>{info.label} is not connected.</span>
              <button type="button" onClick={() => onConnect(destination)} className={secondaryButton}>
                Connect
              </button>
            </div>
          )}

          <fieldset>
            <legend className={labelClass}>How often</legend>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1" role="radiogroup">
              {FREQUENCIES.map((f) => (
                <label key={f} className="cursor-pointer">
                  <input
                    type="radio"
                    name="frequency"
                    value={f}
                    checked={frequency === f}
                    onChange={() => setFrequency(f)}
                    className="peer sr-only"
                  />
                  <span className="block rounded-md px-2 py-1.5 text-center text-xs font-medium text-slate-600 peer-checked:bg-white peer-checked:text-indigo-700 peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500">
                    {FREQUENCY_LABELS[f]}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            {frequency === "weekly" && (
              <div>
                <label htmlFor="sch-weekday" className={labelClass}>
                  Day
                </label>
                <select
                  id="sch-weekday"
                  value={weekday}
                  onChange={(e) => setWeekday(Number(e.target.value))}
                  className={fieldClass}
                >
                  {WEEKDAYS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {frequency === "monthly" && (
              <div>
                <label htmlFor="sch-dom" className={labelClass}>
                  Day of month
                </label>
                <select
                  id="sch-dom"
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(Number(e.target.value))}
                  className={fieldClass}
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label htmlFor="sch-hour" className={labelClass}>
                Time
              </label>
              <select
                id="sch-hour"
                value={hour}
                onChange={(e) => setHour(Number(e.target.value))}
                className={fieldClass}
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {formatHour(h)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700" aria-live="polite">
            {describeTiming(timing)}. First run {untilLabel(upcoming, now)} ({formatDateTime(upcoming.toISOString())}).
          </p>

          {error && (
            <p role="alert" className="text-xs text-red-600">
              {error}
            </p>
          )}
          <button type="submit" className={`${primaryButton} w-full`}>
            Create schedule
          </button>
        </form>

        <p className="mt-3 rounded-xl bg-indigo-50 p-3 text-xs leading-relaxed text-indigo-900">
          <span className="font-semibold">How this works here:</span> a web page cannot run while it is closed.
          Schedules run while Expense Tracker is open, and any run that came due while it was closed is made up the next
          time you open it (marked &ldquo;catch-up&rdquo; in History). Real background jobs would need a server.
        </p>
      </section>

      <section aria-labelledby="your-schedules" className="space-y-3 lg:col-span-3">
        <h2 id="your-schedules" className="text-sm font-semibold text-slate-900">
          Your schedules ({state.schedules.length})
        </h2>
        {state.schedules.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
            No automatic exports yet. Create one on the left, for example a monthly summary emailed on the 1st.
          </div>
        ) : (
          state.schedules.map((s) => (
            <ScheduleCard
              key={s.id}
              schedule={s}
              now={now}
              busy={activity !== null}
              onToggle={(enabled) => setScheduleEnabled(s.id, enabled)}
              onRun={() => void runScheduleNow(s.id)}
              onAway={() => pretendAway(s.id)}
              onRemove={() => removeSchedule(s.id)}
            />
          ))
        )}
      </section>
    </div>
  );
}

function ScheduleCard({
  schedule: s,
  now,
  busy,
  onToggle,
  onRun,
  onAway,
  onRemove,
}: {
  schedule: Schedule;
  now: Date;
  busy: boolean;
  onToggle: (enabled: boolean) => void;
  onRun: () => void;
  onAway: () => void;
  onRemove: () => void;
}) {
  const info = DESTINATIONS[s.destination];
  const next = nextRunOf(s);
  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-sm ${s.enabled ? "border-slate-200" : "border-slate-200 opacity-75"}`}
    >
      <div className="flex items-start gap-3">
        <ServiceBadge destination={s.destination} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-slate-900">{s.name}</h3>
          <p className="text-xs text-slate-600">
            {TEMPLATES[s.template].label} to {info.label}
            {info.kind === "email" && s.recipient ? ` (${s.recipient})` : ""}
          </p>
          <p className="mt-1 text-xs text-slate-500">{describeTiming(s)}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Toggle checked={s.enabled} onChange={onToggle} label={`${s.name}: ${s.enabled ? "pause" : "resume"}`} />
          {s.enabled ? <StatusPill tone="green">Active</StatusPill> : <StatusPill tone="slate">Paused</StatusPill>}
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-slate-500">Next run</dt>
        <dd className="text-slate-800">
          {s.enabled ? `${untilLabel(next, now)} (${formatDateTime(next.toISOString())})` : "Paused"}
        </dd>
        <dt className="text-slate-500">Last run</dt>
        <dd className="text-slate-800">{s.lastRunAt ? timeAgo(s.lastRunAt, now) : "Never"}</dd>
      </dl>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={onRun} disabled={busy} className={secondaryButton}>
          Run now
        </button>
        <button
          type="button"
          onClick={onAway}
          disabled={busy || !s.enabled}
          title="Demo: pretend the app was closed for a month, then watch the catch-up run"
          className={secondaryButton}
        >
          Simulate being away
        </button>
        <button type="button" onClick={onRemove} className="ml-auto text-xs font-medium text-red-600 hover:underline">
          Delete
        </button>
      </div>
    </article>
  );
}
