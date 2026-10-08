/**
 * The days a restaurant opens.
 *
 * Nearly every one of them opens every day, so empty means exactly that and
 * no restaurant has to be configured to behave as it always has. Anything
 * else is the list of weekday numbers it is open, Sunday being 0, which is
 * the convention the skincare drop already uses.
 *
 * This is a fact about the restaurant rather than about a particular car.
 * A run can also be told which places it carries, and that stays the tool
 * for "they are shut for repairs this week"; a weekday that never changes
 * belongs here, or somebody has to remember it every Saturday for as long
 * as the shop exists.
 */

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** The days it opens. Empty text means all seven. */
export function openDays(text: string | null | undefined): number[] {
  const said = String(text ?? "")
    .split(",")
    .map((one) => Number(one.trim()))
    .filter((one) => Number.isInteger(one) && one >= 0 && one <= 6);

  const days = [...new Set(said)].sort((a, b) => a - b);
  return days.length === 0 ? [0, 1, 2, 3, 4, 5, 6] : days;
}

/** How the column is written: "1,2,3,4,5", or empty for every day. */
export function openDaysText(days: number[]): string {
  const kept = [...new Set(days.filter((one) => one >= 0 && one <= 6))].sort((a, b) => a - b);
  return kept.length === 0 || kept.length === 7 ? "" : kept.join(",");
}

/**
 * The weekday a run date falls on, in Lagos.
 *
 * Read off the date rather than an instant, for the same reason the
 * skincare drop walks days rather than adding milliseconds: being a day out
 * on the one day that matters is the whole of the bug this prevents.
 */
export function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

/** Whether this restaurant is open on a run's date. */
export function opensOn(text: string | null | undefined, date: string): boolean {
  if (!date) return true;
  return openDays(text).includes(weekdayOf(date));
}

/**
 * What to say about it, in words somebody reads once.
 *
 * "Closed Saturdays and Sundays" rather than a row of ticks, because the
 * question being answered is "can I get this at the weekend".
 */
export function closedWord(text: string | null | undefined): string {
  const open = openDays(text);
  if (open.length === 7) return "";

  const shut = [0, 1, 2, 3, 4, 5, 6].filter((one) => !open.includes(one));
  if (shut.length === 0) return "";

  const names = shut.map((one) => `${DAY_NAMES[one]}s`);
  const said =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return `Closed ${said}`;
}

/** The other way round, for a line that reads better as what is open. */
export function openWord(text: string | null | undefined): string {
  const open = openDays(text);
  if (open.length === 7) return "Open every day";
  if (open.length === 5 && [1, 2, 3, 4, 5].every((one) => open.includes(one))) {
    return "Monday to Friday only";
  }
  return `Open ${open.map((one) => DAY_NAMES[one].slice(0, 3)).join(", ")}`;
}

/**
 * The first restaurant in a cart that is shut on the day a car goes.
 *
 * Checked against the database rather than against what the browser sent,
 * for the same reason the area is: a cart is written on a phone, and a
 * phone can say anything.
 */
export async function shutOn(
  restaurantIds: string[],
  date: string,
  load: (ids: string[]) => Promise<{ name: string; open_days?: string | null }[]>
): Promise<{ name: string; day: string } | null> {
  if (restaurantIds.length === 0 || !date) return null;

  const rows = await load(restaurantIds);
  const shut = rows.find((one) => !opensOn(one.open_days, date));
  return shut ? { name: shut.name, day: DAY_NAMES[weekdayOf(date)] } : null;
}

/**
 * The next day this restaurant is open, from a date onwards.
 *
 * Walked a day at a time rather than worked out, because a week is seven
 * steps and the arithmetic version is where the off-by-one lives. Returns
 * the date given when it is already an open day.
 */
export function nextOpenDay(text: string | null | undefined, from: string): string {
  for (let ahead = 0; ahead < 8; ahead += 1) {
    const date = addDays(from, ahead);
    if (opensOn(text, date)) return date;
  }
  return from;
}

/** One day on, in the shop's own calendar. */
function addDays(date: string, days: number): string {
  const at = new Date(`${date}T12:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
}
