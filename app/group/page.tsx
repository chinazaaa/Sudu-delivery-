import GroupHub from "@/components/GroupHub";
import { openBatches } from "@/lib/batches";
import { activeBands, hoursByDay, safeSettings, sameDayPricing } from "@/lib/settings";
import { deliverySlots } from "@/lib/same-day";
import { toBatchView } from "@/lib/view";

export const dynamic = "force-dynamic";

/**
 * Ordering together, on its own page.
 *
 * The tab for this used to point at the cart with a flag on the end, which
 * meant the one thing the shop is built around lived inside a page about
 * something else: no address of its own, nothing to send anybody, and after
 * a group closed there was nowhere that said so. This is that page.
 */
export default async function GroupPage() {
  const [batches, settings] = await Promise.all([openBatches(), safeSettings()]);
  const [slots, pricing, bands] = await Promise.all([
    settings.same_day_on === "on"
      ? hoursByDay().then((hours) => deliverySlots(new Date(), hours))
      : Promise.resolve([]),
    sameDayPricing(),
    activeBands(),
  ]);

  return (
    <GroupHub
      runs={batches
        .slice(0, 4)
        .map(toBatchView)
        .filter((view) => !view.closed && !view.full)
        .map((view) => ({ id: view.id, label: view.label }))}
      slots={slots}
      sameDayFrom={pricing.bands[0]?.fee ?? 6500}
      runFrom={bands[0]?.fee ?? 4000}
    />
  );
}
