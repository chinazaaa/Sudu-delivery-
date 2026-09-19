import { TZ } from "./config";

const DATE_FMT = new Intl.DateTimeFormat("en-NG", {
  timeZone: TZ,
  weekday: "long",
  day: "numeric",
  month: "short",
});

const TIME_FMT = new Intl.DateTimeFormat("en-NG", {
  timeZone: TZ,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** "Friday, 19 Sep" for a YYYY-MM-DD run date. */
export function runDateLabel(runDate: string): string {
  return DATE_FMT.format(new Date(runDate + "T12:00:00Z"));
}

/** "Friday", used in the countdown lines. */
export function weekdayLabel(runDate: string): string {
  return new Intl.DateTimeFormat("en-NG", { timeZone: TZ, weekday: "long" })
    .format(new Date(runDate + "T12:00:00Z"));
}

/** "Friday, 19 Sep" for any ISO instant, in Lagos time. */
export function dayLabel(iso: string): string {
  return DATE_FMT.format(new Date(iso));
}

/** "11:30 am" in Lagos time, for any ISO instant. */
export function clockLabel(iso: string): string {
  return TIME_FMT.format(new Date(iso));
}

/**
 * A Lagos wall-clock time as a real instant. Nigeria is a fixed UTC+1 with no
 * DST, so the offset can be written straight into the string.
 */
export function lagosInstant(date: string, hour: number, minute: number): string {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return new Date(`${date}T${hh}:${mm}:00+01:00`).toISOString();
}

/** Today's date in Lagos, as YYYY-MM-DD. */
export function lagosToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
}

/** The countdown text: "3h 12m", "12m 04s", or "now". */
export function countdown(msRemaining: number): string {
  if (msRemaining <= 0) return "now";
  const total = Math.floor(msRemaining / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}
