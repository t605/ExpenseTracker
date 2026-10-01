import { WEEKDAYS } from "./catalog";
import type { Schedule } from "./types";

type Timing = Pick<Schedule, "frequency" | "hour" | "weekday" | "dayOfMonth">;

/** The first run time strictly after `after`, in the user's local time. */
export function nextRun(s: Timing, after: Date): Date {
  const y = after.getFullYear();
  const m = after.getMonth();
  const d = after.getDate();
  if (s.frequency === "daily") {
    const today = new Date(y, m, d, s.hour);
    return today > after ? today : new Date(y, m, d + 1, s.hour);
  }
  if (s.frequency === "weekly") {
    const daysAhead = (s.weekday - after.getDay() + 7) % 7;
    const candidate = new Date(y, m, d + daysAhead, s.hour);
    return candidate > after ? candidate : new Date(y, m, d + daysAhead + 7, s.hour);
  }
  const thisMonth = new Date(y, m, s.dayOfMonth, s.hour);
  return thisMonth > after ? thisMonth : new Date(y, m + 1, s.dayOfMonth, s.hour);
}

/** Runs are counted from the last run, or from creation if it never ran. */
export function nextRunOf(s: Schedule): Date {
  return nextRun(s, new Date(s.lastRunAt ?? s.createdAt));
}

export function isDue(s: Schedule, now: Date): boolean {
  return s.enabled && nextRunOf(s).getTime() <= now.getTime();
}

function ordinal(n: number): string {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10 > 3 ? 0 : n % 10]}`;
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function describeTiming(s: Timing): string {
  const at = formatHour(s.hour);
  if (s.frequency === "daily") return `Every day at ${at}`;
  if (s.frequency === "weekly") return `Every ${WEEKDAYS[s.weekday]} at ${at}`;
  return `Monthly on the ${ordinal(s.dayOfMonth)} at ${at}`;
}

/** "in 3 h", "in 2 days", "any moment" - for the next-run label. */
export function untilLabel(target: Date, now: Date): string {
  const minutes = Math.round((target.getTime() - now.getTime()) / 60000);
  if (minutes <= 0) return "any moment now";
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `in ${hours} h`;
  return `in ${Math.round(hours / 24)} days`;
}
