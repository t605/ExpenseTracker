"use client";

import { useState } from "react";
import { TEMPLATES, TEMPLATE_ORDER } from "@/lib/cloud/catalog";
import { EXPIRY_LABELS, isExpired, isLocalOrigin, type ExpiryChoice } from "@/lib/cloud/share";
import type { ShareRecord, TemplateId } from "@/lib/cloud/types";
import { formatDateTime } from "@/lib/cloud/util";
import { useExpenses } from "../ExpensesProvider";
import { useCloud } from "./CloudProvider";
import { QRCode } from "./QRCode";
import { CopyButton, Spinner, StatusPill, fieldClass, labelClass, primaryButton, secondaryButton } from "./ui";

const EXPIRIES: ExpiryChoice[] = ["1d", "7d", "30d", "never"];

interface Shown {
  url: string;
  record: ShareRecord;
}

export function SharesTab() {
  const { expenses } = useExpenses();
  const { state, createShare, revokeShare, removeShare } = useCloud();
  const [template, setTemplate] = useState<TemplateId>("category");
  const [expiry, setExpiry] = useState<ExpiryChoice>("7d");
  const [allowDownload, setAllowDownload] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [shown, setShown] = useState<Shown | null>(null);
  const now = new Date();

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError("");
    try {
      const result = await createShare({ template, expiry, allowDownload });
      setShown({ url: result.url, record: result.record });
    } catch (e) {
      setError(e instanceof Error ? e.message : "A link could not be created for this report.");
    } finally {
      setCreating(false);
    }
  }

  const local = typeof window !== "undefined" && isLocalOrigin(window.location.origin);

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <section aria-labelledby="new-share" className="space-y-4 lg:col-span-2">
        <form
          onSubmit={(e) => void create(e)}
          className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <h2 id="new-share" className="text-sm font-semibold text-slate-900">
            Create a share link
          </h2>
          <div>
            <label htmlFor="share-template" className={labelClass}>
              What to share
            </label>
            <select
              id="share-template"
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
          <fieldset>
            <legend className={labelClass}>Link expires after</legend>
            <div className="grid grid-cols-4 gap-1 rounded-lg bg-slate-100 p-1" role="radiogroup">
              {EXPIRIES.map((e) => (
                <label key={e} className="cursor-pointer">
                  <input
                    type="radio"
                    name="expiry"
                    value={e}
                    checked={expiry === e}
                    onChange={() => setExpiry(e)}
                    className="peer sr-only"
                  />
                  <span className="block rounded-md px-1 py-1.5 text-center text-xs font-medium text-slate-600 peer-checked:bg-white peer-checked:text-indigo-700 peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500">
                    {EXPIRY_LABELS[e]}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={allowDownload}
              onChange={(e) => setAllowDownload(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Let viewers download it as CSV
          </label>
          <button type="submit" disabled={creating || expenses.length === 0} className={`${primaryButton} w-full`}>
            {creating ? (
              <>
                <Spinner /> Creating link...
              </>
            ) : (
              "Create link"
            )}
          </button>
          {expenses.length === 0 && <p className="text-center text-xs text-slate-500">Add an expense first.</p>}
          {error && (
            <p role="alert" className="text-xs text-red-600">
              {error}
            </p>
          )}
        </form>

        <div className="rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
          <p className="font-semibold">Before you share</p>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            <li>
              The numbers travel inside the link itself. There is no server, so anyone who gets the link can read them.
            </li>
            <li>A link cannot be recalled once sent. &ldquo;Revoke&rdquo; only blocks it on this browser.</li>
            <li>The expiry is checked by the page that opens the link, so treat it as a courtesy, not as security.</li>
            {local && (
              <li className="font-medium">
                This app is running on this computer, so the link only opens here. It would work for others once the app
                is hosted somewhere.
              </li>
            )}
          </ul>
        </div>
      </section>

      <section aria-labelledby="share-results" className="space-y-4 lg:col-span-3">
        {shown && <ShareResult shown={shown} />}

        <h2 id="share-results" className="text-sm font-semibold text-slate-900">
          Your links ({state.shares.length})
        </h2>
        {state.shares.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
            No links yet. Create one to get a link and a QR code.
          </div>
        ) : (
          <ul className="space-y-2">
            {state.shares.map((s) => {
              const expired = isExpired(s.expiresAt, now);
              return (
                <li key={s.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{s.title}</p>
                    {s.revoked ? (
                      <StatusPill tone="red">Revoked</StatusPill>
                    ) : expired ? (
                      <StatusPill tone="amber">Expired</StatusPill>
                    ) : (
                      <StatusPill tone="green">Active</StatusPill>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Created {formatDateTime(s.createdAt)} &middot; {s.records} expense{s.records === 1 ? "" : "s"}{" "}
                    &middot; {s.expiresAt ? `expires ${formatDateTime(s.expiresAt)}` : "never expires"}
                    {s.allowDownload ? "" : " · view only"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {s.url ? (
                      <button
                        type="button"
                        onClick={() => setShown({ url: s.url, record: s })}
                        className={secondaryButton}
                      >
                        Show link and QR
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500">Link too large to keep</span>
                    )}
                    {!s.revoked && (
                      <button
                        type="button"
                        onClick={() => revokeShare(s.id)}
                        title="Blocks this link on this browser only"
                        className="text-xs font-medium text-amber-700 hover:underline"
                      >
                        Revoke (this browser)
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeShare(s.id)}
                      className="ml-auto text-xs font-medium text-red-600 hover:underline"
                    >
                      Remove from list
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function ShareResult({ shown }: { shown: Shown }) {
  const { url, record } = shown;
  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm" aria-label="Share link">
      <p className="text-sm font-semibold text-slate-900">{record.title}</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-[auto_1fr]">
        <QRCode text={url} />
        <div className="min-w-0 space-y-2">
          <label htmlFor="share-url" className={labelClass}>
            Link ({url.length.toLocaleString("en-US")} characters)
          </label>
          <input
            id="share-url"
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className={`${fieldClass} font-mono text-xs`}
          />
          <div className="flex flex-wrap gap-2">
            <CopyButton text={url} label="Copy link" />
            <a href={url} target="_blank" rel="noopener noreferrer" className={secondaryButton}>
              Open link
            </a>
          </div>
          <p className="text-xs text-slate-600">
            {record.expiresAt ? `Expires ${formatDateTime(record.expiresAt)}.` : "Never expires."}{" "}
            {record.allowDownload ? "Viewers can download the CSV." : "View only."}
          </p>
          <p className="text-xs text-slate-500">Scan the code with a phone camera to open the same view.</p>
        </div>
      </div>
    </div>
  );
}
