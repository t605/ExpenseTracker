import { isCurrency, type Currency } from "../currency";
import type { Report } from "./templates";

/**
 * Share links work WITHOUT a server: the report is compressed into the part of the link after "#"
 * (the "fragment"), which browsers never send over the network. The /shared page decodes it. Because
 * of that, a link cannot be recalled once sent, and anyone who has the link can read the data.
 */
export interface SharePayload {
  v: 1;
  id: string;
  created: string;
  /** ISO time after which the viewer refuses to show the data, or null for never. */
  exp: string | null;
  title: string;
  subtitle: string;
  currency: Currency;
  /** Whether the viewer offers a CSV download. */
  dl: boolean;
  fileBase: string;
  columns: string[];
  rows: string[][];
  footer: string[] | null;
}

export type ExpiryChoice = "1d" | "7d" | "30d" | "never";

export const EXPIRY_LABELS: Record<ExpiryChoice, string> = {
  "1d": "1 day",
  "7d": "7 days",
  "30d": "30 days",
  never: "Never",
};

export function expiryFrom(choice: ExpiryChoice, now: Date): string | null {
  if (choice === "never") return null;
  const days = choice === "1d" ? 1 : choice === "7d" ? 7 : 30;
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function isExpired(exp: string | null, now: Date): boolean {
  return exp !== null && new Date(exp).getTime() <= now.getTime();
}

export function createSharePayload(
  report: Report,
  opts: { id: string; now: Date; expiresAt: string | null; allowDownload: boolean; currency: Currency },
): SharePayload {
  return {
    v: 1,
    id: opts.id,
    created: opts.now.toISOString(),
    exp: opts.expiresAt,
    title: report.title,
    subtitle: report.subtitle,
    currency: opts.currency,
    dl: opts.allowDownload,
    fileBase: report.fileBase,
    columns: report.columns,
    rows: report.rows,
    footer: report.footer,
  };
}

/* ---------- limits (a link comes from outside, so it is never trusted) ---------- */

const MAX_DECODED_BYTES = 1_000_000;
const MAX_ROWS = 5000;
const MAX_COLUMNS = 12;
const MAX_CELL = 400;

const isStringArray = (value: unknown, length?: number): value is string[] =>
  Array.isArray(value) &&
  (length === undefined || value.length === length) &&
  value.every((cell) => typeof cell === "string" && cell.length <= MAX_CELL);

/** Returns the payload if it is well-formed and within limits, otherwise null. */
export function validatePayload(raw: unknown): SharePayload | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  if (p.v !== 1 || typeof p.id !== "string" || typeof p.created !== "string") return null;
  if (typeof p.title !== "string" || p.title.length > 100 || typeof p.subtitle !== "string" || p.subtitle.length > 200)
    return null;
  if (typeof p.fileBase !== "string" || p.fileBase.length > 100) return null;
  if (p.exp !== null && (typeof p.exp !== "string" || Number.isNaN(new Date(p.exp).getTime()))) return null;
  if (!isCurrency(p.currency) || typeof p.dl !== "boolean") return null;
  if (!isStringArray(p.columns) || p.columns.length < 1 || p.columns.length > MAX_COLUMNS) return null;
  const width = p.columns.length;
  if (!Array.isArray(p.rows) || p.rows.length > MAX_ROWS || !p.rows.every((row) => isStringArray(row, width)))
    return null;
  if (p.footer !== null && !isStringArray(p.footer, width)) return null;
  return {
    v: 1,
    id: p.id,
    created: p.created,
    exp: p.exp as string | null,
    title: p.title,
    subtitle: p.subtitle,
    currency: p.currency,
    dl: p.dl,
    fileBase: p.fileBase.replace(/[^\w.-]+/g, "-").replace(/^[.-]+/, "") || "export",
    columns: p.columns,
    rows: p.rows as string[][],
    footer: p.footer as string[] | null,
  };
}

export type ShareCheck = { ok: true } | { ok: false; message: string };

/**
 * Checks a payload against the SAME limits the viewer applies, before a link is made. Without this a
 * link could be created that the viewer then refuses with a misleading "damaged" message.
 */
export function checkShareable(payload: SharePayload): ShareCheck {
  if (payload.rows.length > MAX_ROWS) {
    return {
      ok: false,
      message: `This report has ${payload.rows.length} rows and a link can hold at most ${MAX_ROWS}. Share a summary report (Monthly summary or Category analysis) instead.`,
    };
  }
  if (new TextEncoder().encode(JSON.stringify(payload)).length > MAX_DECODED_BYTES) {
    return { ok: false, message: "This report is too large to put in a link. Share a summary report instead." };
  }
  if (!validatePayload(payload)) {
    return { ok: false, message: "This report holds a value a link cannot carry, such as a very long description." };
  }
  return { ok: true };
}

/* ---------- encoding: JSON -> deflate -> base64url ---------- */

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function readAll(stream: ReadableStream<Uint8Array>, limit: number): Promise<Uint8Array | null> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) {
      await reader.cancel();
      return null; // refuse to inflate more than the limit (a "zip bomb" in a link)
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

export async function encodeShare(payload: SharePayload): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const compressed = await readAll(
    new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream("deflate-raw")),
    MAX_DECODED_BYTES,
  );
  if (!compressed) throw new Error("report too large to share");
  return toBase64Url(compressed);
}

export type DecodeResult =
  { ok: true; payload: SharePayload } | { ok: false; reason: "empty" | "invalid" | "too-large" };

export async function decodeShare(fragment: string): Promise<DecodeResult> {
  const data = fragment.replace(/^#/, "").trim();
  if (!data) return { ok: false, reason: "empty" };
  try {
    const compressed = fromBase64Url(data);
    const inflated = await readAll(
      new Blob([compressed as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw")),
      MAX_DECODED_BYTES,
    );
    if (!inflated) return { ok: false, reason: "too-large" };
    const payload = validatePayload(JSON.parse(new TextDecoder().decode(inflated)));
    return payload ? { ok: true, payload } : { ok: false, reason: "invalid" };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

/** `basePath` is the sub-folder the site lives in when hosted (e.g. "/ExpenseTracker" on GitHub Pages), or "". */
export function buildShareUrl(origin: string, encoded: string, basePath = ""): string {
  return `${origin}${basePath}/shared#${encoded}`;
}

/** Links on this computer only work on this computer. */
export function isLocalOrigin(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(origin);
}
