import CartView from "@/components/CartView";
import IceInCart from "@/components/IceInCart";
import { iceForCart } from "@/lib/ice-server";
import HelpLine from "@/components/HelpLine";
import ShelfNote from "@/components/ShelfNote";
import {
  allAreas,
  allAreaPairs,
  areaOfEach,
  stepFeeOfEach,
  valueBandsOfEach,
  openDaysOfEach,
} from "@/lib/areas-server";
import { dropLabel, nextDrop, skincareOn } from "@/lib/skincare";
import { nextDrop as nextPharmacyDrop, pharmacyOn } from "@/lib/pharmacy";
import { livePrices } from "@/lib/menu";
import Reprice from "@/components/Reprice";
import { hostelNames } from "@/lib/hostels";
import { liveOffers } from "@/lib/coupons";
import { openBatches } from "@/lib/batches";
import { activeBands, hoursByDay, safeSettings, sameDayPricing } from "@/lib/settings";
import { deliverySlots, slotsWorthOffering } from "@/lib/same-day";
import { toBatchView } from "@/lib/view";
import { runArrival } from "@/lib/arrival";
import { lagosToday } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  // Arriving from "Ordering with friends?" on the home page. They have already
  // said what they want; asking again on this page was the same button twice.
  const startGroup = (await searchParams).start === "1";

  // The counter list used to be read here for a card of chips at the bottom
  // of the cart, one per shop. That card is a single line now, so the query
  // that fed it goes with it.
  const [batches, settings, { ice, needsIce }] = await Promise.all([
    openBatches(),
    safeSettings(),
    iceForCart(),
  ]);

  const [slots, bands] = await Promise.all([
    // Worked out here so the clock is the shop's rather than the phone's, and
    // so a page left open all morning cannot offer a time that has gone.
    settings.same_day_on === "on"
      ? hoursByDay().then((hours) =>
          slotsWorthOffering(
            deliverySlots(new Date(), hours),
            batches.map((one) => ({
              run_date: one.run_date,
              window: one.delivery_window_text,
            }))
          )
        )
      : Promise.resolve([]),
    activeBands(),
  ]);

  // What everything costs now, so a basket left open for a week is put back
  // in step before anybody reads a number off it.
  const prices = await livePrices();

  return (
    <div className="space-y-4">
      <Reprice itemPrice={prices.item} optionDelta={prices.option} half={prices.half} />
      {/* The other basket, which is its own order on its own day. Kept in
          sight here, because one you can only see from the shelf is one
          somebody leaves behind. */}
      {skincareOn(settings) && <ShelfNote when={dropLabel(nextDrop(settings).date)} />}
      {pharmacyOn(settings) && (
        <ShelfNote
          when={dropLabel(nextPharmacyDrop(settings).date)}
          counter="pharmacy"
          what="pharmacy"
          href="/pharmacy/checkout"
        />
      )}
      {/* The bag of ice block, put in by the shop wherever the cart is
          read, so the figure here and the figure on the bill are one
          figure. See components/IceInCart.tsx. */}
      <IceInCart ice={ice} needsIce={needsIce} />
      <CartView
      iceItemId={ice?.itemId ?? ""}
      runs={batches
        .slice(0, 4)
        .map(toBatchView)
        .filter((view) => !view.closed && !view.full)
        .map(runArrival)}
      slots={slots}
      today={lagosToday()}
      hostels={await hostelNames()}
      // What is on today, so the cart can say when it is one thing away from
      // an offer rather than leaving somebody to wonder why it is not free.
      offers={await liveOffers()}
      nextRunId={batches[0]?.id ?? ""}
      bands={bands}
      // The cart has to price the way the checkout will. Whatever is going
      // soonest decides it, and when that is a car of its own the container
      // ladder is the wrong list.
      sameDayBands={(await sameDayPricing()).bands}
      urgentExtra={(await sameDayPricing()).urgentExtra}
      areas={await allAreas()}
      areaPairs={await allAreaPairs()}
      areaOf={await areaOfEach()}
      valueBandsOf={await valueBandsOfEach()}
      stepFeeOf={await stepFeeOfEach()}
      openDaysOf={await openDaysOfEach()}
        startGroup={startGroup}
      />
      <HelpLine number={settings.whatsapp_number} about="my cart" page="Cart" />
    </div>
  );
}
