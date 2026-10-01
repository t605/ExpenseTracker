"use client";

import { useCallback, useRef, useState } from "react";
import { DEMO_ACCOUNT, DESTINATIONS } from "@/lib/cloud/catalog";
import type { DestinationId } from "@/lib/cloud/types";
import { Modal } from "../Modal";
import { useToast } from "../Toasts";
import { useCloud } from "./CloudProvider";
import { ServiceBadge, Spinner, primaryButton, secondaryButton } from "./ui";

const PERMISSIONS: Record<string, string[]> = {
  sheets: [
    "Create spreadsheets in your account",
    "Write rows into spreadsheets it created",
    "Nothing else: it cannot read your other files",
  ],
  storage: [
    "Create files in one folder",
    "Update files it created before",
    "Nothing else: it cannot read your other files",
  ],
};

/**
 * A pretend consent screen. There is no real sign-in: no password is asked for, nothing is requested
 * from any service, and the "account" is a fixed demo name.
 */
export function ConnectModal({ destination, onClose }: { destination: DestinationId; onClose: () => void }) {
  const { connect } = useCloud();
  const toast = useToast();
  const info = DESTINATIONS[destination];
  const [authorizing, setAuthorizing] = useState(false);
  const authorizingRef = useRef(false);

  // The dialog must not close in the middle of "authorizing".
  const guardedClose = useCallback(() => {
    if (!authorizingRef.current) onClose();
  }, [onClose]);

  function allow() {
    authorizingRef.current = true;
    setAuthorizing(true);
    window.setTimeout(() => {
      connect(destination);
      toast(`${info.label} connected (demo account)`);
      authorizingRef.current = false;
      onClose();
    }, 1300);
  }

  const permissions = PERMISSIONS[info.kind === "sheets" ? "sheets" : "storage"];

  return (
    <Modal title={`Connect ${info.label}`} onClose={guardedClose}>
      <div className="flex items-center gap-3">
        <ServiceBadge destination={destination} size="lg" />
        <p className="text-sm text-slate-700">
          <span className="font-semibold">Expense Tracker</span> would like access to your {info.label} account.
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 p-3">
        <p className="text-xs font-medium text-slate-500">Signing in as</p>
        <p className="text-sm font-medium text-slate-900">{DEMO_ACCOUNT}</p>
        <p className="text-xs text-slate-500">A demo account</p>
      </div>

      <ul className="mt-4 space-y-1.5 text-sm text-slate-700">
        {permissions.map((p) => (
          <li key={p} className="flex gap-2">
            <span className="text-emerald-600" aria-hidden="true">
              &#10003;
            </span>
            {p}
          </li>
        ))}
      </ul>

      <p className="mt-4 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
        Demo only: no password is needed and nothing is sent to {info.label}. Real integration needs a server and a
        registered app with {info.label}.
      </p>

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={guardedClose} disabled={authorizing} className={secondaryButton}>
          Cancel
        </button>
        <button type="button" onClick={allow} disabled={authorizing} className={primaryButton} aria-busy={authorizing}>
          {authorizing ? (
            <>
              <Spinner /> Authorizing...
            </>
          ) : (
            "Allow access"
          )}
        </button>
      </div>
    </Modal>
  );
}
