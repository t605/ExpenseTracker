import { describe, expect, it } from "vitest";
import type { Expense } from "@/lib/types";
import { buildReport, reportToCSV, taxYearFor } from "@/lib/cloud/templates";
import { describeTiming, isDue, nextRun, nextRunOf, untilLabel } from "@/lib/cloud/schedule";
import { dataHealth } from "@/lib/cloud/health";
import { deliveryFailure, deliverySteps, simulateDelivery } from "@/lib/cloud/simulate";
import {
  buildShareUrl,
  createSharePayload,
  decodeShare,
  encodeShare,
  expiryFrom,
  isExpired,
  isLocalOrigin,
  validatePayload,
} from "@/lib/cloud/share";
import { EMPTY_CLOUD_STATE, sanitizeCloudState } from "@/lib/cloud/state";
import { formatBytes, formatDateTime, isValidEmail, sha256Hex, timeAgo } from "@/lib/cloud/util";
import type { Schedule } from "@/lib/cloud/types";

let n = 0;
function exp(partial: Partial<Expense>): Expense {
  n += 1;
  return {
    id: `id-${n}`,
    date: "2026-10-01",
    amountCents: 1000,
    category: "Food",
    description: "Lunch",
    createdAt: "2026-10-01T10:00:00.000Z",
    ...partial,
  };
}

const NOW = new Date(2026, 9, 15, 12, 0); // 15 Oct 2026, 12:00 local
const ctx = { now: NOW, currency: "ILS" as const };

const data = [
  exp({ date: "2026-10-05", category: "Bills", amountCents: 32356, description: "water" }),
  exp({ date: "2026-10-01", category: "Food", amountCents: 150000, description: "Rami Levi" }),
  exp({ date: "2026-10-01", category: "Food", amountCents: 52300, description: "Brunch" }),
  exp({ date: "2026-09-15", category: "Bills", amountCents: 8800, description: "Internet" }),
  exp({ date: "2025-12-31", category: "Other", amountCents: 999, description: "Old thing" }),
];

describe("templates", () => {
  it("full data: oldest first, currency in the header, total row", () => {
    const r = buildReport("full", data, ctx);
    expect(r.columns).toEqual(["Date", "Category", "Amount (ILS)", "Description"]);
    expect(r.rows.map((row) => row[0])).toEqual(["2025-12-31", "2026-09-15", "2026-10-01", "2026-10-01", "2026-10-05"]);
    expect(r.footer).toEqual(["Total", "", "2444.55", ""]);
    expect(r.recordCount).toBe(5);
  });

  it("tax report: only the tax year, subtotals per category, total", () => {
    const r = buildReport("tax", data, ctx);
    expect(r.title).toBe("Tax report 2026");
    expect(r.fileBase).toBe("tax-report-2026");
    expect(r.recordCount).toBe(4); // the 2025 expense is left out
    const subtotals = r.rows.filter((row) => row[2].startsWith("Subtotal"));
    expect(subtotals).toEqual([
      ["Food", "", "Subtotal Food", "2023.00"],
      ["Bills", "", "Subtotal Bills", "411.56"],
    ]);
    expect(r.footer).toEqual(["Total", "", "", "2434.56"]);
  });

  it("tax year falls back to the latest year with data", () => {
    expect(taxYearFor(data, new Date(2027, 2, 1))).toBe(2026);
    expect(taxYearFor([], new Date(2027, 2, 1))).toBe(2027);
    expect(buildReport("tax", data, { now: new Date(2027, 2, 1), currency: "USD" }).title).toBe("Tax report 2026");
  });

  it("monthly summary: count, total, average, largest, top category per month", () => {
    const r = buildReport("monthly", data, ctx);
    expect(r.rows.map((row) => row[0])).toEqual(["2025-12", "2026-09", "2026-10"]);
    expect(r.rows[2]).toEqual(["2026-10", "3", "2346.56", "782.19", "1500.00", "Food"]);
    expect(r.footer?.[1]).toBe("5");
  });

  it("category analysis: biggest first, shares, range of dates", () => {
    const r = buildReport("category", data, ctx);
    expect(r.rows.map((row) => row[0])).toEqual(["Food", "Bills", "Other"]);
    expect(r.rows[0]).toEqual(["Food", "2", "2023.00", "82.8", "1011.50", "523.00", "1500.00", "2026-10-01", "2026-10-01"]);
    expect(r.rows[1][7]).toBe("2026-09-15");
    expect(r.rows[1][8]).toBe("2026-10-05");
  });

  it("every template handles no expenses", () => {
    for (const t of ["full", "tax", "monthly", "category"] as const) {
      const r = buildReport(t, [], ctx);
      expect(r.rows).toEqual([]);
      expect(r.footer).toBeNull();
      expect(r.recordCount).toBe(0);
    }
  });

  it("CSV quotes cells and guards against formulas", () => {
    const csv = reportToCSV(buildReport("full", [exp({ description: '=1+1, "x"' })], ctx));
    expect(csv).toBe("Date,Category,Amount (ILS),Description\r\n2026-10-01,Food,10.00,\"'=1+1, \"\"x\"\"\"\r\nTotal,,10.00,\r\n");
  });

  it("does not change the input", () => {
    const copy = [...data];
    buildReport("full", data, ctx);
    buildReport("category", data, ctx);
    expect(data).toEqual(copy);
  });
});

describe("schedule timing", () => {
  const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);

  it("daily: later today if the hour has not passed, else tomorrow", () => {
    const s = { frequency: "daily", hour: 18, weekday: 0, dayOfMonth: 1 } as const;
    expect(nextRun(s, at(2026, 10, 15, 12))).toEqual(at(2026, 10, 15, 18));
    expect(nextRun(s, at(2026, 10, 15, 18))).toEqual(at(2026, 10, 16, 18));
    expect(nextRun(s, at(2026, 10, 31, 19))).toEqual(at(2026, 11, 1, 18));
  });

  it("weekly: next matching weekday (Monday = 1; 15 Oct 2026 is a Thursday)", () => {
    const s = { frequency: "weekly", hour: 8, weekday: 1, dayOfMonth: 1 } as const;
    expect(nextRun(s, at(2026, 10, 15, 12))).toEqual(at(2026, 10, 19, 8));
    const thursday = { ...s, weekday: 4 };
    expect(nextRun(thursday, at(2026, 10, 15, 7))).toEqual(at(2026, 10, 15, 8));
    expect(nextRun(thursday, at(2026, 10, 15, 8))).toEqual(at(2026, 10, 22, 8));
  });

  it("monthly: this month if the day is ahead, else next month, across a year end", () => {
    const s = { frequency: "monthly", hour: 9, weekday: 0, dayOfMonth: 28 } as const;
    expect(nextRun(s, at(2026, 10, 15))).toEqual(at(2026, 10, 28, 9));
    expect(nextRun(s, at(2026, 12, 28, 9))).toEqual(at(2027, 1, 28, 9));
  });

  const base: Schedule = {
    id: "s1",
    name: "x",
    template: "tax",
    destination: "email",
    frequency: "daily",
    hour: 8,
    weekday: 0,
    dayOfMonth: 1,
    recipient: "a@b.co",
    enabled: true,
    createdAt: at(2026, 10, 10, 9).toISOString(),
    lastRunAt: null,
  };

  it("is due once the next run time has passed", () => {
    expect(isDue(base, at(2026, 10, 11, 7, 59))).toBe(false);
    expect(isDue(base, at(2026, 10, 11, 8, 0))).toBe(true);
  });
  it("counts from the last run, and a disabled schedule is never due", () => {
    const ran = { ...base, lastRunAt: at(2026, 10, 11, 8, 1).toISOString() };
    expect(isDue(ran, at(2026, 10, 12, 7))).toBe(false);
    expect(isDue(ran, at(2026, 10, 12, 8))).toBe(true);
    expect(isDue({ ...base, enabled: false }, at(2027, 1, 1))).toBe(false);
    expect(nextRunOf(ran)).toEqual(at(2026, 10, 12, 8));
  });

  it("describes timing in words", () => {
    expect(describeTiming({ frequency: "daily", hour: 8, weekday: 0, dayOfMonth: 1 })).toBe("Every day at 08:00");
    expect(describeTiming({ frequency: "weekly", hour: 17, weekday: 5, dayOfMonth: 1 })).toBe("Every Friday at 17:00");
    expect(describeTiming({ frequency: "monthly", hour: 9, weekday: 0, dayOfMonth: 1 })).toBe("Monthly on the 1st at 09:00");
    expect(describeTiming({ frequency: "monthly", hour: 9, weekday: 0, dayOfMonth: 22 })).toBe("Monthly on the 22nd at 09:00");
    expect(describeTiming({ frequency: "monthly", hour: 9, weekday: 0, dayOfMonth: 11 })).toBe("Monthly on the 11th at 09:00");
  });

  it("labels the wait", () => {
    expect(untilLabel(at(2026, 10, 15, 12, 20), at(2026, 10, 15, 12))).toBe("in 20 min");
    expect(untilLabel(at(2026, 10, 15, 18), at(2026, 10, 15, 12))).toBe("in 6 h");
    expect(untilLabel(at(2026, 10, 25), at(2026, 10, 15))).toBe("in 10 days");
    expect(untilLabel(at(2026, 10, 15), at(2026, 10, 15, 1))).toBe("any moment now");
  });
});

describe("dataHealth", () => {
  it("is clean for ordinary data", () => {
    expect(dataHealth(data, NOW)).toEqual([]);
  });
  it("warns when empty", () => {
    expect(dataHealth([], NOW)[0].id).toBe("empty");
  });
  it("finds future dates, duplicates, short descriptions and outliers", () => {
    const messy = [
      exp({ date: "2026-12-01", description: "future" }),
      exp({ description: "dup" }),
      exp({ description: "Dup " }),
      exp({ description: "x" }),
      exp({ description: "normal one", amountCents: 1000 }),
      exp({ description: "huge", amountCents: 5_000_000 }),
    ];
    expect(dataHealth(messy, NOW).map((i) => i.id)).toEqual(["future", "duplicates", "short", "outlier"]);
  });
});

describe("delivery simulation", () => {
  const dctx = { recipient: "a@b.co", folder: "/Apps/X", sheetName: "Tax", records: 3, filename: "f.csv" };

  it("has steps for every kind of destination", () => {
    expect(deliverySteps("email", dctx).at(-1)?.label).toContain("simulated");
    expect(deliverySteps("sheets", dctx)[1].label).toBe("Writing 3 rows");
    expect(deliverySteps("dropbox", dctx)[1].label).toBe("Uploading to /Apps/X");
  });

  it("walks every step, in order, without real waiting", async () => {
    const seen: number[] = [];
    const waits: number[] = [];
    await simulateDelivery(deliverySteps("dropbox", dctx), null, (i) => seen.push(i), async (ms) => void waits.push(ms));
    expect(seen).toEqual([0, 1, 2, 3]);
    expect(waits).toHaveLength(4);
  });

  it("fails part-way when a failure is set", async () => {
    const seen: number[] = [];
    await expect(
      simulateDelivery(deliverySteps("email", dctx), "bounced", (i) => seen.push(i), async () => {}),
    ).rejects.toThrow("bounced");
    expect(seen).toEqual([0, 1, 2]);
  });

  it("only the reserved fail.example domain bounces", () => {
    expect(deliveryFailure("email", "bounce@fail.example")).toBeTruthy();
    expect(deliveryFailure("email", "BOUNCE@FAIL.EXAMPLE")).toBeTruthy();
    expect(deliveryFailure("email", "me@example.com")).toBeNull();
    expect(deliveryFailure("dropbox", "bounce@fail.example")).toBeNull();
  });
});

describe("share links", () => {
  const report = buildReport("tax", data, ctx);
  const payload = createSharePayload(report, {
    id: "abc",
    now: NOW,
    expiresAt: expiryFrom("7d", NOW),
    allowDownload: true,
    currency: "ILS",
  });

  it("round-trips a report through the link (Hebrew and quotes included)", async () => {
    const hebrew = { ...payload, rows: [["Other", "2026-10-01", 'סרט "בקולנוע", ₪ Расходы', "1.00"]] };
    const encoded = await encodeShare(hebrew);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    const back = await decodeShare("#" + encoded);
    expect(back).toEqual({ ok: true, payload: validatePayload(hebrew) });
  });

  it("is compact enough to fit in a link", async () => {
    expect((await encodeShare(payload)).length).toBeLessThan(1500);
  });

  it("expiry", () => {
    expect(expiryFrom("never", NOW)).toBeNull();
    expect(expiryFrom("1d", NOW)).toBe(new Date(NOW.getTime() + 86_400_000).toISOString());
    expect(isExpired(null, NOW)).toBe(false);
    expect(isExpired(payload.exp, NOW)).toBe(false);
    expect(isExpired(payload.exp, new Date(NOW.getTime() + 8 * 86_400_000))).toBe(true);
  });

  it("rejects empty, garbage, and tampered links", async () => {
    expect(await decodeShare("")).toEqual({ ok: false, reason: "empty" });
    expect(await decodeShare("#")).toEqual({ ok: false, reason: "empty" });
    expect(await decodeShare("#not-a-real-link")).toMatchObject({ ok: false });
    const encoded = await encodeShare(payload);
    expect(await decodeShare(encoded.slice(0, -8))).toMatchObject({ ok: false });
  });

  it("rejects well-formed JSON that is not a share payload", async () => {
    const bad = await encodeShare({ ...payload, rows: [["only one cell"]] });
    expect(await decodeShare(bad)).toEqual({ ok: false, reason: "invalid" });
  });

  it("refuses to inflate an oversized (zip-bomb) link", async () => {
    // 3 MB of zeros compresses to a few KB, so the link is tiny but inflates far above the 1 MB limit.
    const bomb = new Blob([new Uint8Array(3_000_000)]).stream().pipeThrough(new CompressionStream("deflate-raw"));
    const bytes = new Uint8Array(await new Response(bomb).arrayBuffer());
    const link = btoa(String.fromCharCode.apply(null, Array.from(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(link.length).toBeLessThan(10_000);
    expect(await decodeShare(link)).toEqual({ ok: false, reason: "too-large" });
  });

  it("validatePayload checks types and limits", () => {
    expect(validatePayload(payload)).not.toBeNull();
    expect(validatePayload(null)).toBeNull();
    expect(validatePayload({ ...payload, v: 2 })).toBeNull();
    expect(validatePayload({ ...payload, currency: "GBP" })).toBeNull();
    expect(validatePayload({ ...payload, exp: "not a date" })).toBeNull();
    expect(validatePayload({ ...payload, columns: [] })).toBeNull();
    expect(validatePayload({ ...payload, footer: ["short"] })).toBeNull();
    expect(validatePayload({ ...payload, rows: [["a", "b", "c", "x".repeat(401)]] })).toBeNull();
    expect(validatePayload({ ...payload, fileBase: "../../evil name" })?.fileBase).toBe("evil-name");
    expect(validatePayload({ ...payload, fileBase: "..." })?.fileBase).toBe("export");
  });

  it("builds the link and spots local addresses", () => {
    expect(buildShareUrl("https://app.example", "abc")).toBe("https://app.example/shared#abc");
    expect(isLocalOrigin("http://localhost:3123")).toBe(true);
    expect(isLocalOrigin("http://127.0.0.1:3000")).toBe(true);
    expect(isLocalOrigin("https://app.example")).toBe(false);
  });
});

describe("saved state", () => {
  it("falls back to empty for junk", () => {
    expect(sanitizeCloudState(null)).toEqual(EMPTY_CLOUD_STATE);
    expect(sanitizeCloudState("x")).toEqual(EMPTY_CLOUD_STATE);
    expect(sanitizeCloudState({ history: "no" })).toEqual(EMPTY_CLOUD_STATE);
  });

  it("keeps good records and drops damaged ones", () => {
    const good = {
      id: "h1",
      at: "2026-10-01T10:00:00.000Z",
      template: "tax",
      destination: "dropbox",
      status: "success",
      trigger: "manual",
      records: 4,
      bytes: 300,
      filename: "f.csv",
      fingerprint: "a".repeat(64),
      detail: "d",
      error: "",
    };
    const state = sanitizeCloudState({
      history: [good, { ...good, id: "h2", template: "nope" }, { ...good, id: "h3", status: "weird" }, 7],
      connections: [
        { destination: "dropbox", account: "a", connectedAt: "2026-10-01T10:00:00.000Z", folder: "/x" },
        { destination: "dropbox", account: "dup", connectedAt: "2026-10-01T10:00:00.000Z", folder: "/y" },
        { destination: "download", account: "a", connectedAt: "2026-10-01T10:00:00.000Z", folder: "" },
      ],
    });
    expect(state.history.map((h) => h.id)).toEqual(["h1"]);
    expect(state.connections).toHaveLength(1);
    expect(state.connections[0].account).toBe("a");
  });

  it("rejects schedules with impossible values", () => {
    const s = {
      id: "s",
      name: "n",
      template: "tax",
      destination: "email",
      frequency: "daily",
      hour: 8,
      weekday: 0,
      dayOfMonth: 1,
      recipient: "a@b.co",
      enabled: true,
      createdAt: "2026-10-01T10:00:00.000Z",
      lastRunAt: null,
    };
    expect(sanitizeCloudState({ schedules: [s] }).schedules).toHaveLength(1);
    expect(sanitizeCloudState({ schedules: [{ ...s, hour: 24 }] }).schedules).toHaveLength(0);
    expect(sanitizeCloudState({ schedules: [{ ...s, dayOfMonth: 31 }] }).schedules).toHaveLength(0);
    expect(sanitizeCloudState({ schedules: [{ ...s, destination: "download" }] }).schedules).toHaveLength(0);
  });

  it("sanitises a fingerprint that is not 64 hex characters", () => {
    const entry = {
      id: "h",
      at: "2026-10-01T10:00:00.000Z",
      template: "full",
      destination: "email",
      status: "failed",
      trigger: "schedule",
      fingerprint: "<script>",
    };
    expect(sanitizeCloudState({ history: [entry] }).history[0].fingerprint).toBe("");
  });
});

describe("util", () => {
  it("sha256 matches the published test vector", async () => {
    expect(await sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
  it("formats sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
  });
  it("validates email addresses loosely but safely", () => {
    expect(isValidEmail("me@example.com")).toBe(true);
    expect(isValidEmail(" me@example.com ")).toBe(true);
    expect(isValidEmail("me@example")).toBe(false);
    expect(isValidEmail("me example@x.com")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
  it("formats time", () => {
    expect(formatDateTime(new Date(2026, 9, 1, 14, 5).toISOString())).toBe("1 Oct 2026, 14:05");
    expect(timeAgo(new Date(NOW.getTime() - 10_000).toISOString(), NOW)).toBe("just now");
    expect(timeAgo(new Date(NOW.getTime() - 5 * 60_000).toISOString(), NOW)).toBe("5 min ago");
    expect(timeAgo(new Date(NOW.getTime() - 3 * 3600_000).toISOString(), NOW)).toBe("3 h ago");
    expect(timeAgo(new Date(NOW.getTime() - 5 * 86_400_000).toISOString(), NOW)).toBe("5 days ago");
  });
});
