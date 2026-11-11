import { NextResponse } from "next/server";
import { aisleTiles, moreTiles } from "@/lib/aisle-tiles";
import { arrivalShort } from "@/lib/arrival-short";
import { nextArrival, runArrival } from "@/lib/arrival";
import { carsOnOffer, openBatches } from "@/lib/batches";
import { deliverySlots, slotsWorthOffering } from "@/lib/same-day";
import { hoursByDay, safeSettings, whatsappLink } from "@/lib/settings";
import { lagosToday } from "@/lib/time";
import { toBatchView } from "@/lib/view";

export const dynamic = "force-dynamic";

/**
 * The front of the app: the tiles to start from, the row under them, and
 * when something ordered now would land.
 *
 * The same pieces the website's front page is built from, so the two cannot
 * say different things. Anything that cannot be read comes back empty rather
 * than as an error: the app draws the rest of its home without it.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const [settings, batches, starters, more] = await Promise.all([
      safeSettings(),
      openBatches(),
      aisleTiles(),
      moreTiles(),
    ]);

    // The one rule the front page and the checkout share, asked the same way.
    const slots =
      settings.same_day_on === "on"
        ? await carsOnOffer(
            slotsWorthOffering(
              deliverySlots(new Date(), await hoursByDay()),
              batches.map((one) => ({
                run_date: one.run_date,
                window: one.delivery_window_text,
              }))
            )
          )
        : [];
    const runs = batches
      .map(toBatchView)
      .filter((one) => !one.closed && !one.full)
      .map(runArrival);
    const decided = nextArrival(runs, slots, lagosToday());

    const tile = (one: { aisle: string; from: number; image: string }) => ({
      label: one.aisle,
      from: one.from,
      image: one.image,
    });

    return NextResponse.json({
      tiles: starters.map(tile),
      more: more.map(tile),
      arriving: decided?.said ? arrivalShort(decided.said) : "",
      whatsapp:
        whatsappLink(settings.whatsapp_number, "Hi Sudu, I'm not sure what to order") ?? "",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not read the home screen." },
      { status: 503 }
    );
  }
}
