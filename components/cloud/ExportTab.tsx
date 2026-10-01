"use client";

import { useMemo, useState } from "react";
import { DESTINATIONS, DESTINATION_ORDER, TEMPLATES, TEMPLATE_ORDER } from "@/lib/cloud/catalog";
import { dataHealth } from "@/lib/cloud/health";
import { buildReport } from "@/lib/cloud/templates";
import type { DestinationId, HistoryEntry, TemplateId } from "@/lib/cloud/types";
import { formatBytes, formatDateTime, isValidEmail } from "@/lib/cloud/util";
import { useExpenses } from "../ExpensesProvider";
import { useCurrency } from "../CurrencyProvider";
import { useCloud } from "./CloudProvider";
import { ReportTable } from "./ReportTable";
import { CopyButton, ServiceBadge, Spinner, StatusPill, fieldClass, labelClass, primaryButton, secondaryButton } from "./ui";

/** Pre-selects a template and destination (used by "Retry" in History). `nonce` makes each retry count. */
export interface ExportPreset {
  template: TemplateId;
  destination: DestinationId;
  nonce: number;
}

interface ExportTabProps {
  onConnect: (destination: DestinationId) => void;
  onGoTo: (tab: "share" | "history") => void;
  preset?: ExportPreset | null;
}

export function ExportTab({ onConnect, onGoTo, preset }: ExportTabProps) {
  const { expenses } = useExpenses();
  const { currency } = useCurrency();
  const { state, activity, runExport } = useCloud();

  const [template, setTemplate] = useState<TemplateId>(preset?.template ?? "full");
  const [destination, setDestination] = useState<DestinationId>(preset?.destination ?? "download");
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [folder, setFolder] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<HistoryEntry | null>(null);
  const now = useMemo(() => new Date(), []);

  const info = DESTINATIONS[destination];
  const connection = state.connections.find((c) => c.destination === destination);
  const report = useMemo(() => buildReport(template, expenses, { now, currency }), [template, expenses, now, currency]);
  const health = useMemo(() => dataHealth(expenses, now), [expenses, now]);

  const needsConnect = info.needsConnection && !connection;
  const emailBad = info.kind === "email" && !isValidEmail(recipient);
  const blocker = report.recordCount === 0
    ? "There is nothing to export for this template yet."
    : needsConnect
      ? `Connect ${info.label} to continue.`
      : emailBad
        ? "Enter the recipient's email address."
        : "";

  async function send() {
    if (blocker || running) return;
    setResult(null);
    setRunning(true);
    try {
      setResult(
        await runExport({
          template,
          destination,
          recipient,
          message,
          folder,
          sheetName,
          trigger: "manual",
        }),
      );
    } finally {
      setRunning(false);
    }
  }

  const actionLabel =
    info.kind === "local" ? "Download CSV" : info.kind === "email" ? "Send email" : info.kind === "sheets" ? "Create spreadsheet" : `Upload to ${info.label}`;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <fieldset disabled={running} className="min-w-0 space-y-6 lg:col-span-3">
        {/* 1. Template */}
        <section aria-labelledby="step-template">
          <h2 id="step-template" className="mb-2 text-sm font-semibold text-slate-900">
            <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs text-white">1</span>
            Choose a report
          </h2>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Report template">
            {TEMPLATE_ORDER.map((id) => (
              <label key={id} className="cursor-pointer">
                <input
                  type="radio"
                  name="template"
                  value={id}
                  checked={template === id}
                  onChange={() => {
                    setTemplate(id);
                    setResult(null);
                  }}
                  className="peer sr-only"
                />
                <span className="block h-full rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition peer-checked:border-indigo-600 peer-checked:bg-indigo-50/60 peer-checked:ring-1 peer-checked:ring-indigo-600 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500">
                  <span className="block text-sm font-semibold text-slate-900">{TEMPLATES[id].label}</span>
                  <span className="mt-0.5 block text-xs text-slate-600">{TEMPLATES[id].tagline}</span>
                  <span className="mt-1.5 block text-[11px] font-medium uppercase tracking-wide text-indigo-600">
                    For: {TEMPLATES[id].purpose}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* 2. Destination */}
        <section aria-labelledby="step-destination">
          <h2 id="step-destination" className="mb-2 text-sm font-semibold text-slate-900">
            <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs text-white">2</span>
            Choose where it goes
          </h2>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Destination">
            {DESTINATION_ORDER.map((id) => {
              const d = DESTINATIONS[id];
              const connected = state.connections.some((c) => c.destination === id);
              return (
                <label key={id} className="cursor-pointer">
                  <input
                    type="radio"
                    name="destination"
                    value={id}
                    checked={destination === id}
                    onChange={() => {
                      setDestination(id);
                      setResult(null);
                    }}
                    className="peer sr-only"
                  />
                  <span className="flex h-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition peer-checked:border-indigo-600 peer-checked:bg-indigo-50/60 peer-checked:ring-1 peer-checked:ring-indigo-600 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500">
                    <ServiceBadge destination={id} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900">{d.label}</span>
                      <span className="block truncate text-xs text-slate-500">{d.blurb}</span>
                    </span>
                    {d.needsConnection &&
                      (connected ? <StatusPill tone="green">Connected</StatusPill> : <StatusPill tone="slate">Not connected</StatusPill>)}
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        {/* 3. Details */}
        <section aria-labelledby="step-details">
          <h2 id="step-details" className="mb-2 text-sm font-semibold text-slate-900">
            <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs text-white">3</span>
            Details
          </h2>
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            {needsConnect && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                <span>{info.label} is not connected yet.</span>
                <button type="button" onClick={() => onConnect(destination)} className={primaryButton}>
                  Connect {info.label}
                </button>
              </div>
            )}
            {info.kind === "local" && (
              <p className="text-sm text-slate-600">
                A CSV file will be saved to your Downloads folder. Nothing is uploaded. This is the one real destination.
              </p>
            )}
            {info.kind === "email" && (
              <>
                <div>
                  <label htmlFor="to" className={labelClass}>
                    Send to
                  </label>
                  <input
                    id="to"
                    type="email"
                    autoComplete="off"
                    placeholder="accountant@example.com"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className={fieldClass}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Simulated: no email is sent. Try <code className="rounded bg-slate-100 px-1">bounce@fail.example</code> to see
                    a failed delivery.
                  </p>
                </div>
                <div>
                  <label htmlFor="note" className={labelClass}>
                    Message (optional)
                  </label>
                  <textarea
                    id="note"
                    rows={2}
                    maxLength={300}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Hi, here is my expense report for this year."
                    className={fieldClass}
                  />
                </div>
              </>
            )}
            {info.kind === "sheets" && (
              <div>
                <label htmlFor="sheet" className={labelClass}>
                  Spreadsheet name
                </label>
                <input
                  id="sheet"
                  type="text"
                  maxLength={80}
                  placeholder={report.title}
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  className={fieldClass}
                />
              </div>
            )}
            {info.kind === "storage" && (
              <div>
                <label htmlFor="folder" className={labelClass}>
                  Folder
                </label>
                <input
                  id="folder"
                  type="text"
                  maxLength={120}
                  placeholder={connection?.folder ?? info.defaultFolder}
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  className={fieldClass}
                />
                <p className="mt-1 text-xs text-slate-500">Leave empty to use the folder set for this connection.</p>
              </div>
            )}
          </div>
        </section>
      </fieldset>

      {/* Preview + action */}
      <aside className="space-y-4 lg:col-span-2" aria-label="Preview and send">
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-20">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Preview</p>
            <h2 className="text-lg font-semibold text-slate-900">{report.title}</h2>
            <p className="text-xs text-slate-600">
              {report.subtitle} &middot; {report.recordCount} expense{report.recordCount === 1 ? "" : "s"} &middot; {currency}
            </p>
          </div>

          {health.length > 0 && (
            <ul className="space-y-1.5" aria-label="Data check">
              {health.map((h) => (
                <li
                  key={h.id}
                  className={`rounded-lg px-3 py-2 text-xs ${h.level === "warn" ? "bg-amber-50 text-amber-900" : "bg-slate-50 text-slate-700"}`}
                >
                  <span className="font-semibold">{h.level === "warn" ? "Check: " : "Note: "}</span>
                  {h.message}
                </li>
              ))}
            </ul>
          )}
          {health.length === 0 && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              Data check passed: no duplicates, future dates or odd amounts found.
            </p>
          )}

          {report.recordCount > 0 ? (
            <ReportTable columns={report.columns} rows={report.rows} footer={report.footer} limit={6} caption={`${report.title} preview`} />
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">No rows to show.</p>
          )}

          {running && activity ? (
            <ol className="space-y-1.5 rounded-xl bg-slate-50 p-3 text-sm" aria-label="Progress">
              {activity.steps.map((label, i) => (
                <li key={label} className={`flex items-center gap-2 ${i > activity.index ? "text-slate-400" : "text-slate-800"}`}>
                  {i < activity.index ? (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white" aria-label="done">
                      &#10003;
                    </span>
                  ) : i === activity.index ? (
                    <Spinner className="h-4 w-4 text-indigo-600" />
                  ) : (
                    <span className="h-4 w-4 rounded-full border border-slate-300" aria-hidden="true" />
                  )}
                  {label}
                </li>
              ))}
            </ol>
          ) : (
            <div>
              <button type="button" onClick={() => void send()} disabled={Boolean(blocker) || running} className={`${primaryButton} w-full`}>
                {running ? (
                  <>
                    <Spinner /> Working...
                  </>
                ) : (
                  actionLabel
                )}
              </button>
              {blocker && <p className="mt-1.5 text-center text-xs text-slate-500">{blocker}</p>}
            </div>
          )}
        </div>

        {result && <ResultCard entry={result} onAgain={() => setResult(null)} onGoTo={onGoTo} />}
      </aside>
    </div>
  );
}

function ResultCard({ entry, onAgain, onGoTo }: { entry: HistoryEntry; onAgain: () => void; onGoTo: ExportTabProps["onGoTo"] }) {
  const ok = entry.status === "success";
  const info = DESTINATIONS[entry.destination];
  return (
    <div
      role="status"
      className={`rounded-2xl border p-4 shadow-sm ${ok ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}
    >
      <p className={`text-sm font-semibold ${ok ? "text-emerald-900" : "text-red-900"}`}>
        {ok ? (info.kind === "local" ? "File saved" : `Done: ${info.label} (simulated)`) : "Export failed"}
      </p>
      {ok ? (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-emerald-900">
          <dt className="text-emerald-700">Where</dt>
          <dd className="break-all">{entry.detail}</dd>
          <dt className="text-emerald-700">File</dt>
          <dd className="break-all">
            {entry.filename} ({formatBytes(entry.bytes)}, {entry.records} expense{entry.records === 1 ? "" : "s"})
          </dd>
          <dt className="text-emerald-700">When</dt>
          <dd>{formatDateTime(entry.at)}</dd>
          <dt className="text-emerald-700">Fingerprint</dt>
          <dd className="flex flex-wrap items-center gap-2">
            <code className="rounded bg-white/70 px-1">{entry.fingerprint.slice(0, 12)}</code>
            <CopyButton text={entry.fingerprint} label="Copy SHA-256" className="rounded-md px-2 py-0.5 text-xs font-medium text-emerald-800 underline" />
          </dd>
        </dl>
      ) : (
        <p className="mt-1 text-sm text-red-800">{entry.error}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {ok && (
          <button type="button" onClick={() => onGoTo("share")} className={secondaryButton}>
            Create a share link
          </button>
        )}
        <button type="button" onClick={() => onGoTo("history")} className={secondaryButton}>
          See in history
        </button>
        <button type="button" onClick={onAgain} className={secondaryButton}>
          {ok ? "Export another" : "Dismiss"}
        </button>
      </div>
    </div>
  );
}
