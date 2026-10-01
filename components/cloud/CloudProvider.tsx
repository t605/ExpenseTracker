"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { downloadCSV } from "@/lib/csv";
import { newId } from "@/lib/storage";
import { DEMO_ACCOUNT, DESTINATIONS, SCHEDULE_DESTINATIONS } from "@/lib/cloud/catalog";
import { isDue, nextRunOf } from "@/lib/cloud/schedule";
import { createSerialQueue } from "@/lib/cloud/queue";
import { buildReport, reportToCSV } from "@/lib/cloud/templates";
import { deliveryFailure, deliverySteps, simulateDelivery } from "@/lib/cloud/simulate";
import {
  buildShareUrl,
  checkShareable,
  createSharePayload,
  decodeShare,
  encodeShare,
  expiryFrom,
  type ExpiryChoice,
} from "@/lib/cloud/share";
import {
  CLOUD_STORAGE_KEY,
  EMPTY_CLOUD_STATE,
  MAX_HISTORY,
  MAX_SHARES,
  MAX_STORED_URL,
  sanitizeCloudState,
  skippedEntry,
} from "@/lib/cloud/state";
import { byteLength, isValidEmail, sha256Hex } from "@/lib/cloud/util";
import type {
  CloudState,
  DestinationId,
  ExportRequest,
  HistoryEntry,
  Schedule,
  ShareRecord,
  TemplateId,
  Trigger,
} from "@/lib/cloud/types";
import { useExpenses } from "../ExpensesProvider";
import { useCurrency } from "../CurrencyProvider";
import { useToast } from "../Toasts";

/** What is happening right now (shown in the sync bar and in the export flow). */
export interface Activity {
  title: string;
  steps: string[];
  index: number;
  trigger: Trigger;
}

export type ScheduleDraft = Pick<
  Schedule,
  "name" | "template" | "destination" | "frequency" | "hour" | "weekday" | "dayOfMonth" | "recipient"
>;

export interface ShareResult {
  record: ShareRecord;
  url: string;
}

interface CloudValue {
  /** False until localStorage has been read in the browser. */
  loaded: boolean;
  storageError: string | null;
  state: CloudState;
  activity: Activity | null;
  connect: (destination: DestinationId) => void;
  disconnect: (destination: DestinationId) => void;
  setFolder: (destination: DestinationId, folder: string) => void;
  addSchedule: (draft: ScheduleDraft) => string | null;
  setScheduleEnabled: (id: string, enabled: boolean) => void;
  removeSchedule: (id: string) => void;
  /** Demo helper: pretend the app was closed for a month, so the next check runs a catch-up. */
  pretendAway: (id: string) => void;
  runScheduleNow: (id: string) => Promise<void>;
  runExport: (request: ExportRequest) => Promise<HistoryEntry>;
  clearHistory: () => void;
  createShare: (opts: { template: TemplateId; expiry: ExpiryChoice; allowDownload: boolean }) => Promise<ShareResult>;
  revokeShare: (id: string) => void;
  removeShare: (id: string) => void;
}

const CloudContext = createContext<CloudValue | null>(null);

const CHECK_EVERY_MS = 30_000;
/** A scheduled run later than this counts as a catch-up ("ran when you opened the app"). */
const LATE_AFTER_MS = 5 * 60_000;

export function CloudProvider({ children }: { children: React.ReactNode }) {
  const { expenses, loaded: expensesLoaded } = useExpenses();
  const { currency } = useCurrency();
  const toast = useToast();

  const [state, setState] = useState<CloudState>(EMPTY_CLOUD_STATE);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);

  // Latest values for code that runs later (timers, awaited steps) without re-creating callbacks.
  const stateRef = useRef(state);
  const expensesRef = useRef(expenses);
  const currencyRef = useRef(currency);
  const readOk = useRef(false);
  // Every export goes through this queue, so two exports can never overlap (manual or scheduled).
  const queueRef = useRef(createSerialQueue());
  const checkingRef = useRef(false);
  const checkNowRef = useRef<() => void>(() => {});
  useEffect(() => {
    stateRef.current = state;
    expensesRef.current = expenses;
    currencyRef.current = currency;
  });

  // Read after mount; never write back before a successful read (it could wipe saved data).
  useEffect(() => {
    try {
      const text = window.localStorage.getItem(CLOUD_STORAGE_KEY);
      if (text) setState(sanitizeCloudState(JSON.parse(text)));
      readOk.current = true;
    } catch {
      setStorageError("Your saved cloud settings could not be read, so changes will not be saved.");
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded || !readOk.current) return;
    try {
      window.localStorage.setItem(CLOUD_STORAGE_KEY, JSON.stringify(state));
      setStorageError(null);
    } catch {
      setStorageError("Could not save cloud settings in this browser (storage may be full or blocked).");
    }
  }, [state, loaded]);

  /* ---------- connections ---------- */

  const connect = useCallback((destination: DestinationId) => {
    setState((s) => ({
      ...s,
      connections: [
        ...s.connections.filter((c) => c.destination !== destination),
        {
          destination,
          account: DEMO_ACCOUNT,
          connectedAt: new Date().toISOString(),
          folder: DESTINATIONS[destination].defaultFolder,
        },
      ],
    }));
  }, []);

  const disconnect = useCallback((destination: DestinationId) => {
    setState((s) => ({
      ...s,
      connections: s.connections.filter((c) => c.destination !== destination),
      // A schedule cannot deliver to a service that is no longer connected.
      schedules: s.schedules.map((x) => (x.destination === destination ? { ...x, enabled: false } : x)),
    }));
  }, []);

  const setFolder = useCallback((destination: DestinationId, folder: string) => {
    setState((s) => ({
      ...s,
      connections: s.connections.map((c) =>
        c.destination === destination ? { ...c, folder: folder.slice(0, 120) } : c,
      ),
    }));
  }, []);

  /* ---------- exporting ---------- */

  const doExport = useCallback(async (request: ExportRequest): Promise<HistoryEntry> => {
    const now = new Date();
    const report = buildReport(request.template, expensesRef.current, { now, currency: currencyRef.current });
    const csv = reportToCSV(report);
    const filename = `${report.fileBase}.csv`;
    const info = DESTINATIONS[request.destination];
    const fingerprint = await sha256Hex(csv);

    let status: HistoryEntry["status"] = "success";
    let detail = "";
    let error = "";
    try {
      if (info.kind === "local") {
        downloadCSV(filename, csv);
        detail = "Saved to your Downloads folder";
      } else {
        const connection = info.needsConnection
          ? stateRef.current.connections.find((c) => c.destination === request.destination)
          : undefined;
        if (info.needsConnection && !connection) throw new Error(`${info.label} is not connected.`);
        const recipient = request.recipient.trim();
        if (info.kind === "email" && !isValidEmail(recipient))
          throw new Error("That email address does not look right.");
        const folder = request.folder.trim() || connection?.folder || info.defaultFolder;
        const sheetName = request.sheetName.trim() || report.title;
        detail =
          info.kind === "email"
            ? `To ${recipient}${request.message.trim() ? " with a note" : ""}`
            : info.kind === "sheets"
              ? `Spreadsheet "${sheetName}"`
              : `${folder.replace(/\/+$/, "")}/${filename}`;
        const steps = deliverySteps(request.destination, {
          recipient,
          folder,
          sheetName,
          records: report.recordCount,
          filename,
        });
        setActivity({
          title: `${report.title} to ${info.label}`,
          steps: steps.map((step) => step.label),
          index: 0,
          trigger: request.trigger,
        });
        await simulateDelivery(steps, deliveryFailure(request.destination, recipient), (index) =>
          setActivity((a) => (a ? { ...a, index } : a)),
        );
      }
    } catch (e) {
      status = "failed";
      error = e instanceof Error ? e.message : "Something went wrong.";
    } finally {
      setActivity(null);
    }

    const entry: HistoryEntry = {
      id: newId(),
      at: now.toISOString(),
      template: request.template,
      destination: request.destination,
      status,
      trigger: request.trigger,
      records: report.recordCount,
      bytes: byteLength(csv),
      filename,
      fingerprint,
      detail,
      error,
    };
    setState((s) => ({ ...s, history: [entry, ...s.history].slice(0, MAX_HISTORY) }));
    return entry;
  }, []);

  const runExport = useCallback((request: ExportRequest) => queueRef.current.run(() => doExport(request)), [doExport]);

  const clearHistory = useCallback(() => setState((s) => ({ ...s, history: [] })), []);

  /* ---------- schedules ---------- */

  const addSchedule = useCallback((draft: ScheduleDraft): string | null => {
    const name = draft.name.trim();
    if (!name) return "Give the schedule a name.";
    if (name.length > 40) return "Keep the name under 40 characters.";
    if (!SCHEDULE_DESTINATIONS.includes(draft.destination)) return "Pick where the export should go.";
    const info = DESTINATIONS[draft.destination];
    if (info.kind === "email" && !isValidEmail(draft.recipient)) return "Enter a valid email address.";
    if (info.needsConnection && !stateRef.current.connections.some((c) => c.destination === draft.destination)) {
      return `Connect ${info.label} first (Connections tab).`;
    }
    if (stateRef.current.schedules.length >= 20) return "You can keep up to 20 schedules.";
    const schedule: Schedule = {
      ...draft,
      name,
      recipient: draft.recipient.trim(),
      id: newId(),
      enabled: true,
      createdAt: new Date().toISOString(),
      lastRunAt: null,
    };
    setState((s) => ({ ...s, schedules: [schedule, ...s.schedules] }));
    return null;
  }, []);

  const setScheduleEnabled = useCallback((id: string, enabled: boolean) => {
    setState((s) => ({
      ...s,
      // Resuming starts counting from now, so a long pause does not trigger a burst of old runs.
      schedules: s.schedules.map((x) =>
        x.id === id ? { ...x, enabled, lastRunAt: enabled ? new Date().toISOString() : x.lastRunAt } : x,
      ),
    }));
  }, []);

  const removeSchedule = useCallback((id: string) => {
    setState((s) => ({ ...s, schedules: s.schedules.filter((x) => x.id !== id) }));
  }, []);

  const runSchedule = useCallback(
    async (schedule: Schedule, trigger: Trigger) => {
      const now = new Date();
      let entry: HistoryEntry;
      const empty =
        buildReport(schedule.template, expensesRef.current, { now, currency: currencyRef.current }).recordCount === 0;
      if (empty) {
        // Nothing to send: say so in History instead of "delivering" an empty report.
        entry = skippedEntry(schedule, trigger, now, newId());
        setState((s) => ({ ...s, history: [entry, ...s.history].slice(0, MAX_HISTORY) }));
      } else {
        const connection = stateRef.current.connections.find((c) => c.destination === schedule.destination);
        entry = await runExport({
          template: schedule.template,
          destination: schedule.destination,
          recipient: schedule.recipient,
          message: "",
          folder: connection?.folder ?? "",
          sheetName: "",
          trigger,
        });
      }
      // Whatever the outcome, the next attempt is the next scheduled time: a failed run is NOT retried
      // automatically (use "Run now" or Retry in History).
      setState((s) => ({
        ...s,
        schedules: s.schedules.map((x) => (x.id === schedule.id ? { ...x, lastRunAt: new Date().toISOString() } : x)),
      }));
      return entry;
    },
    [runExport],
  );

  const runScheduleNow = useCallback(
    async (id: string) => {
      const schedule = stateRef.current.schedules.find((x) => x.id === id);
      if (!schedule || queueRef.current.pending() > 0) return;
      const entry = await runSchedule(schedule, "manual");
      if (entry.status === "success") toast(`${schedule.name}: done`);
      else if (entry.status === "skipped") toast(`${schedule.name}: no expenses to export, nothing sent`);
      else toast(`${schedule.name}: failed`, "error");
    },
    [runSchedule, toast],
  );

  const pretendAway = useCallback((id: string) => {
    const monthAgo = new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString();
    setState((s) => ({ ...s, schedules: s.schedules.map((x) => (x.id === id ? { ...x, lastRunAt: monthAgo } : x)) }));
    window.setTimeout(() => checkNowRef.current(), 150);
  }, []);

  // Runs due schedules: when the app opens (catch-up) and every 30 s while it stays open.
  useEffect(() => {
    if (!loaded || !expensesLoaded || !readOk.current) return;

    async function check() {
      if (checkingRef.current || queueRef.current.pending() > 0) return;
      checkingRef.current = true;
      try {
        const now = new Date();
        const due = stateRef.current.schedules.filter((s) => isDue(s, now));
        let onTime = 0;
        let late = 0;
        for (const queued of due) {
          // A run takes seconds: the schedule may have been paused, deleted or fixed since the list was made.
          const schedule = stateRef.current.schedules.find((s) => s.id === queued.id);
          if (!schedule || !isDue(schedule, new Date())) continue;
          const lateBy = now.getTime() - nextRunOf(schedule).getTime();
          const trigger: Trigger = lateBy > LATE_AFTER_MS ? "catch-up" : "schedule";
          await runSchedule(schedule, trigger);
          if (trigger === "catch-up") late += 1;
          else onTime += 1;
        }
        if (late > 0)
          toast(`Caught up on ${late} scheduled export${late === 1 ? "" : "s"} that came due while the app was closed`);
        else if (onTime > 0) toast(`Ran ${onTime} scheduled export${onTime === 1 ? "" : "s"}`);
      } finally {
        checkingRef.current = false;
      }
    }

    checkNowRef.current = () => void check();
    void check();
    const timer = window.setInterval(() => void check(), CHECK_EVERY_MS);
    return () => window.clearInterval(timer);
  }, [loaded, expensesLoaded, runSchedule, toast]);

  /* ---------- sharing ---------- */

  const createShare = useCallback(
    async (opts: { template: TemplateId; expiry: ExpiryChoice; allowDownload: boolean }): Promise<ShareResult> => {
      const now = new Date();
      const report = buildReport(opts.template, expensesRef.current, { now, currency: currencyRef.current });
      const id = newId().replace(/-/g, "").slice(0, 8);
      const expiresAt = expiryFrom(opts.expiry, now);
      const payload = createSharePayload(report, {
        id,
        now,
        expiresAt,
        allowDownload: opts.allowDownload,
        currency: currencyRef.current,
      });
      // Same limits as the page that opens the link, checked BEFORE a link is made.
      const check = checkShareable(payload);
      if (!check.ok) throw new Error(check.message);
      const encoded = await encodeShare(payload);
      if (!(await decodeShare(encoded)).ok) throw new Error("The link could not be verified. Try a smaller report.");
      const url = buildShareUrl(window.location.origin, encoded, process.env.NEXT_PUBLIC_BASE_PATH ?? "");
      const record: ShareRecord = {
        id,
        createdAt: now.toISOString(),
        expiresAt,
        template: opts.template,
        title: report.title,
        records: report.recordCount,
        allowDownload: opts.allowDownload,
        revoked: false,
        url: url.length <= MAX_STORED_URL ? url : "",
      };
      setState((s) => ({ ...s, shares: [record, ...s.shares].slice(0, MAX_SHARES) }));
      return { record, url };
    },
    [],
  );

  const revokeShare = useCallback((id: string) => {
    setState((s) => ({ ...s, shares: s.shares.map((x) => (x.id === id ? { ...x, revoked: true } : x)) }));
  }, []);

  const removeShare = useCallback((id: string) => {
    setState((s) => ({ ...s, shares: s.shares.filter((x) => x.id !== id) }));
  }, []);

  const value = useMemo<CloudValue>(
    () => ({
      loaded,
      storageError,
      state,
      activity,
      connect,
      disconnect,
      setFolder,
      addSchedule,
      setScheduleEnabled,
      removeSchedule,
      pretendAway,
      runScheduleNow,
      runExport,
      clearHistory,
      createShare,
      revokeShare,
      removeShare,
    }),
    [
      loaded,
      storageError,
      state,
      activity,
      connect,
      disconnect,
      setFolder,
      addSchedule,
      setScheduleEnabled,
      removeSchedule,
      pretendAway,
      runScheduleNow,
      runExport,
      clearHistory,
      createShare,
      revokeShare,
      removeShare,
    ],
  );

  return <CloudContext.Provider value={value}>{children}</CloudContext.Provider>;
}

export function useCloud(): CloudValue {
  const ctx = useContext(CloudContext);
  if (!ctx) throw new Error("useCloud must be used inside <CloudProvider>");
  return ctx;
}
