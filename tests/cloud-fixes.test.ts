import { describe, expect, it } from "vitest";
import { buildReport } from "@/lib/cloud/templates";
import { checkShareable, createSharePayload, decodeShare, encodeShare, expiryFrom } from "@/lib/cloud/share";
import { MAX_STORED_URL, safeShareUrl, sanitizeCloudState, skippedEntry } from "@/lib/cloud/state";
import { createSerialQueue } from "@/lib/cloud/queue";
import type { Expense } from "@/lib/types";
import type { Schedule } from "@/lib/cloud/types";

const NOW = new Date(2026, 9, 15, 12, 0);

function expenses(count: number, description = "x"): Expense[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `id-${i}`,
    date: "2026-10-01",
    amountCents: 1000 + (i % 50),
    category: "Food",
    description,
    createdAt: "2026-10-01T10:00:00.000Z",
  }));
}

function payloadFor(count: number, description = "x") {
  const report = buildReport("full", expenses(count, description), { now: NOW, currency: "USD" });
  return createSharePayload(report, { id: "abc", now: NOW, expiresAt: expiryFrom("7d", NOW), allowDownload: true, currency: "USD" });
}

describe("checkShareable: a link is only made if the viewer will open it", () => {
  it("accepts an ordinary report", () => {
    expect(checkShareable(payloadFor(10))).toEqual({ ok: true });
  });

  it("accepts exactly the maximum rows, and that link really opens", async () => {
    const payload = payloadFor(5000);
    expect(payload.rows).toHaveLength(5000);
    expect(checkShareable(payload)).toEqual({ ok: true });
    const decoded = await decodeShare(await encodeShare(payload));
    expect(decoded.ok).toBe(true);
  });

  it("refuses one row more, with a message that says what to do", () => {
    const check = checkShareable(payloadFor(5001));
    expect(check.ok).toBe(false);
    if (!check.ok) {
      expect(check.message).toContain("5001");
      expect(check.message).toContain("5000");
      expect(check.message).toContain("summary");
    }
  });

  it("refuses a report that is too large in bytes even with few rows", () => {
    const payload = payloadFor(3);
    payload.rows = Array.from({ length: 2000 }, () => payload.columns.map(() => "y".repeat(390)));
    const check = checkShareable(payload);
    expect(check.ok).toBe(false);
  });

  it("refuses a value the viewer would reject (a cell over 400 characters)", () => {
    const check = checkShareable(payloadFor(1, "z".repeat(401)));
    expect(check.ok).toBe(false);
  });

  it("whatever it accepts, the viewer opens (round trip for several sizes)", async () => {
    for (const n of [1, 2, 50, 1000]) {
      const payload = payloadFor(n);
      expect(checkShareable(payload).ok).toBe(true);
      expect((await decodeShare(await encodeShare(payload))).ok).toBe(true);
    }
  });
});

describe("saved state: hostile or damaged values", () => {
  const goodEntry = {
    id: "h",
    at: "2026-10-01T10:00:00.000Z",
    template: "tax",
    destination: "dropbox",
    status: "success",
    trigger: "manual",
  };

  it("rejects names that only exist on every object (constructor, toString, __proto__)", () => {
    for (const bad of ["constructor", "toString", "hasOwnProperty", "__proto__", "valueOf"]) {
      expect(sanitizeCloudState({ history: [{ ...goodEntry, template: bad }] }).history).toHaveLength(0);
      expect(sanitizeCloudState({ history: [{ ...goodEntry, destination: bad }] }).history).toHaveLength(0);
    }
    expect(sanitizeCloudState({ history: [goodEntry] }).history).toHaveLength(1);
  });

  it("rejects such names in schedules and shares too", () => {
    const schedule = {
      id: "s",
      name: "n",
      template: "constructor",
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
    expect(sanitizeCloudState({ schedules: [schedule] }).schedules).toHaveLength(0);
    expect(sanitizeCloudState({ schedules: [{ ...schedule, template: "tax", destination: "toString" }] }).schedules).toHaveLength(0);
    expect(
      sanitizeCloudState({ shares: [{ id: "x", createdAt: "2026-10-01T10:00:00.000Z", expiresAt: null, template: "toString", url: "" }] }).shares,
    ).toHaveLength(0);
  });

  it("only keeps an http(s) share link of sane length", () => {
    expect(safeShareUrl("https://t605.github.io/ExpenseTracker/shared#abc")).toBe("https://t605.github.io/ExpenseTracker/shared#abc");
    expect(safeShareUrl("http://localhost:3000/shared#abc")).toBe("http://localhost:3000/shared#abc");
    expect(safeShareUrl("javascript:alert(1)")).toBe("");
    expect(safeShareUrl("JAVASCRIPT:alert(1)")).toBe("");
    expect(safeShareUrl("data:text/html,<script>1</script>")).toBe("");
    expect(safeShareUrl("//evil.example/x")).toBe("");
    expect(safeShareUrl(42)).toBe("");
    // too long is dropped, not cut off into a broken link
    expect(safeShareUrl("https://x.example/" + "a".repeat(MAX_STORED_URL))).toBe("");
  });

  it("a saved share with a javascript: link comes back without the link", () => {
    const share = { id: "x", createdAt: "2026-10-01T10:00:00.000Z", expiresAt: null, template: "full", url: "javascript:alert(1)" };
    expect(sanitizeCloudState({ shares: [share] }).shares[0].url).toBe("");
  });
});

describe("scheduled run with nothing to export", () => {
  const schedule: Schedule = {
    id: "s1",
    name: "Monthly",
    template: "monthly",
    destination: "email",
    frequency: "monthly",
    hour: 8,
    weekday: 0,
    dayOfMonth: 1,
    recipient: "a@b.co",
    enabled: true,
    createdAt: "2026-10-01T10:00:00.000Z",
    lastRunAt: null,
  };

  it("is recorded as skipped, with no file and no fingerprint", () => {
    const entry = skippedEntry(schedule, "schedule", NOW, "e1");
    expect(entry).toMatchObject({
      id: "e1",
      status: "skipped",
      trigger: "schedule",
      template: "monthly",
      destination: "email",
      records: 0,
      bytes: 0,
      filename: "",
      fingerprint: "",
      error: "",
    });
    expect(entry.detail).toContain("nothing was sent");
    expect(entry.at).toBe(NOW.toISOString());
  });

  it("survives being saved and loaded", () => {
    const entry = skippedEntry(schedule, "catch-up", NOW, "e2");
    const loaded = sanitizeCloudState(JSON.parse(JSON.stringify({ history: [entry] })));
    expect(loaded.history).toEqual([entry]);
  });
});

describe("serial queue: exports never overlap", () => {
  const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 5));

  it("runs tasks one at a time, in the order they were queued", async () => {
    const queue = createSerialQueue();
    const log: string[] = [];
    let running = 0;
    let maxRunning = 0;
    const task = (name: string) => async () => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      log.push(`start ${name}`);
      await tick();
      log.push(`end ${name}`);
      running -= 1;
      return name;
    };
    const results = await Promise.all([queue.run(task("a")), queue.run(task("b")), queue.run(task("c"))]);
    expect(results).toEqual(["a", "b", "c"]);
    expect(maxRunning).toBe(1);
    expect(log).toEqual(["start a", "end a", "start b", "end b", "start c", "end c"]);
  });

  it("a failing task does not block the ones behind it, and still reports its error", async () => {
    const queue = createSerialQueue();
    const failing = queue.run(async () => {
      await tick();
      throw new Error("boom");
    });
    const after = queue.run(async () => "still ran");
    await expect(failing).rejects.toThrow("boom");
    await expect(after).resolves.toBe("still ran");
  });

  it("counts what is queued or running, from the moment it is queued", async () => {
    const queue = createSerialQueue();
    expect(queue.pending()).toBe(0);
    const first = queue.run(async () => tick());
    const second = queue.run(async () => tick());
    expect(queue.pending()).toBe(2);
    await first;
    expect(queue.pending()).toBe(1);
    await second;
    expect(queue.pending()).toBe(0);
  });

  it("can be used again after it drained", async () => {
    const queue = createSerialQueue();
    await queue.run(async () => 1);
    await expect(queue.run(async () => 2)).resolves.toBe(2);
    expect(queue.pending()).toBe(0);
  });
});
