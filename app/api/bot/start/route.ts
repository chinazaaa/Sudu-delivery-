import { NextResponse } from "next/server";

import { openBatches } from "@/lib/batches";
import { hostelNames } from "@/lib/hostels";
import { menuView } from "@/lib/menu";
import { activeBands, hoursByDay, safeSettings, sameDayPricing } from "@/lib/settings";
import { deliverySlots, slotsWorthOffering } from "@/lib/same-day";
import { headlineFee } from "@/lib/fees";
import { toBatchView } from "@/lib/view";
import { runDateLabel } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * What the chat needs before it can ask anything.
 *
 * The hostels, the runs still taking orders, the counters open today, and
 * what delivery starts at. Read here rather than in the browser, because a
 * page cannot be trusted with a key that reads every customer, and because
 * what a run costs is a thing this shop decides in one place.
 *
 * Nothing about a price is worked out here either. The fee goes up with how
 * much is in the car, so the only honest thing to say before anybody has
 * ordered is what it starts at. The bill says the rest, from the same till
 * that charges it.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const [hostels, batches, menu, settings, bands, hours, sameDay] = await Promise.all([
      hostelNames(),
      openBatches().catch(() => []),
      menuView().catch(() => []),
      safeSettings(),
      activeBands(),
      hoursByDay().catch(() => null),
      sameDayPricing().catch(() => null),
    ]);

    const runs = batches
      .filter((batch) => !batch.full)
      .map((batch) => {
        const view = toBatchView(batch);
        const day = new Date(`${batch.run_date}T00:00:00+01:00`);
        return {
          id: view.id,
          label: view.label,
          // The day in words, for the line the chat speaks: "our next run is
          // Friday" reads as a sentence, "Fri · Night" reads as a table.
          said: runDateLabel(batch.run_date),
          runDate: batch.run_date,
          window: view.deliveryWindow,
          closes: view.cutOffLabel,
          // For the little calendar block on the slot card.
          dow: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day.getDay()],
          dom: day.getDate(),
          areas: view.areas,
          onlyPlaces: view.onlyPlaces,
        };
      });

    const kitchens = menu
      .filter((place) => place.items.some((item) => item.available))
      .map((place) => ({
        id: place.restaurant.id,
        name: place.restaurant.name,
      }));

    /*
     * A car sent out for one order, where the shop is still offering them.
     *
     * Worked out by the same two functions the checkout uses, which is the
     * point: the hours the shop delivers are a setting somebody changes,
     * and a slot already covered by a scheduled run is not a thing to sell
     * twice. Order at six and the soonest car is tomorrow, and the chat
     * says tomorrow because it asked rather than because it guessed.
     */
    const cars =
      hours === null
        ? []
        : slotsWorthOffering(
            deliverySlots(new Date(), hours),
            batches.map((batch) => ({
              run_date: batch.run_date,
              window: batch.delivery_window_text,
            }))
          ).slice(0, 4).map((slot) => {
            const day = new Date(slot.at);
            return {
              at: slot.at,
              label: slot.label,
              phrase: slot.phrase,
              day: slot.day,
              date: slot.date,
              dow: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day.getDay()],
              dom: day.getDate(),
            };
          });

    return NextResponse.json({
      hostels,
      runs,
      cars,
      /** What a car of its own starts at, said as a floor like the rest. */
      carFrom: sameDay === null ? 0 : headlineFee(sameDay.bands),
      kitchens,
      // What delivery starts at, said as a floor rather than as the price.
      feeFrom: headlineFee(bands),
      whatsapp: String(settings.whatsapp_number ?? ""),
    });
  } catch {
    // A chat that cannot be opened is better than a page that breaks, and
    // the panel says so in its own words when the lists come back empty.
    return NextResponse.json({
      hostels: [],
      runs: [],
      cars: [],
      carFrom: 0,
      kitchens: [],
      feeFrom: 0,
      whatsapp: "",
    });
  }
}
