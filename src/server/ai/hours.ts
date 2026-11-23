import type { HoursRow } from "./types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** Local date parts of `date` in `timeZone`. */
export function zonedParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: DAY_NAMES.indexOf(parts.weekday as string),
  };
}

function tzOffsetMs(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return asUtc - Math.floor(date.getTime() / 60_000) * 60_000;
}

/** Converts a wall-clock time in `timeZone` to a UTC Date. */
export function zonedTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  let result = guess - tzOffsetMs(new Date(guess), timeZone);
  // Second pass handles DST transitions.
  result = guess - tzOffsetMs(new Date(result), timeZone);
  return new Date(result);
}

export function isOpenAt(hours: HoursRow[], timeZone: string, date: Date): boolean {
  if (hours.length === 0) return true; // No hours configured: treat as always open.
  const p = zonedParts(date, timeZone);
  const minute = p.hour * 60 + p.minute;
  const prevDay = (p.weekday + 6) % 7;
  for (const row of hours) {
    if (row.isClosed) continue;
    const open = toMinutes(row.openTime);
    const close = toMinutes(row.closeTime);
    const overnight = close <= open;
    if (row.dayOfWeek === p.weekday) {
      if (!overnight && minute >= open && minute < close) return true;
      if (overnight && minute >= open) return true;
    }
    if (row.dayOfWeek === prevDay && overnight && minute < close) return true;
  }
  return false;
}

/** Next time the restaurant opens after `from` (null if it never opens). */
export function nextOpening(hours: HoursRow[], timeZone: string, from: Date): Date | null {
  const open = hours.filter((h) => !h.isClosed);
  if (open.length === 0) return null;
  const p = zonedParts(from, timeZone);
  const candidates: Date[] = [];
  for (let offset = 0; offset <= 7; offset++) {
    const dayDate = new Date(Date.UTC(p.year, p.month - 1, p.day + offset));
    const weekday = dayDate.getUTCDay();
    for (const row of open.filter((r) => r.dayOfWeek === weekday)) {
      const [h, m] = row.openTime.split(":").map(Number);
      const at = zonedTimeToUtc(dayDate.getUTCFullYear(), dayDate.getUTCMonth() + 1, dayDate.getUTCDate(), h ?? 0, m ?? 0, timeZone);
      if (at > from) candidates.push(at);
    }
    if (candidates.length) break;
  }
  candidates.sort((a, b) => a.getTime() - b.getTime());
  return candidates[0] ?? null;
}

export function formatLocalTime(date: Date, timeZone: string, locale = "en"): string {
  try {
    return new Intl.DateTimeFormat(locale, { timeZone, weekday: "short", hour: "2-digit", minute: "2-digit" }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en", { timeZone, weekday: "short", hour: "2-digit", minute: "2-digit" }).format(date);
  }
}

/** "Mon 11:00–22:00 · Tue …" in English (the composer localises). */
export function describeHours(hours: HoursRow[]): string {
  if (hours.length === 0) return "Open every day";
  return [1, 2, 3, 4, 5, 6, 0]
    .map((d) => {
      const rows = hours.filter((h) => h.dayOfWeek === d && !h.isClosed);
      return `${DAY_NAMES[d]} ${rows.length ? rows.map((r) => `${r.openTime}–${r.closeTime}`).join(", ") : "closed"}`;
    })
    .join(" · ");
}

export type ScheduleCheck = { ok: true; date: Date } | { ok: false; reason: "invalid" | "past" | "too_soon" | "closed" | "too_far" };

export function checkScheduledTime(iso: string, hours: HoursRow[], timeZone: string, now: Date, prepMinutes: number): ScheduleCheck {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { ok: false, reason: "invalid" };
  if (date.getTime() < now.getTime() - 60_000) return { ok: false, reason: "past" };
  if (date.getTime() < now.getTime() + prepMinutes * 60_000) return { ok: false, reason: "too_soon" };
  if (date.getTime() > now.getTime() + 7 * 24 * 3_600_000) return { ok: false, reason: "too_far" };
  if (!isOpenAt(hours, timeZone, date)) return { ok: false, reason: "closed" };
  return { ok: true, date };
}
