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
/**
 * A date on a page of small print: "9 October 2026".
 *
 * Spelt out with the year, unlike every other date on the site. The others
 * are about this week and read better short; this one is about whether what
 * somebody is reading is current, and a year is the whole of the answer.
 * Empty in, empty out, so a page with no date set says nothing rather than
 * printing the epoch.
 */
export function policyDate(iso: string): string {
  const said = String(iso ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(said)) return "";
  const at = new Date(`${said}T12:00:00Z`);
  if (Number.isNaN(at.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(at);
}

export function runDateLabel(runDate: string): string {
  return DATE_FMT.format(new Date(runDate + "T12:00:00Z"));
}

/**
 * "today", "tomorrow", or the date itself.
 *
 * Printing "Sunday, 20 Sep" on the twentieth makes somebody work out whether
 * that is now. It is only worth spelling a date out once it is far enough
 * away to need spelling out.
 */
export function dayWord(runDate: string, now: Date = new Date()): string {
  const today = lagosToday(now);
  if (runDate === today) return "today";

  const tomorrow = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(
    new Date(now.getTime() + 86_400_000)
  );
  return runDate === tomorrow ? "tomorrow" : runDateLabel(runDate);
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
  // Past a day, in days. "71h 52m" is a sum somebody has to do before they
  // know whether that is tonight or the weekend, which is the opposite of
  // what a countdown is for.
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const rest = h % 24;
    return rest === 0 ? `${d}d` : `${d}d ${rest}h`;
  }
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

/**
 * How long ago something happened, said the way anybody would say it.
 *
 * A timestamp answers "when" and the thing actually being asked is "is this
 * still worth chasing". Twenty minutes ago is somebody who might still be
 * deciding; three days ago is not.
 */
export function agoLabel(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";

  const minutes = Math.floor((now.getTime() - then) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/** "8:52am, Mon 21 Sep", for when the exact moment is what is wanted. */
export function whenLabel(iso: string): string {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return "";
  return `${clockLabel(iso)}, ${new Intl.DateTimeFormat("en-NG", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(when)}`;
}

/**
 * A timestamp as an <input type="time"> wants it, in Lagos time.
 *
 * The browser would read the instant in whoever's timezone is open, so a
 * cut-off set for midnight in Lagos opened at eleven in London.
 */
export function lagosClock(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}


/**
 * When something was placed, as somebody standing in Lagos would say it.
 *
 * "10:42pm" for today, "Fri 10:42pm" for this week, and the date once it is
 * older than that. An order card is scanned rather than read, and the whole
 * question being answered is "did this come in while I was not looking".
 */
export function placedLabel(iso: string, now: Date = new Date()): string {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return "";

  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(when)
    .replace(/\s/g, "")
    .toLowerCase();

  const day = (at: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(at);

  if (day(when) === day(now)) return clock;

  const days = Math.round(
    (new Date(`${day(now)}T12:00:00Z`).getTime() -
      new Date(`${day(when)}T12:00:00Z`).getTime()) /
      86400000
  );
  if (days === 1) return `yesterday ${clock}`;
  if (days > 1 && days < 7) {
    const name = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      weekday: "short",
    }).format(when);
    return `${name} ${clock}`;
  }

  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
  }).format(when);
  return `${date} ${clock}`;
}

/**
 * The Monday and the Sunday of the week a day falls in, Lagos time.
 *
 * "This week" meant the next seven days, so on a Saturday it began on
 * Saturday and ran into the middle of the week after: a tab called this week
 * that never once showed the week. A week here starts on Monday, the way the
 * schedule is written and the way anybody asking "how did this week go"
 * means it.
 */
export function weekAround(day: string = lagosToday()): {
  monday: string;
  sunday: string;
} {
  // Midday UTC, so adding days cannot slip across a midnight.
  const at = new Date(`${day}T12:00:00Z`);
  if (Number.isNaN(at.getTime())) return { monday: day, sunday: day };

  // getUTCDay is 0 for Sunday; we want 0 for Monday.
  const since = (at.getUTCDay() + 6) % 7;
  const asDay = (shift: number) =>
    new Date(at.getTime() + shift * 86400000).toISOString().slice(0, 10);

  return { monday: asDay(-since), sunday: asDay(6 - since) };
}
