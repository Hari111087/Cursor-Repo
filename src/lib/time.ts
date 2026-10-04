import { env } from "./env";

/** YYYY-MM-DD for a date in the app timezone. */
export function dayKey(d = new Date(), tz = env.timezone) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Minutes since midnight in the app timezone. */
export function minutesOfDay(d = new Date(), tz = env.timezone) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

export function hhmmToMinutes(s: string) {
  const [h, m] = s.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** True when `now` falls inside [start, end), handling windows that cross midnight. */
export function inQuietHours(start: string, end: string, d = new Date()) {
  const now = minutesOfDay(d);
  const s = hhmmToMinutes(start);
  const e = hhmmToMinutes(end);
  return s <= e ? now >= s && now < e : now >= s || now < e;
}

/** Offset (minutes) of `tz` from UTC at instant `d`. */
export function tzOffsetMinutes(d: Date, tz = env.timezone) {
  const local = new Date(d.toLocaleString("en-US", { timeZone: tz }));
  const utc = new Date(d.toLocaleString("en-US", { timeZone: "UTC" }));
  return Math.round((local.getTime() - utc.getTime()) / 60_000);
}

/** The instant that is HH:MM (fractional hours allowed via minutes) on today+dayOffset in `tz`. */
export function zonedAt(minutesFromMidnight: number, dayOffset = 0, tz = env.timezone) {
  const [y, mo, d] = dayKey(new Date(Date.now() + dayOffset * 86_400_000), tz).split("-").map(Number);
  const guess = Date.UTC(y, mo - 1, d, 0, Math.round(minutesFromMidnight));
  return new Date(guess - tzOffsetMinutes(new Date(guess), tz) * 60_000);
}

export function fmtTime(d: Date | string, tz = env.timezone) {
  return new Date(d).toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" });
}
