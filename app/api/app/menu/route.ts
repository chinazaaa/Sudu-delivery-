import { NextResponse } from "next/server";
import { openBatches } from "@/lib/batches";
import { menuView } from "@/lib/menu";
import { hostelNames } from "@/lib/hostels";
import { activeBands, hoursByDay, safeSettings, sameDayPricing } from "@/lib/settings";
import { deliverySlots } from "@/lib/same-day";
import { serialiseBands } from "@/lib/fees";
import { toBatchView } from "@/lib/view";

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
      settings.same_day_on === "on" ? deliverySlots(new Date(), await hoursByDay()) : [];

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
      bands: bands.map((band) => ({
        maxItems: Number.isFinite(band.maxItems) ? band.maxItems : null,
        fee: band.fee,
      })),
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
