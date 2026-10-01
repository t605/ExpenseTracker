import { DESTINATIONS, TEMPLATES } from "./catalog";
import type {
  CloudState,
  Connection,
  DestinationId,
  Frequency,
  HistoryEntry,
  Schedule,
  ShareRecord,
  TemplateId,
  Trigger,
} from "./types";

export const CLOUD_STORAGE_KEY = "expense-tracker:cloud:v1";

export const EMPTY_CLOUD_STATE: CloudState = { connections: [], schedules: [], history: [], shares: [] };

export const MAX_HISTORY = 100;
export const MAX_SHARES = 10;
/** Share links carry data, so only reasonably small ones are kept in storage. */
export const MAX_STORED_URL = 20_000;

// Own keys only: `"constructor" in obj` is true for every object, so `in` would accept junk names.
const hasOwn = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key);
const isTemplate = (v: unknown): v is TemplateId => typeof v === "string" && hasOwn(TEMPLATES, v);
const isDestination = (v: unknown): v is DestinationId => typeof v === "string" && hasOwn(DESTINATIONS, v);
const isFrequency = (v: unknown): v is Frequency => v === "daily" || v === "weekly" || v === "monthly";
const isTrigger = (v: unknown): v is Trigger => v === "manual" || v === "schedule" || v === "catch-up";
const isIso = (v: unknown): v is string => typeof v === "string" && !Number.isNaN(new Date(v).getTime());
const str = (v: unknown, max = 200): string => (typeof v === "string" ? v.slice(0, max) : "");
const int = (v: unknown, min: number, max: number): number | null =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : null;

function toConnection(raw: unknown): Connection | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isDestination(r.destination) || !DESTINATIONS[r.destination].needsConnection || !isIso(r.connectedAt))
    return null;
  return {
    destination: r.destination,
    account: str(r.account, 100),
    connectedAt: r.connectedAt,
    folder: str(r.folder, 120),
  };
}

function toSchedule(raw: unknown): Schedule | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const hour = int(r.hour, 0, 23);
  const weekday = int(r.weekday, 0, 6);
  const dayOfMonth = int(r.dayOfMonth, 1, 28);
  if (
    typeof r.id !== "string" ||
    !isTemplate(r.template) ||
    !isDestination(r.destination) ||
    r.destination === "download" ||
    !isFrequency(r.frequency) ||
    hour === null ||
    weekday === null ||
    dayOfMonth === null ||
    !isIso(r.createdAt) ||
    (r.lastRunAt !== null && !isIso(r.lastRunAt))
  ) {
    return null;
  }
  return {
    id: r.id,
    name: str(r.name, 40) || "Scheduled export",
    template: r.template,
    destination: r.destination,
    frequency: r.frequency,
    hour,
    weekday,
    dayOfMonth,
    recipient: str(r.recipient, 120),
    enabled: r.enabled === true,
    createdAt: r.createdAt,
    lastRunAt: r.lastRunAt as string | null,
  };
}

function toHistory(raw: unknown): HistoryEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (
    typeof r.id !== "string" ||
    !isIso(r.at) ||
    !isTemplate(r.template) ||
    !isDestination(r.destination) ||
    (r.status !== "success" && r.status !== "failed" && r.status !== "skipped") ||
    !isTrigger(r.trigger)
  ) {
    return null;
  }
  return {
    id: r.id,
    at: r.at,
    template: r.template,
    destination: r.destination,
    status: r.status,
    trigger: r.trigger,
    records: int(r.records, 0, 10_000_000) ?? 0,
    bytes: int(r.bytes, 0, 2_000_000_000) ?? 0,
    filename: str(r.filename, 120),
    fingerprint: /^[0-9a-f]{64}$/.test(str(r.fingerprint, 64)) ? str(r.fingerprint, 64) : "",
    detail: str(r.detail, 200),
    error: str(r.error, 200),
  };
}

function toShare(raw: unknown): ShareRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || !isIso(r.createdAt) || !isTemplate(r.template)) return null;
  if (r.expiresAt !== null && !isIso(r.expiresAt)) return null;
  return {
    id: r.id,
    createdAt: r.createdAt,
    expiresAt: r.expiresAt as string | null,
    template: r.template,
    title: str(r.title, 100),
    records: int(r.records, 0, 10_000_000) ?? 0,
    allowDownload: r.allowDownload === true,
    revoked: r.revoked === true,
    url: safeShareUrl(r.url),
  };
}

/** Only an http(s) link of a sane length is kept. Anything else (javascript:, cut-off, huge) becomes "". */
export function safeShareUrl(value: unknown): string {
  return typeof value === "string" && value.length <= MAX_STORED_URL && /^https?:\/\//i.test(value) ? value : "";
}

/** The history entry for a scheduled run that had nothing to export. Nothing is sent. */
export function skippedEntry(schedule: Schedule, trigger: Trigger, now: Date, id: string): HistoryEntry {
  return {
    id,
    at: now.toISOString(),
    template: schedule.template,
    destination: schedule.destination,
    status: "skipped",
    trigger,
    records: 0,
    bytes: 0,
    filename: "",
    fingerprint: "",
    detail: "No expenses to export, nothing was sent",
    error: "",
  };
}

function list<T>(raw: unknown, convert: (item: unknown) => T | null, max: number): T[] {
  if (!Array.isArray(raw)) return [];
  const out: T[] = [];
  for (const item of raw) {
    const value = convert(item);
    if (value) out.push(value);
    if (out.length >= max) break;
  }
  return out;
}

/** Keeps only well-formed records, so one damaged entry cannot break the app. */
export function sanitizeCloudState(raw: unknown): CloudState {
  if (!raw || typeof raw !== "object") return EMPTY_CLOUD_STATE;
  const r = raw as Record<string, unknown>;
  const connections = list(r.connections, toConnection, 10);
  return {
    // One connection per destination.
    connections: connections.filter((c, i) => connections.findIndex((o) => o.destination === c.destination) === i),
    schedules: list(r.schedules, toSchedule, 20),
    history: list(r.history, toHistory, MAX_HISTORY),
    shares: list(r.shares, toShare, MAX_SHARES),
  };
}
