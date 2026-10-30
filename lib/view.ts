import { SLOT_LABEL, type BatchSlot } from "./config";
import { clockLabel, dayWord, runDateLabel } from "./time";
import { aroundPhrase } from "./same-day";
import type { OpenBatch } from "./batches";
import type { Batch } from "./types";

/** Plain shapes handed from server components to client components. */

export type MenuView = {
  restaurant: {
    id: string;
    /** What a link says. Falls back to the id, so a database without the
     *  column still produces links that work. */
    href: string;
    name: string;
    logoUrl: string;
    bannerUrl: string;
    brandHex: string;
    /** "Closed Saturdays and Sundays", or empty where it opens every day. */
    closedDays: string;
    /** The drawing the shop picked for this counter, where it picked one.
     *  Empty means the one guessed off its name, which is right for a
     *  kitchen whose name says what it sells and useless for one that
     *  does not. */
    drawing: string;
    /** Which area it sits in, as a row holds it. Empty is the home area.
     *  The name is looked up where the page is drawn, because the names
     *  are the shop's to change in admin. */
    areaId: string;
  };
  /** The shop's aisle is carried alongside each kitchen's own word for a
   *  section, so a page can tell a pot of sauce from a pizza without
   *  reading either of their names. */
  categories: { id: string; name: string; aisle?: string }[];
  items: ItemView[];
};

export type ItemView = {
  id: string;
  /** The half of its link anybody can read, falling back to the id where
   *  there is no name to use. Same shape as a restaurant's href, for the
   *  same reason. */
  href: string;
  name: string;
  price: number;
  available: boolean;
  imageUrl: string;
  description: string;
  categoryId: string | null;
  /** How much of the car it takes, as a percentage of one container. */
  containerPct: number;
  /** How many have been ordered, all time, so the front page can show what
   *  people actually buy rather than what the shop would like them to. */
  orderedCount: number;
  /** Size, flavour, extras. An item with none of these adds in one tap. */
  groups: OptionGroupView[];
  /**
   * How many of those there are, where the groups themselves have been left
   * behind.
   *
   * The front page used to carry the whole menu into the browser so its
   * search box could read it: a thousand dishes and nearly four thousand
   * choices, about a megabyte of it, downloaded by everybody who opened the
   * shop whether or not they searched for anything. The choices are the
   * bulk of that and nobody needs them until they tap a dish, so the page
   * sends this number instead and fetches the choices then.
   *
   * Absent means the groups are the whole truth, which is what every other
   * page sends.
   */
  choices?: number;
};

export type OptionGroupView = {
  id: string;
  name: string;
  required: boolean;
  maxSelect: number;
  /** Halves of one thing rather than extras on it, so the line is charged
   *  the dearer of them and never both added together. */
  dearest?: boolean;
  options: {
    id: string;
    name: string;
    priceDelta: number;
    /** What this choice adds at the counter, where somebody has read it
     *  off a board. Nought means nobody has, and the run sheet takes the
     *  shop's markup off what it sells for instead. */
    priceCost?: number;
    available: boolean;
    /** The item on the menu this choice really is, with its own prices, so
     *  half a pizza is worth what that pizza is worth today. */
    asItem?: { base: number; delta: Record<string, number> } | null;
    /** That item's name, for admin to say what this choice is tied to. */
    asItemName?: string;
  }[];
};

export type BatchView = {
  id: string;
  label: string;
  /** The areas this run covers, as "|lekki|". Empty is Sangotedo only. */
  areas: string;
  /** The only counters this run stops at. Empty means all of them. */
  onlyPlaces: string;
  /** The day it delivers, so a page can tell a run going today from one
   *  going tomorrow without reading the label. */
  runDate: string;
  /** A batch whose cut-off has passed: shown, but not orderable. */
  closed?: boolean;
  /** A run that has closed but has not been shopped yet. Still orderable,
   *  from the counters it has not been to, at a car's fee rather than a
   *  run's, and with a clock on it. See lib/last-minute.ts. */
  lastMinute?: boolean;
  cutOffISO: string;
  cutOffLabel: string;
  deliveryWindow: string;
  full: boolean;
  flashFee: number | null;
  flashReason: string;
};

export type BatchFee = {
  /** Set when this batch is running a flash drop (addendum §4). */
  flashFee: number | null;
  flashReason: string;
};

/** An order this phone already has in this batch, for "add to my order". */
export type ExistingOrderView = {
  batchLabel: string;
  items: number;
  feeCharged: number;
};

/** A closed batch, kept in the list so a late arrival can see what they missed. */
export function toClosedBatchView(batch: Batch): BatchView {
  return { ...toBatchView({ ...batch, order_count: 0, full: false }), closed: true };
}

/** One place that turns a batch row into what the selector renders. */
export function toBatchView(batch: OpenBatch): BatchView {
  return {
    id: batch.id,
    // The date is part of the label: two runs can be open at once, and
    // "Friday night" does not say which Friday in exam week. Near days are
    // said in words though, because "Sunday, 20 Sep" on the twentieth makes
    // somebody work out whether that is now.
    label: `${dayWord(batch.run_date)} · ${SLOT_LABEL[batch.slot]}`,
    // Where this car goes beyond Sangotedo. A run that was never going to
    // Lekki cannot carry a Lekki order, and the checkout has to know that
    // before somebody picks it rather than after.
    areas: batch.areas ?? "",
    // A run kept to one or two counters. The checkout has to know before
    // somebody picks it, the same as with the areas above.
    onlyPlaces: batch.only_places ?? "",
    runDate: batch.run_date,
    cutOffISO: batch.cut_off_at,
    cutOffLabel: `${dayWord(batch.run_date)}, ${clockLabel(batch.cut_off_at)}`,
    deliveryWindow: batch.delivery_window_text,
    full: batch.full,
    lastMinute: batch.lastMinute === true,
    flashFee: batch.flash_fee,
    flashReason: batch.flash_fee_reason,
  };
}

/**
 * What a car actually is, said the way somebody would say it.
 *
 * Every batch carries a slot because the column demands one, and a car going
 * out for one person at a time they chose was being labelled by it: an order
 * placed for four o'clock on a Monday read as "Monday, 21 Sept · night run",
 * which is a run that does not exist and never did. Anybody reading that goes
 * looking for a car that is not on the schedule.
 *
 * So the slot is only the answer for a run, which is the only kind of car it
 * was ever about.
 */
export function carLabel(batch: {
  kind?: string | null;
  run_date: string;
  slot: BatchSlot;
  deliver_at?: string | null;
  delivery_window_text?: string;
}): string {
  const kind = batch.kind ?? "run";

  if (kind === "same_day") {
    // The time it was asked for, which is the whole of what makes it its
    // own car. Said as an estimate, because that is what it is.
    return batch.deliver_at
      ? `A car of its own · ${aroundPhrase(batch.deliver_at)}, ${runDateLabel(batch.run_date)}`
      : `A car of its own · ${runDateLabel(batch.run_date)}`;
  }

  if (kind === "skincare") {
    return `Skincare · ${runDateLabel(batch.run_date)}`;
  }

  if (kind === "parcel") {
    // A parcel has no day until the shop has agreed one, and the day it was
    // placed is not that day: "today · afternoon" read as a promise to carry
    // it this afternoon, which nobody had agreed to.
    return batch.deliver_at
      ? `Parcel · ${runDateLabel(batch.run_date)}`
      : "Parcel · waiting on a date";
  }

  return `${runDateLabel(batch.run_date)} · ${SLOT_LABEL[batch.slot]}`;
}
