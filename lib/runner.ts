import { STAGES } from "./stages";
import { saidPicksLine } from "./picks";
import { randomBytes } from "crypto";

import type { CounterGroup } from "./admin";
import { naira } from "./money";
import { inWords } from "./counts";

/**
 * The run as whoever drives it sees it.
 *
 * The sheet behind the admin login is already the right shape: one counter
 * at a time, what to collect, who it goes to. What it is not is safe to
 * hand to somebody who is not trusted with the shop, because it is the
 * shop. This is the same night with everything that is not the night taken
 * out: no money, no other run, nobody who did not order on this one.
 *
 * The rules live here rather than in the page so they can be read in one
 * go and tested without a database. A page that decides for itself whether
 * a link has expired is a page that will one day decide wrongly on a
 * Saturday evening with a car already on the road.
 */

/** Long enough that guessing one is not a way in, short enough to paste. */
export function newRunnerToken(): string {
  return randomBytes(16).toString("base64url");
}

/**
 * Whether a link still opens the run it belongs to.
 *
 * Settled is the end of a run: the books are closed, the money is counted
 * and there is nothing left for a driver to do. A link that outlives that
 * is a copy of a night's names and numbers sitting in somebody's messages
 * for as long as they keep it, which is the one thing a link like this
 * must not become.
 *
 * Cleared beats everything. Taking a token off a run is how the shop says
 * "not that person, not any more", and it has to work while the run is
 * still live, which is exactly when it matters.
 */
export function stillDriving(
  batch:
    | { runner_token?: string | null; settled_at: string | null }
    | null
    | undefined
): boolean {
  if (!batch) return false;
  const token = String(batch.runner_token ?? "").trim();
  if (token === "") return false;
  return batch.settled_at === null;
}

/*
 * Counters already collected from, in the pipe wrapped shape the run
 * already uses for areas and only_places.
 *
 * Wrapped on both sides so a name can be looked for with its own bars
 * around it: without them "KFC" matches "KFC Express" and a stop ticks
 * itself off while the food is still behind the counter.
 */

export function gotList(got: string | null | undefined): string[] {
  return String(got ?? "")
    .split("|")
    .map((one) => one.trim())
    .filter((one) => one !== "");
}

export function hasGot(got: string | null | undefined, restaurant: string): boolean {
  const name = restaurant.trim();
  if (name === "") return false;
  return gotList(got).some((one) => one.toLowerCase() === name.toLowerCase());
}

/**
 * Tick a stop off, or put it back.
 *
 * Putting it back is not an afterthought. The common mistake on a phone in
 * a car park is ticking the stop you are standing in front of rather than
 * the one you just left, and a sheet that cannot be corrected gets ignored
 * instead.
 */
export function withGot(
  got: string | null | undefined,
  restaurant: string,
  collected: boolean
): string {
  const name = restaurant.trim();
  if (name === "") return String(got ?? "");

  const kept = gotList(got).filter((one) => one.toLowerCase() !== name.toLowerCase());
  if (collected) kept.push(name);
  return kept.length === 0 ? "" : `|${kept.join("|")}|`;
}

/**
 * What makes two orders of the same thing one line at a counter.
 *
 * Lives here, next to the only other thing that needs it, rather than
 * inside the grouping it came from. "Who ordered this line" has to ask the
 * question in exactly the words the grouping asked it: a second copy of
 * "name, choices and price" would agree for a month and then disagree over
 * a sorted array, and the failure is somebody ringing the wrong customer
 * from a counter.
 *
 * The choices are sorted because an order is a set of them, not a
 * sequence: a large hand-tossed and a hand-tossed large are one thing to
 * cook. The price is in the key because a thing that cost one person more
 * than another is two things to reconcile, whatever it is called.
 */
export function counterKey(line: {
  restaurant: string;
  name: string;
  choices: string[];
  unit_price_at_order: number;
}): string {
  const choices = [...line.choices].sort();
  return `${line.restaurant}|${line.name}|${choices.join("|")}@${line.unit_price_at_order}`;
}

/**
 * Who ordered each line, for the counter that has run out of it.
 *
 * About one stop in ten ends with "we don't have that". The question then
 * is not "call somebody", it is "which of these three people ordered the
 * thing that is gone", and the sheet is the only place that knows: a
 * counter line is grouped across orders precisely so it can be read out at
 * a till, which is exactly what makes it useless for ringing anybody.
 *
 * Keyed the same way the grouping keys them, so a line on screen and its
 * buyers are the same line by construction rather than by agreement.
 */
export type Buyer = { name: string; phone: string; qty: number; forName: string };

export function whoOrdered(
  bags: {
    name: string;
    phone: string;
    lines: {
      restaurant: string;
      name: string;
      choices: string[];
      unit_price_at_order: number;
      qty: number;
      for_name?: string | null;
    }[];
  }[]
): Record<string, Buyer[]> {
  const buyers: Record<string, Buyer[]> = {};

  for (const bag of bags) {
    for (const line of bag.lines) {
      const key = counterKey(line);
      const forName = String(line.for_name ?? "").trim();
      const here = buyers[key] ?? [];

      // One person ordering the same thing twice in one bag is one person
      // to ring, not two. Bought for somebody else keeps them apart,
      // because "Temi, for Ada" and "Temi" are different conversations.
      const already = here.find(
        (buyer) => buyer.phone === bag.phone && buyer.forName === forName
      );
      if (already) already.qty += line.qty;
      else here.push({ name: bag.name, phone: bag.phone, qty: line.qty, forName });

      buyers[key] = here;
    }
  }

  return buyers;
}

/**
 * How a counter takes an order before the car gets there.
 *
 * Not every kitchen is on WhatsApp. Some take a call, some have a number
 * printed on a banner that nobody watches, and some are only ever ordered
 * at the counter. Sending tonight's list into an inbox nobody reads is
 * worse than not sending it: the stop is then a wait for food that was
 * never started, by somebody who thinks it was.
 *
 * So the shop says which, per counter, and nothing is guessed. The one
 * case that is not a guess is "nobody has said yet": a counter with a
 * number is offered both ways until somebody knows which works, because
 * offering both is honest about not knowing and offering neither throws
 * away a number that is probably good.
 */
export type AheadWay = "whatsapp" | "call" | "both" | "none";

export function howToOrderAhead(
  counter: { phone?: string | null; orders_ahead?: string | null } | undefined
): AheadWay {
  const number = String(counter?.phone ?? "").trim();
  const said = String(counter?.orders_ahead ?? "").trim().toLowerCase();

  // Only ever ordered at the counter. Said, so it is not asked again every
  // run by somebody wondering whether the number is missing.
  if (said === "no") return "none";
  if (number === "") return "none";
  if (said === "whatsapp") return "whatsapp";
  if (said === "call") return "call";
  return "both";
}

/**
 * The message a counter gets before the car leaves.
 *
 * This is the whole point of sending anything ahead. Standing at a counter
 * reading six lines off a phone and then waiting for them to be cooked is
 * most of a run; sending the same six lines forty minutes earlier turns
 * the stop into a collection, and the price comes back before anybody is
 * standing at a till.
 *
 * Short, because it is read by somebody with a kitchen to run. It asks the
 * one thing worth asking and says nothing about paying: how the shop
 * settles up is the shop's business, and a sentence about cards or
 * transfers in a message asking for a price is a sentence that invites a
 * conversation nobody wanted.
 *
 * No prices either. What the shop expects to pay invites an argument about
 * a figure nobody at that counter quoted; the expected total stays on the
 * driver's sheet where it is used to check the card.
 *
 * Sizes and choices are part of the name, not a note beside it. "Panarottis
 * Special" and "Panarottis Special Large" are two different things to cook,
 * and a kitchen reading the first one and guessing is the expensive way to
 * find that out.
 */
export function counterMessage(
  group: CounterGroup,
  when: { shopName: string }
): string {
  /*
   * The count twice where there is more than one.
   *
   * On a screen a count above one is drawn in colour, which a message has
   * no way of doing. A digit at the front of a line is the easiest thing
   * on it to skim past, and buying one of a thing somebody ordered two of
   * costs twice: the customer is short, and the shop hands back money it
   * already paid at the counter. A number and a word fail differently, so
   * whoever reads this has to miss both.
   */
  const lines = group.lines.map((line) => {
    // With the question each choice answers: a kitchen reading a bare
    // "Regular" has to guess which of its questions that was.
    const choices =
      line.choices.length > 0 ? ` ${saidPicksLine(line.picks, line.choices)}` : "";
    const many = line.qty > 1 ? ` (${inWords(line.qty).toUpperCase()})` : "";
    return `${line.qty} x ${line.name}${choices}${many}`;
  });

  return [
    `Good afternoon, this is ${when.shopName}. Please can we confirm the total for the following:`,
    "",
    ...lines,
    "",
    "Thank you.",
  ].join("\n");
}

/**
 * Who settles this counter, and therefore what the stop even is.
 *
 * The sheet assumed every stop ended at a card machine, because that is
 * what a stop used to be. Some counters take a transfer from the shop
 * before the car arrives, and at those the driver collects and leaves.
 * Telling her "the card should be 26,500" at a counter already paid is
 * worse than telling her nothing: she will stand there trying to pay it.
 *
 * Unsaid behaves as card, which is both the way it has always worked and
 * the safe way to be wrong. A driver who expected to pay and did not is
 * mildly surprised; a driver who expected the shop to have paid and finds
 * it has not is stuck at a counter with a bag she cannot take.
 */
export function paysAtCounter(
  counter: { pay_by?: string | null } | undefined
): boolean {
  return String(counter?.pay_by ?? "").trim().toLowerCase() !== "transfer";
}

/**
 * What the card should be charged at this stop.
 *
 * The one number the driver needs and the only money on the page. Every
 * other figure on a run sheet answers a question the shop asks afterwards;
 * this one answers the question asked at the counter, which is whether the
 * amount on the machine is the amount that was ordered.
 */
export function expectedAt(group: CounterGroup): string {
  return naira(group.expectedFoodTotal);
}

/**
 * How far through the night the run is.
 *
 * Counted rather than inferred from the run's stage, because the stage is
 * moved by the shop and this is moved by the person actually driving. A
 * sheet that claims the shopping is done while two stops are untouched is
 * worse than a sheet with no progress on it at all.
 */
export function runProgress(
  counters: { restaurant: string }[],
  got: string | null | undefined,
  bags: { orders: { status: string }[] }[]
): { stops: number; ofStops: number; dropped: number; ofBags: number; shopping: boolean } {
  const stops = counters.filter((one) => hasGot(got, one.restaurant)).length;
  const dropped = bags.filter((bag) =>
    bag.orders.every((order) => order.status === "delivered")
  ).length;

  return {
    stops,
    ofStops: counters.length,
    dropped,
    ofBags: bags.length,
    // Still shopping until every counter has been ticked. The drops are
    // the back half of the same night and the sheet leads with whichever
    // half is unfinished.
    shopping: counters.length > 0 && stops < counters.length,
  };
}

/**
 * Whether the buying part of the night is over.
 *
 * The run sheet kept offering "Save what the receipt said" and "Got
 * everything here" on a run that had already been delivered, which is the
 * page asking a question whose answer it is already holding. Worse than
 * useless: pressing either of them on a finished run writes to a run
 * nobody is driving.
 *
 * On the road is the line, not handed out. Once the car has left the last
 * counter every receipt that is going to exist exists, and the stops
 * behind it are history rather than work.
 */
export function buyingDone(stage: string): boolean {
  const at = STAGES.indexOf(stage as (typeof STAGES)[number]);
  return at >= STAGES.indexOf("on_the_road");
}
