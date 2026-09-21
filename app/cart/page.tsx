import CartView from "@/components/CartView";
import ShelfNote from "@/components/ShelfNote";
import { allAreas, areaOfEach, valueBandsOfEach } from "@/lib/areas-server";
import { dropLabel, nextDrop, skincareOn } from "@/lib/skincare";
import { openRestaurants } from "@/lib/menu";
import { hostelNames } from "@/lib/hostels";
import { liveOffers } from "@/lib/coupons";
import { openBatches } from "@/lib/batches";
import { activeBands, hoursByDay, safeSettings } from "@/lib/settings";
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

  const [restaurants, batches, settings] = await Promise.all([
    // The cart is where someone realises they forgot the drinks, so the
    // restaurants are right there rather than back through the home page.
    openRestaurants(),
    openBatches(),
    safeSettings(),
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

  return (
    <div className="space-y-4">
      {/* The other basket, which is its own order on its own day. Kept in
          sight here, because one you can only see from the shelf is one
          somebody leaves behind. */}
      {skincareOn(settings) && <ShelfNote when={dropLabel(nextDrop(settings).date)} />}
      <CartView
      restaurants={restaurants}
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
      areas={await allAreas()}
      areaOf={await areaOfEach()}
      valueBandsOf={await valueBandsOfEach()}
        startGroup={startGroup}
      />
    </div>
  );
}
