import type { DestinationId, Frequency, TemplateId } from "./types";

export const TEMPLATE_ORDER: TemplateId[] = ["full", "tax", "monthly", "category"];

export const TEMPLATES: Record<TemplateId, { label: string; tagline: string; purpose: string }> = {
  full: {
    label: "Full data",
    tagline: "Every expense, one row each",
    purpose: "Backups, spreadsheets, your own analysis",
  },
  tax: {
    label: "Tax report",
    tagline: "One tax year, grouped by category with subtotals",
    purpose: "Handing to your accountant",
  },
  monthly: {
    label: "Monthly summary",
    tagline: "Totals, averages and the biggest expense per month",
    purpose: "Budget reviews",
  },
  category: {
    label: "Category analysis",
    tagline: "Where the money goes: share, average and range",
    purpose: "Finding what to cut",
  },
};

export type DestinationKind = "local" | "email" | "sheets" | "storage";

export interface DestinationInfo {
  id: DestinationId;
  label: string;
  kind: DestinationKind;
  blurb: string;
  /** Badge colour (Tailwind classes, written out in full so Tailwind finds them). */
  badge: string;
  initial: string;
  /** Needs a (simulated) connection before it can be used. */
  needsConnection: boolean;
  defaultFolder: string;
}

export const DESTINATION_ORDER: DestinationId[] = ["download", "email", "sheets", "gdrive", "dropbox", "onedrive"];

export const DESTINATIONS: Record<DestinationId, DestinationInfo> = {
  download: {
    id: "download",
    label: "This device",
    kind: "local",
    blurb: "Saves a CSV file to your Downloads folder. This one is real.",
    badge: "bg-slate-700 text-white",
    initial: "↓",
    needsConnection: false,
    defaultFolder: "",
  },
  email: {
    id: "email",
    label: "Email",
    kind: "email",
    blurb: "Sends the report as an attachment (simulated).",
    badge: "bg-rose-500 text-white",
    initial: "@",
    needsConnection: false,
    defaultFolder: "",
  },
  sheets: {
    id: "sheets",
    label: "Google Sheets",
    kind: "sheets",
    blurb: "Creates a spreadsheet with the rows (simulated).",
    badge: "bg-emerald-600 text-white",
    initial: "S",
    needsConnection: true,
    defaultFolder: "My Drive",
  },
  gdrive: {
    id: "gdrive",
    label: "Google Drive",
    kind: "storage",
    blurb: "Uploads the CSV file to a folder (simulated).",
    badge: "bg-amber-500 text-white",
    initial: "G",
    needsConnection: true,
    defaultFolder: "/Expense Tracker",
  },
  dropbox: {
    id: "dropbox",
    label: "Dropbox",
    kind: "storage",
    blurb: "Uploads the CSV file to a folder (simulated).",
    badge: "bg-blue-600 text-white",
    initial: "D",
    needsConnection: true,
    defaultFolder: "/Apps/Expense Tracker",
  },
  onedrive: {
    id: "onedrive",
    label: "OneDrive",
    kind: "storage",
    blurb: "Uploads the CSV file to a folder (simulated).",
    badge: "bg-sky-600 text-white",
    initial: "O",
    needsConnection: true,
    defaultFolder: "/Documents/Expenses",
  },
};

/** Schedules need somewhere to deliver without a click, so a plain download is not offered. */
export const SCHEDULE_DESTINATIONS: DestinationId[] = DESTINATION_ORDER.filter((d) => d !== "download");

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily: "Every day",
  weekly: "Every week",
  monthly: "Every month",
};

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Fixed demo account shown after the simulated sign-in. */
export const DEMO_ACCOUNT = "demo.user@example.com";
