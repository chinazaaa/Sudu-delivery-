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
  };
  categories: { id: string; name: string }[];
  items: ItemView[];
};

export type ItemView = {
  id: string;
  name: string;
  price: number;
  available: boolean;
  imageUrl: string;
  description: string;
  categoryId: string | null;
  /** How much of the car it takes, as a percentage of one container. */
  containerPct: number;
  /** Size, flavour, extras. An item with none of these adds in one tap. */
  groups: OptionGroupView[];
};

export type OptionGroupView = {
  id: string;
  name: string;
  required: boolean;
  maxSelect: number;
  options: { id: string; name: string; priceDelta: number; available: boolean }[];
};

export type BatchView = {
  id: string;
  label: string;
  /** The areas this run covers, as "|lekki|". Empty is Sangotedo only. */
  areas: string;
  /** The day it delivers, so a page can tell a run going today from one
   *  going tomorrow without reading the label. */
  runDate: string;
  /** A batch whose cut-off has passed: shown, but not orderable. */
  closed?: boolean;
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
    runDate: batch.run_date,
    cutOffISO: batch.cut_off_at,
    cutOffLabel: `${dayWord(batch.run_date)}, ${clockLabel(batch.cut_off_at)}`,
    deliveryWindow: batch.delivery_window_text,
    full: batch.full,
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

  return `${runDateLabel(batch.run_date)} · ${SLOT_LABEL[batch.slot]}`;
}
