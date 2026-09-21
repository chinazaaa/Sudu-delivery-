import { NextResponse } from "next/server";
import { openBatches } from "@/lib/batches";
import { menuView } from "@/lib/menu";
import { hostelNames } from "@/lib/hostels";
import { activeBands, hoursByDay, safeSettings, sameDayPricing } from "@/lib/settings";
import { dealsAt, offersByRestaurant } from "@/lib/coupons";
import { offerBadge, offerLine } from "@/lib/offers";
import { deliverySlots, slotsWorthOffering } from "@/lib/same-day";
import { serialiseBands } from "@/lib/fees";
import { toBatchView } from "@/lib/view";
import { allAreas, areaOfEach } from "@/lib/areas-server";

export const dynamic = "force-dynamic";

/**
 * Everything the app needs to draw a shop: the menus, the runs still taking
 * orders, and what delivery costs.
 *
 * The app reads through here rather than talking to the database itself. A
 * phone cannot be trusted with a key that can read every customer, and the
 * rules about what a thing costs belong in one place.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const [menu, batches, bands, settings, hostels] = await Promise.all([
      menuView(),
      openBatches(),
      activeBands(),
      safeSettings(),
      // The app asked people to type their block, and a typed block is
      // misspelt often enough to make a run sheet impossible to sort.
      hostelNames(),
    ]);

    // The times somebody can actually ask for, worked out on the shop's clock
    // rather than the phone's, exactly as the website works them out. Empty
    // when same day is switched off, which is the app's signal to offer runs
    // alone rather than a second way to say the same thing.
    const pricing = await sameDayPricing();
    const slots =
      settings.same_day_on === "on"
        ? slotsWorthOffering(
            deliverySlots(new Date(), await hoursByDay()),
            batches.map((one) => ({
              run_date: one.run_date,
              window: one.delivery_window_text,
            }))
          )
        : [];

    // What is on at each kitchen, said the way the site says it: a few words
    // for the card, a sentence for the top of the menu, and the whole list
    // for the drawer. The app was quoting a band fee on food a promotion was
    // about to price, which is a number nobody was going to be charged.
    const offers = await offersByRestaurant();
    const deals = await Promise.all(
      menu.map(async (place) => ({
        restaurantId: place.restaurant.id,
        badge: offers.has(place.restaurant.id)
          ? offerBadge(offers.get(place.restaurant.id)!)
          : "",
        line: offers.has(place.restaurant.id)
          ? offerLine(offers.get(place.restaurant.id)!)
          : "",
        deals: await dealsAt(place.restaurant.id, place.restaurant.name),
      }))
    );

    return NextResponse.json({
      menu,
      hostels,
      sameDay: {
        slots,
        bands: JSON.parse(serialiseBands(pricing.bands)) as {
          maxItems: number | null;
          fee: number;
        }[],
        urgentExtra: pricing.urgentExtra,
      },
      runs: batches.map(toBatchView),
      // Keyed by restaurant, so the app can look one up without walking a
      // list on every card it draws.
      offers: Object.fromEntries(
        deals
          .filter((one) => one.badge !== "" || one.deals.length > 0)
          .map((one) => [one.restaurantId, { badge: one.badge, line: one.line, deals: one.deals }])
      ),
      bands: bands.map((band) => ({
        maxItems: Number.isFinite(band.maxItems) ? band.maxItems : null,
        fee: band.fee,
      })),
      // Where each kitchen is, and what that adds. The app prices by the
      // furthest thing in the cart exactly as the website does, because a
      // fee quoted on a phone and charged on the server has to be one
      // number. Empty means one area, and every price as it was.
      areas: await allAreas(),
      areaOf: await areaOfEach(),
      shop: {
        tagline: settings.tagline,
        ribbon: settings.ribbon_text,
        whatsapp: settings.whatsapp_number,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not read the menu." },
      { status: 503 }
    );
  }
}
