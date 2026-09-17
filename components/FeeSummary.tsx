"use client";

import { bandFor, feeFor, nextBand, FEE_BANDS, type Band } from "@/lib/fees";
import { naira } from "@/lib/money";

/**
 * Delivery is priced by containers, so the cart has to show the count, the
 * fee it lands on, and how far the next step is. No surprises at checkout.
 */
export default function FeeSummary({
  itemCount,
  flashFee,
  alreadyCharged,
  bands = FEE_BANDS,
}: {
  itemCount: number;
  flashFee: number | null;
  /** Fee already paid on an earlier order in this batch, if adding to it. */
  alreadyCharged: number;
  bands?: Band[];
}) {
  const fee = Math.max(0, feeFor(itemCount, flashFee, bands) - alreadyCharged);
  const band = bandFor(Math.max(itemCount, 1), bands);
  const next = nextBand(Math.max(itemCount, 1), bands);
  const bandLabel =
    band.maxItems === Infinity
      ? `${bands[bands.length - 2].maxItems + 1}+ items`
      : `${itemCount} item${itemCount === 1 ? "" : "s"}`;

  return (
    <div className="text-sm text-muted">
      <p>
        Delivery {naira(fee)} for {bandLabel}
        {alreadyCharged > 0 && ", topping up what you already paid"}
      </p>
      {next && (
        <p>
          {next.itemsAway} more item{next.itemsAway === 1 ? "" : "s"} and delivery
          becomes {naira(feeFor(band.maxItems + 1, flashFee, bands))}.
        </p>
      )}
    </div>
  );
}
