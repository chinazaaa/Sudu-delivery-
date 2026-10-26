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

export type CarOnOffer = { date: string };

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
 * The answer, in the shop's voice.
 *
 * Empty means the chat should not try: no runs and no cars is a shop that
 * is shut, and that is a sentence about the shop rather than about a day.
 */
export function sayWhen(args: {
  asked: DayAsked;
  runs: RunOnOffer[];
  cars: CarOnOffer[];
  today: string;
}): string {
  const { asked, runs, cars, today } = args;
  if (asked === null) return "";
  if (runs.length === 0 && cars.length === 0) return "";

  const soonest = [...runs].sort((a, b) => a.runDate.localeCompare(b.runDate))[0];

  if (asked === "next") {
    if (!soonest) {
      return "No run is going just now, but a car of its own can still come. Pick a day at the checkout and it prices it for you.";
    }
    const also =
      cars.some((car) => car.date < soonest.runDate)
        ? " Sooner than that, a car of its own can come, which costs more because nobody else is sharing it."
        : "";
    return `Our next run is ${soonest.said}, ${lower(soonest.window)}. Orders close ${soonest.closes}.${also}`;
  }

  const date =
    asked === "today"
      ? today
      : asked === "tomorrow"
        ? dayAfter(today)
        : nextOn(asked.weekday, today);
  if (date === "") return "";

  const word =
    asked === "today"
      ? "today"
      : asked === "tomorrow"
        ? "tomorrow"
        : onThat(date, today);

  const run = runs.find((one) => one.runDate === date);
  if (run) {
    return `Yes. There is a run ${word}, ${lower(run.window)}, and orders close ${run.closes}.`;
  }

  if (cars.some((car) => car.date === date)) {
    return `Yes, ${word}. No run is going that day, so it comes on a car of its own, which costs more because nobody else is sharing it. Pick the day at the checkout and it prices it for you.`;
  }

  // Nothing that day. The next thing that is going beats a flat no.
  const after = [...runs]
    .filter((one) => one.runDate > date)
    .sort((a, b) => a.runDate.localeCompare(b.runDate))[0];
  if (after) {
    return `Not ${word}, sorry. The next run is ${after.said}, ${lower(after.window)}.`;
  }
  if (soonest) {
    return `Not ${word}, sorry. The next run is ${soonest.said}, ${lower(soonest.window)}.`;
  }
  return `Not ${word}, sorry.`;
}

/** "on Saturday", for a weekday further out than tomorrow. */
function onThat(date: string, today: string): string {
  const on = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(on.getTime())) return "then";
  const name = WEEKDAYS[on.getUTCDay()];
  const said = name.charAt(0).toUpperCase() + name.slice(1);
  return date === today ? "today" : `on ${said}`;
}

/** A window said inside a sentence, where a capital letter mid sentence is
 *  the tell that a label has been dropped in without being read. */
function lower(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
