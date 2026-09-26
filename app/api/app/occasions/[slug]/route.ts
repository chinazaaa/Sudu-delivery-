import { NextResponse } from "next/server";
import { furthest, soonestStandard } from "@/lib/box-day";
import { SYMBOL, moniesOn, rateFor } from "@/lib/abroad";
import { safeSettings } from "@/lib/settings";

import { boxesOf, isTimed, occasionBySlug } from "@/lib/boxes";
import { boxViews, whenOptions } from "@/lib/box-view";
import { hostelNames } from "@/lib/hostels";
import { namedPromoters } from "@/lib/promoters";
import { ESTIMATE_NOTE } from "@/lib/arrival";

export const dynamic = "force-dynamic";

/**
 * One occasion, with every box drawn out and every car it could ride.
 *
 * Priced here, off the menu as it is right now, exactly as the website
 * prices it. The phone is told what things cost; it never works it out,
 * so an app a version behind cannot quote last week's prices.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  try {
    const occasion = await occasionBySlug((await params).slug);
    if (!occasion || !occasion.active) {
      return NextResponse.json({ error: "That is not on any more." }, { status: 404 });
    }

    const boxes = await boxesOf(occasion.id);
    // Every box on one occasion rides the same cars, so this is asked once
    // rather than per box.
    const cars = boxes.length > 0 ? whenOptions(occasion, boxes[0]) : Promise.resolve([]);

    const settings = await safeSettings();
    const [views, when, hostels, promoters] = await Promise.all([
      boxViews(boxes).catch(() => []),
      cars.catch(() => []),
      hostelNames().catch(() => [] as string[]),
      namedPromoters().catch(() => [] as { code: string; name: string }[]),
    ]);

    return NextResponse.json({
      occasion: {
        slug: occasion.slug,
        name: occasion.name,
        blurb: occasion.blurb,
        happensAt: isTimed(occasion) ? occasion.happens_at : null,
        whenWord: occasion.when_word,
        kind: occasion.kind,
        image: occasion.image_url,
        // The example in the changes box, in this shelf's own words.
        hint: occasion.custom_hint,
      },
      // A collection is asked for on a day rather than put on a run, so the
      // phone needs the same two dates the website works out on the server:
      // the soonest it can be packed for, and as far ahead as anything is
      // planned. A phone's own clock is anybody's guess.
      day: {
        soonest: soonestStandard(),
        latest: furthest(),
        timed: isTimed(occasion),
      },
      // What a card link can be made out in, for somebody abroad paying.
      monies: moniesOn(settings).map((code) => ({
        code,
        label: code === "GBP" ? "Pounds" : "Dollars",
        symbol: SYMBOL[code],
        rate: rateFor(settings, code),
      })),
      boxes: views.filter((one) => !one.isExtra),
      when,
      hostels,
      promoters: promoters.map((one) => ({ code: one.code, name: one.name })),
      note: ESTIMATE_NOTE,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not read that." },
      { status: 500 }
    );
  }
}
