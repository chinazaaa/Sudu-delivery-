import GroupHub from "@/components/GroupHub";
import { openBatches } from "@/lib/batches";
import { hoursByDay, safeSettings } from "@/lib/settings";
import { deliverySlots, slotsWorthOffering } from "@/lib/same-day";
import { toBatchView } from "@/lib/view";
import { runArrival } from "@/lib/arrival";
import { lagosToday } from "@/lib/time";

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
  const [slots] = await Promise.all([
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
  ]);

  return (
    <GroupHub
      runs={batches
        .slice(0, 4)
        .map(toBatchView)
        .filter((view) => !view.closed && !view.full)
        .map(runArrival)}
      slots={slots}
      today={lagosToday()}
    />
  );
}
