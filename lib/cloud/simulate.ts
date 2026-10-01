import { DESTINATIONS } from "./catalog";
import type { DestinationId } from "./types";

/**
 * Delivery is SIMULATED. These steps only make the flow feel like a real service; no network request is
 * made and nothing is sent anywhere.
 */
export interface DeliveryContext {
  recipient: string;
  folder: string;
  sheetName: string;
  records: number;
  filename: string;
}

export interface DeliveryStep {
  label: string;
  ms: number;
}

export function deliverySteps(destination: DestinationId, ctx: DeliveryContext): DeliveryStep[] {
  const kind = DESTINATIONS[destination].kind;
  switch (kind) {
    case "email":
      return [
        { label: `Attaching ${ctx.filename}`, ms: 500 },
        { label: "Connecting to the mail server", ms: 700 },
        { label: `Sending to ${ctx.recipient}`, ms: 800 },
        { label: "Delivered (simulated)", ms: 300 },
      ];
    case "sheets":
      return [
        { label: `Creating spreadsheet "${ctx.sheetName}"`, ms: 700 },
        { label: `Writing ${ctx.records} row${ctx.records === 1 ? "" : "s"}`, ms: 800 },
        { label: "Formatting columns", ms: 500 },
        { label: "Spreadsheet ready (simulated)", ms: 300 },
      ];
    default:
      return [
        { label: "Encrypting file", ms: 400 },
        { label: `Uploading to ${ctx.folder}`, ms: 900 },
        { label: "Verifying checksum", ms: 500 },
        { label: "Synced (simulated)", ms: 300 },
      ];
  }
}

/**
 * Deterministic failure so the error path can be seen and tested: an email to the reserved domain
 * "fail.example" bounces.
 */
export function deliveryFailure(destination: DestinationId, recipient: string): string | null {
  if (DESTINATIONS[destination].kind === "email" && /@fail\.example$/i.test(recipient.trim())) {
    return "The recipient's mailbox is unavailable (simulated bounce).";
  }
  return null;
}

export const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Walks through the steps, calling `onStep(index)` as each one starts. When the destination is set to
 * fail, it fails part-way through, like a real upload would.
 */
export async function simulateDelivery(
  steps: DeliveryStep[],
  failure: string | null,
  onStep: (index: number) => void,
  sleep: (ms: number) => Promise<void> = realSleep,
): Promise<void> {
  const failAt = failure ? Math.min(2, steps.length - 1) : -1;
  for (let i = 0; i < steps.length; i++) {
    onStep(i);
    await sleep(steps[i].ms);
    if (i === failAt && failure) throw new Error(failure);
  }
}
