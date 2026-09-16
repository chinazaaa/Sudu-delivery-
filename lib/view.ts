import { SLOT_LABEL } from "./config";
import { clockLabel, runDateLabel, weekdayLabel } from "./time";
import type { OpenBatch } from "./batches";
import type { Batch } from "./types";

/** Plain shapes handed from server components to client components. */

export type MenuView = {
  restaurant: {
    id: string;
    name: string;
    closesAt: string;
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
    label: `${weekdayLabel(batch.run_date)} ${SLOT_LABEL[batch.slot]}`,
    cutOffISO: batch.cut_off_at,
    cutOffLabel: `${runDateLabel(batch.run_date)}, ${clockLabel(batch.cut_off_at)}`,
    deliveryWindow: batch.delivery_window_text,
    full: batch.full,
    flashFee: batch.flash_fee,
    flashReason: batch.flash_fee_reason,
  };
}
