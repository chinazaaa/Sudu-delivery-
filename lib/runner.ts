import { randomBytes } from "crypto";

import type { CounterGroup } from "./admin";
import { naira } from "./money";

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
 * The message a counter gets before the car leaves.
 *
 * This is the whole point of sending anything ahead. Standing at a counter
 * reading six lines off a phone and then waiting for them to be cooked is
 * most of a run; sending the same six lines forty minutes earlier turns
 * the stop into a collection.
 *
 * Written as a person would write it, because a person reads it. No
 * prices: what the shop expects to pay is the shop's business and quoting
 * it back at a counter invites an argument about a figure nobody at that
 * counter quoted. The expected total is on the driver's sheet instead,
 * where it is used to check the card.
 */
export function counterMessage(
  group: CounterGroup,
  when: { shopName: string; collectingAt: string }
): string {
  const lines = group.lines.map((line) => {
    const choices = line.choices.length > 0 ? ` (${line.choices.join(", ")})` : "";
    return `${line.qty} x ${line.name}${choices}`;
  });

  const head =
    when.collectingAt.trim() === ""
      ? `Good afternoon, this is ${when.shopName}. Please can we order the following for collection:`
      : `Good afternoon, this is ${when.shopName}. Please can we order the following for collection around ${when.collectingAt}:`;

  return [head, "", ...lines, "", "We will pay by card on collection. Thank you."].join("\n");
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
