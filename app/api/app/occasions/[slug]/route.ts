import { NextResponse } from "next/server";
import { furthest, soonestStandard } from "@/lib/box-day";
import { SYMBOL, moniesOn, rateFor } from "@/lib/abroad";
import { safeSettings } from "@/lib/settings";

import { boxesOf, isTimed, occasionBySlug } from "@/lib/boxes";
import { boxViews, whenOptions, type BoxView } from "@/lib/box-view";
import { hostelNames } from "@/lib/hostels";
import { namedPromoters } from "@/lib/promoters";
import { ESTIMATE_NOTE } from "@/lib/arrival";
import { lagosToday, runDateLabel, weekdayLabel } from "@/lib/time";

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

    /*
     * The promise about price, folded into the words the app already draws.
     *
     * The app has no field for it and will not until it is built again, and
     * a hamper shelf that says nothing about December prices on a phone
     * while the website says it plainly is the shop contradicting itself.
     * The blurb is the one line under the shelf's name on both.
     */
    const holds = occasion.price_holds_until ?? null;
    const holdsLine =
      holds && holds.slice(0, 10) >= lagosToday()
        ? ` Today's price holds until ${weekdayLabel(holds.slice(0, 10))}, ${runDateLabel(
            holds.slice(0, 10)
          )}.`
        : "";

    /*
     * A package, written out rather than named.
     *
     * A box sold as one package carries a single hidden line pointing at a
     * product that is the package itself, so the app, which lists the
     * lines, drew one bullet reading "The Kitchen Hamper · Packages". The
     * contents are the thing somebody is reading the card to find. Done
     * here rather than waiting for the app to be built again: the shelf is
     * selling now.
     */
    const shown = views.map((one) =>
      one.contents.length === 0
        ? one
        : {
            ...one,
            lines: one.contents.map((said, at) => ({
              id: `c${at}`,
              name: said,
              restaurant: "",
              choices: [] as string[],
              qty: 1,
              total: 0,
              swaps: [] as BoxView["lines"][number]["swaps"],
            })),
          }
    );

    return NextResponse.json({
      occasion: {
        slug: occasion.slug,
        name: occasion.name,
        blurb: `${occasion.blurb}${holdsLine}`,
        happensAt: isTimed(occasion) ? occasion.happens_at : null,
        whenWord: occasion.when_word,
        kind: occasion.kind,
        image: occasion.image_url,
        // The example in the changes box, in this shelf's own words.
        hint: occasion.custom_hint,
        // For a build of the app that can draw these itself rather than
        // reading them out of the blurb: a shelf with a season of its own
        // takes no standing order, and the promise about price is a line
        // of its own.
        seasonal: occasion.starts_at !== null,
        priceHoldsUntil: occasion.price_holds_until ?? null,
        itemWord: occasion.item_word,
      },
      // A collection is asked for on a day rather than put on a run, so the
      // phone needs the same two dates the website works out on the server:
      // the soonest it can be packed for, and as far ahead as anything is
      // planned. A phone's own clock is anybody's guess.
      /*
       * A shelf with a season of its own starts inside it.
       *
       * The app was offering Thursday for a Christmas hamper, because this
       * answered with the soonest the shop can pack anything rather than
       * the soonest this shelf delivers. The website has read starts_at
       * since the shelf was made; this had not.
       */
      day: {
        soonest:
          occasion.starts_at &&
          occasion.starts_at.slice(0, 10) > soonestStandard()
            ? occasion.starts_at.slice(0, 10)
            : soonestStandard(),
        latest:
          occasion.starts_at && occasion.happens_at
            ? occasion.happens_at.slice(0, 10)
            : furthest(),
        // A shelf with a season picks a plain date inside it rather than
        // one of this week's runs, the same as on the website.
        timed: isTimed(occasion) && occasion.starts_at === null,
      },
      // What a card link can be made out in, for somebody abroad paying.
      monies: moniesOn(settings).map((code) => ({
        code,
        label: code === "GBP" ? "Pounds" : "Dollars",
        symbol: SYMBOL[code],
        rate: rateFor(settings, code),
      })),
      boxes: shown.filter((one) => !one.isExtra),
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
