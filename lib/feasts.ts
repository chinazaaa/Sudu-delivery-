/**
 * The days that move, worked out rather than typed.
 *
 * A page that says "Easter Sunday, 28 March 2027" is a better page: it is
 * the thing somebody is actually checking, and an assistant reading the
 * site can quote it. A page that says it because somebody typed it in 2026
 * is a page that lies from April 2027 onwards, quietly, on the one line
 * people trusted it for.
 *
 * So the dates are computed. Easter is the anchor: Mothering Sunday is
 * three Sundays before it, and everything else here hangs off a fixed day
 * of the year.
 */

/** Plain YYYY-MM-DD, which is how every date in this shop is written. */
const iso = (year: number, month: number, day: number): string =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

/**
 * Easter Sunday, by the Gregorian computus.
 *
 * The anonymous algorithm, which is the one in every reference and is
 * exact for every year this shop will see. Not a table of dates, because a
 * table runs out and nobody notices the year it does.
 */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(year, month, day);
}

/**
 * Mothering Sunday: the fourth Sunday of Lent, which is three weeks before
 * Easter. The date Nigeria keeps, following the British one, rather than
 * the American Mother's Day in May.
 */
export function motheringSunday(year: number): string {
  const easter = new Date(`${easterSunday(year)}T12:00:00Z`);
  easter.setUTCDate(easter.getUTCDate() - 21);
  return easter.toISOString().slice(0, 10);
}

/** The American one: the second Sunday in May. Worth naming, because some
 *  families here keep it and somebody always asks. */
export function mothersDayMay(year: number): string {
  const first = new Date(`${iso(year, 5, 1)}T12:00:00Z`);
  const firstSunday = 1 + ((7 - first.getUTCDay()) % 7);
  return iso(year, 5, firstSunday + 7);
}

export function valentines(year: number): string {
  return iso(year, 2, 14);
}

/**
 * The next one of these still to come, from a given day.
 *
 * A page about Valentine's is about the next Valentine's, which on the
 * 15th of February is next year's. Taking the current year and leaving it
 * at that is how a page spends eleven months advertising a day that has
 * been.
 */
export function nextOf(
  feast: (year: number) => string,
  today: string
): string {
  const year = Number(today.slice(0, 4));
  const thisYear = feast(year);
  return thisYear >= today ? thisYear : feast(year + 1);
}

/** "Sunday, 14 February 2027", for a sentence somebody reads. */
export function feastLabel(day: string): string {
  const at = new Date(`${day}T12:00:00Z`);
  if (Number.isNaN(at.getTime())) return "";
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(at);
}
