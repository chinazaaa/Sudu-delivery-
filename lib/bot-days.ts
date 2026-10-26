/**
 * "When is the next run?" "Are you delivering today?" "Can you do Tuesday?"
 *
 * Asked constantly, and until now answered out of the written list, which
 * can only ever say how the shop works in general. The chat is handed
 * tonight's actual runs and tonight's actual car windows when it opens, so
 * it can say the true thing instead: this day, this window, closing at this
 * time.
 *
 * Written against the way the shop now sells. The day is the customer's
 * choice: a day with a run travels on the run, a day without one goes on a
 * car of its own, and the difference is the fee. So "can you deliver on
 * Monday" is almost always yes, and the useful part of the answer is which
 * of the two it would be and when it would land.
 *
 * No prices here. The chat has one rule about money, which is that it never
 * quotes a figure the checkout has not worked out, and a ladder read aloud
 * from memory is exactly that.
 */

// Counting days has one home. `pick-a-day` owns it because the checkout
// needed it first, and two of these drifting apart would mean the chat
// and the checkout disagreeing about what tomorrow is.
import { dayAfter } from "./pick-a-day";

export const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/** What day they were asking about. Null when the message is not about one. */
export type DayAsked = "next" | "today" | "tomorrow" | { weekday: number } | null;

/**
 * Which day a message is asking about.
 *
 * Deliberately narrow. It has to be a question about delivering or running
 * or coming, because "today" on its own is in half the sentences anybody
 * types and most of them are about food.
 */
export function dayAsked(said: string): DayAsked {
  const flat = said.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  if (flat === "") return null;

  const aboutDelivering =
    /\b(deliver|delivering|delivery|run|runs|running|come|coming|bring|bringing|order|ordering|open)\b/.test(
      flat
    );
  if (!aboutDelivering) return null;

  // Theirs, not the shop's. "Where is my order" is a different question
  // with a different answer, and it is answered somewhere else.
  if (/\bmy\b/.test(flat)) return null;

  for (let weekday = 0; weekday < WEEKDAYS.length; weekday += 1) {
    const full = WEEKDAYS[weekday];
    if (new RegExp(`\\b(${full}|${full.slice(0, 3)})\\b`).test(flat)) {
      return { weekday };
    }
  }

  if (/\btomorrow\b/.test(flat)) return "tomorrow";
  if (/\b(today|tonight|now|this evening)\b/.test(flat)) return "today";
  if (/\b(next|when|what day|which day|soonest|coming up)\b/.test(flat)) return "next";

  return null;
}

export type RunOnOffer = {
  /** The day in words, as the shop writes it: "Wednesday, 28 Oct". */
  said: string;
  runDate: string;
  /** "Between 5pm and 7pm". */
  window: string;
  /** "3:00 pm", as the cut-off reads. */
  closes: string;
};

export type CarOnOffer = {
  date: string;
  /** "between 4pm and 7pm", off the hours admin set for that day. */
  window?: string;
};

/** The next date on or after today that falls on this weekday. */
export function nextOn(weekday: number, today: string): string {
  let date = today;
  for (let i = 0; i < 8; i += 1) {
    const on = new Date(`${date}T12:00:00Z`);
    if (Number.isNaN(on.getTime())) return "";
    if (on.getUTCDay() === weekday) return date;
    date = dayAfter(date);
  }
  return "";
}

/**
 * The answer, in the customer's words.
 *
 * No runs and no cars of their own. Nobody at PAU knows what a run is, and
 * nobody needs to: whether the shop is already driving that evening or
 * making the trip for one person is the shop's business, and the only part
 * of it the customer can see is the price. So the answer is the day, the
 * window, and what delivery starts at.
 *
 * A floor, never a price. What it actually comes to depends on how much of
 * the car the order fills and how far the food is coming, and the checkout
 * is the only thing that knows both. "From" is the same word the front page
 * uses for the same reason.
 *
 * Empty means the chat should not try: nothing going at all is a sentence
 * about the shop rather than about a day.
 */
export function sayWhen(args: {
  asked: DayAsked;
  runs: RunOnOffer[];
  cars: CarOnOffer[];
  today: string;
  /** What delivery starts at on a day the shop is already driving. */
  feeFrom: number;
  /** What it starts at on a day it is not. Dearer, because the trip is
   *  being made for one order. */
  carFrom: number;
  /** How the shop writes money. Passed in so this file holds no opinion
   *  about currency. */
  money: (amount: number) => string;
  /** The places that cost more than the floor, by name. A figure on its
   *  own reads as the price, and somebody ordering from Ikoyi would be
   *  told a number thousands short of what they will pay. */
  farther?: string[];
}): string {
  const { asked, runs, cars, today, feeFrom, carFrom, money } = args;
  const farther = args.farther ?? [];
  if (asked === null) return "";
  if (runs.length === 0 && cars.length === 0) return "";

  const more =
    farther.length > 0
      ? `, and more if the food comes from ${saidList(farther)}`
      : "";
  const from = (amount: number) =>
    amount > 0 ? ` Delivery starts at ${money(amount)}${more}.` : "";

  const onARunDay = (run: RunOnOffer, word: string) =>
    `Yes, ${word}, ${lower(run.window)}. Orders close ${run.closes}.${from(feeFrom)}`;

  /*
   * A day the shop is not already driving.
   *
   * Said exactly like any other day, because to the person asking it is
   * one: a window and a price. They do not pick a time, they pick a day,
   * and the window comes off the hours admin set for it.
   */
  const onACarDay = (word: string, window: string) =>
    window === ""
      ? `Yes, ${word}.${from(carFrom)}`
      : `Yes, ${word}, ${lower(window)}.${from(carFrom)}`;

  const soonestRun = [...runs].sort((a, b) => a.runDate.localeCompare(b.runDate))[0];
  const soonestCar = [...cars].sort((a, b) => a.date.localeCompare(b.date))[0];

  if (asked === "next") {
    // Whichever is actually sooner. "When do you deliver next" is a
    // question about time, and a day the shop is already driving is not a
    // better answer to it for being cheaper.
    const runFirst =
      soonestRun && (!soonestCar || soonestRun.runDate <= soonestCar.date);
    if (runFirst) {
      return `We are delivering ${soonestRun.said}, ${lower(soonestRun.window)}. Orders close ${soonestRun.closes}.${from(feeFrom)}`;
    }
    if (soonestCar) {
      const word = whichDay(soonestCar.date, today);
      const when = soonestCar.window ? `, ${lower(soonestCar.window)}` : "";
      return `We are delivering ${word}${when}.${from(carFrom)}`;
    }
    return "";
  }

  const date =
    asked === "today"
      ? today
      : asked === "tomorrow"
        ? dayAfter(today)
        : nextOn(asked.weekday, today);
  if (date === "") return "";

  const word = whichDay(date, today);

  const run = runs.find((one) => one.runDate === date);
  if (run) return onARunDay(run, word);
  const car = cars.find((one) => one.date === date);
  if (car) return onACarDay(word, car.window ?? "");

  // Nothing that day. What is next beats a flat no.
  const after = [...runs, ...cars.map((car) => ({ ...car, runDate: car.date }))]
    .filter((one) => (one as { runDate: string }).runDate > date)
    .sort((a, b) =>
      (a as { runDate: string }).runDate.localeCompare((b as { runDate: string }).runDate)
    )[0] as RunOnOffer | undefined;

  if (after && after.window) {
    return `Not ${word}, sorry. The soonest is ${after.said}, ${lower(after.window)}.`;
  }
  if (after) {
    return `Not ${word}, sorry. The soonest is ${whichDay((after as unknown as CarOnOffer).date, today)}.`;
  }
  return `Not ${word}, sorry.`;
}

/** "today", "tomorrow", or "on Saturday". */
function whichDay(date: string, today: string): string {
  if (date === today) return "today";
  if (date === dayAfter(today)) return "tomorrow";
  const on = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(on.getTime())) return "then";
  const name = WEEKDAYS[on.getUTCDay()];
  return `on ${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

/** "Lekki, Ajah or Ikoyi", the way somebody would say it out loud. */
function saidList(names: string[]): string {
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
}

/** A window said inside a sentence, where a capital letter mid sentence is
 *  the tell that a label has been dropped in without being read. */
function lower(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
