/**
 * Types for the simulated "cloud" export features. Nothing here talks to a real service: every
 * destination is a simulation, and all state lives in this browser's localStorage.
 */

export type TemplateId = "full" | "tax" | "monthly" | "category";

export type DestinationId = "download" | "email" | "sheets" | "gdrive" | "dropbox" | "onedrive";

export type Frequency = "daily" | "weekly" | "monthly";

/** "skipped" = a scheduled run that found nothing to export (so nothing was sent). */
export type HistoryStatus = "success" | "failed" | "skipped";

/** "schedule" = ran on time while the app was open; "catch-up" = ran when the app was opened late. */
export type Trigger = "manual" | "schedule" | "catch-up";

export interface Connection {
  destination: DestinationId;
  /** A fixed demo account name. No real sign-in ever happens. */
  account: string;
  connectedAt: string;
  folder: string;
}

export interface Schedule {
  id: string;
  name: string;
  template: TemplateId;
  destination: DestinationId;
  frequency: Frequency;
  /** 0-23, local time. */
  hour: number;
  /** 0 = Sunday ... 6 = Saturday. Used for weekly. */
  weekday: number;
  /** 1-28 (28 so every month has the day). Used for monthly. */
  dayOfMonth: number;
  /** Used when the destination is email. */
  recipient: string;
  enabled: boolean;
  createdAt: string;
  lastRunAt: string | null;
}

export interface HistoryEntry {
  id: string;
  at: string;
  template: TemplateId;
  destination: DestinationId;
  status: HistoryStatus;
  trigger: Trigger;
  records: number;
  bytes: number;
  filename: string;
  /** SHA-256 of the exported file, hex. Lets you check later that a file was not changed. */
  fingerprint: string;
  /** Short human text: recipient, folder, "saved to Downloads". */
  detail: string;
  error: string;
}

export interface ShareRecord {
  id: string;
  createdAt: string;
  expiresAt: string | null;
  template: TemplateId;
  title: string;
  records: number;
  allowDownload: boolean;
  /** Revoking only works in this browser: a link cannot be recalled without a server. */
  revoked: boolean;
  /** The full link (it contains the data after the #). Kept only when reasonably small. */
  url: string;
}

export interface CloudState {
  connections: Connection[];
  schedules: Schedule[];
  history: HistoryEntry[];
  shares: ShareRecord[];
}

export interface ExportRequest {
  template: TemplateId;
  destination: DestinationId;
  recipient: string;
  message: string;
  folder: string;
  sheetName: string;
  trigger: Trigger;
}
