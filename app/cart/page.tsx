import CartView from "@/components/CartView";
import { openRestaurants } from "@/lib/menu";
import { hostelNames } from "@/lib/hostels";
import { openBatches } from "@/lib/batches";
import { activeBands, deliveryHours, safeSettings, sameDayPricing } from "@/lib/settings";
import { deliverySlots } from "@/lib/same-day";
import { toBatchView } from "@/lib/view";

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

  const [slots, pricing, bands] = await Promise.all([
    // Worked out here so the clock is the shop's rather than the phone's, and
    // so a page left open all morning cannot offer a time that has gone.
    settings.same_day_on === "on"
      ? deliveryHours().then((hours) => deliverySlots(new Date(), hours))
      : Promise.resolve([]),
    sameDayPricing(),
    activeBands(),
  ]);

  return (
    <CartView
      restaurants={restaurants}
      runs={batches
        .slice(0, 4)
        .map(toBatchView)
        .filter((view) => !view.closed && !view.full)
        .map((view) => ({ id: view.id, label: view.label }))}
      slots={slots}
      sameDayFrom={pricing.bands[0]?.fee ?? 6500}
      runFrom={bands[0]?.fee ?? 4000}
      hostels={await hostelNames()}
      bands={bands}
      startGroup={startGroup}
    />
  );
}
