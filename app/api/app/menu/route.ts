import { NextResponse } from "next/server";
import { openBatches, carsOnOffer } from "@/lib/batches";
import { iceForCart } from "@/lib/ice-server";
import { menuView } from "@/lib/menu";
import { hostelNames } from "@/lib/hostels";
import { namedPromoters } from "@/lib/promoters";
import {
  activeBands,
  googleLinks,
  hoursByDay,
  safeSettings,
  sameDayPricing,
} from "@/lib/settings";
import { dealsAt, offerNudge, offersByRestaurant, type Nudge } from "@/lib/coupons";
import { offerBadge, offerLine } from "@/lib/offers";
import { deliverySlots, slotsWorthOffering } from "@/lib/same-day";
import { serialiseBands } from "@/lib/fees";
import { toBatchView } from "@/lib/view";
import {
  allAreas,
  allAreaPairs,
  areaOfEach,
  stepFeeOfEach,
  valueBandsOfEach,
} from "@/lib/areas-server";
import { SYMBOL, moniesOn, rateFor } from "@/lib/abroad";
import { ERRANDS } from "@/lib/errands";
import { readDoors } from "@/lib/home-doors";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store";
import { liveRibbon } from "@/lib/ribbon";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Everything the app needs to draw a shop: the menus, the runs still taking
 * orders, and what delivery costs.
 *
 * The app reads through here rather than talking to the database itself. A
 * phone cannot be trusted with a key that can read every customer, and the
 * rules about what a thing costs belong in one place.
 */
/** A website address as the screen this app would open for it. */
function appRoute(href: string): string {
  const path = (href || "").trim();
  const shelf = path.match(/^\/(?:collections|occasions)\/([a-z0-9-]+)$/i);
  if (shelf) return `/collections/${shelf[1]}`;
  if (["/products", "/parcel", "/skincare", "/group", "/custom-order"].includes(path)) {
    return path === "/custom-order" ? "" : path;
  }
  return "";
}

/**
 * Today's offer, with its links pointing at screens this app has.
 *
 * The website's are written for the website: a counter is `/r/<slug>`
 * there and `/r/<id>` here, because the app holds the menu it was given
 * rather than asking for a page. A link whose id is really a slug matches
 * nothing and leaves the screen loading forever, so anything that cannot
 * be translated is dropped rather than shown.
 */
async function appNudge(): Promise<Nudge | null> {
  const nudge = await offerNudge().catch(() => null);
  if (!nudge) return null;

  const { data } = await db().from("restaurants").select("id, slug");
  const idOf = new Map<string, string>();
  for (const row of (data ?? []) as { id: string; slug: string | null }[]) {
    if (row.slug) idOf.set(row.slug, row.id);
    idOf.set(row.id, row.id);
  }

  const go = nudge.go.flatMap((one) => {
    const counter = one.href.match(/^\/r\/(.+)$/);
    if (!counter) return one.href === "/products" ? [one] : [];
    const id = idOf.get(counter[1]);
    return id ? [{ label: one.label, href: `/r/${id}` }] : [];
  });

  // Every door it had led nowhere this app can go. Better to say nothing
  // than to announce an offer with no way to take it.
  if (go.length === 0) return null;
  return { ...nudge, go };
}

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
    // The strip, checked against what it points at, so a banner for a match
    // that has been played takes itself down on the phone the same moment it
    // does on the website.
    /*
     * Everything else the home screen needs, asked for at once.
     *
     * These stood in a queue down the length of this function, and six of
     * them stood in a queue inside the object literal at the bottom, where
     * an await on one line waits for the await on the line above it. None
     * of them needs any of the others: where the kitchens are has nothing
     * to do with who is promoting, and neither has anything to do with the
     * strip at the top. On the one request the app makes before it can draw
     * anything, that was a dozen round trips end to end instead of one.
     */
    const [
      ribbon,
      pricing,
      dayHours,
      offers,
      areas,
      areaOf,
      areaPairs,
      valueBandsOf,
      stepFeeOf,
      promoters,
      nudge,
      iceFor,
    ] = await Promise.all([
      // The strip, checked against what it points at, so a banner for a
      // match that has been played takes itself down on the phone the same
      // moment it does on the website.
      liveRibbon(settings).catch(() => ({
        text: settings.ribbon_text,
        href: settings.ribbon_href,
      })),
      sameDayPricing(),
      hoursByDay(),
      offersByRestaurant(),
      allAreas(),
      areaOfEach(),
      allAreaPairs(),
      valueBandsOfEach(),
      stepFeeOfEach(),
      namedPromoters(),
      appNudge(),
      iceForCart(),
    ]);

    const slots =
      // The app offers exactly what the site offers, this rule included.
      settings.same_day_on === "on"
        ? await carsOnOffer(
            slotsWorthOffering(
              deliverySlots(new Date(), dayHours),
              batches.map((one) => ({
                run_date: one.run_date,
                window: one.delivery_window_text,
              }))
            )
          )
        : [];

    // What is on at each kitchen, said the way the site says it: a few words
    // for the card, a sentence for the top of the menu, and the whole list
    // for the drawer. The app was quoting a band fee on food a promotion was
    // about to price, which is a number nobody was going to be charged.
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
      /* The bag of ice block, and what needs one. The order puts it on
         whatever the phone says, so a phone that cannot see it quotes a
         total twelve hundred and fifty short of the bill. See lib/ice.ts. */
      ice: iceFor.ice,
      needsIce: iceFor.needsIce,
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
      areas,
      areaOf,
      areaPairs,
      // The kitchens that charge by what the shopping comes to rather than
      // by how many things it is. Without this the app prices a market
      // basket off the container ladder and quotes a number nobody is
      // charged, which is the one thing a checkout must never do.
      valueBandsOf,
      // The kitchens that price by the cool box rather than by the
      // container: something small that people buy a lot of, grabbed on the
      // way past rather than fetched. Without this the app prices fifteen
      // small ice creams as fifteen takeaway boxes and quotes a number
      // nobody is charged, which is the one thing a checkout must never do.
      stepFeeOf,
      // Who somebody could say they heard about the shop from. Empty means
      // nobody is promoting, and then the question is not worth asking.
      promoters,
      // The order of the front page, as admin set it. The app used to hold
      // its own opinion about this and drifted from the website the first
      // time anybody moved a card.
      homeOrder: readDoors(settings.home_order)
        .filter((row) => row.on)
        .map((row) => row.key),
      /*
       * The things we do that are not a shelf, sent rather than built into
       * the app.
       *
       * Every one of them ends in a message to a person, so there is
       * nothing for the app to do with them but name them and open the
       * page. Sent from here so a seventh service is live the day it is
       * written, instead of waiting on a release neither store is in a
       * hurry to approve.
       */
      services: ERRANDS.map((one) => ({
        slug: one.slug,
        title: one.title,
        lead: one.lead,
        url: `${SITE}/${one.slug}`,
      })),
      // Whose money a card link can be made out in. The website's food
      // checkout has asked this all along and the app's never did, so a
      // parent in London reached the last screen and was shown a naira
      // figure and nothing they could pay it with.
      monies: moniesOn(settings).map((code) => ({
        code,
        label: code === "GBP" ? "Pounds" : "Dollars",
        symbol: SYMBOL[code],
        rate: rateFor(settings, code),
      })),
      // The one promotion worth interrupting somebody for, or nothing. The
      // website has shown this in the corner since automatic offers went in
      // and the app never did, so the phone was the one place a customer
      // could be sitting on a free delivery and never be told. Only
      // automatic ones: those are the offers nobody can type, so nobody
      // finds them unless the shop says so.
      //
      // Its links are rewritten for the app. The website files a counter
      // under its slug and the app screen finds one by its id, so the slug
      // went through as an id, matched nothing, and the screen sat spinning
      // on a restaurant that could never arrive.
      nudge,
      shop: {
        tagline: settings.tagline,
        /*
         * Which season the shop is dressed for, empty for the ordinary one.
         *
         * The website has worn this since it went in and the app never did,
         * so somebody who switched Halloween on saw pumpkins on the site
         * and the plain red shop on their phone. One setting, read in both
         * places, so turning it off is still clearing a text box.
         */
        season: settings.season ?? "",
        ribbon: ribbon?.text ?? "",
        // Where the strip goes, translated into a screen this app has. The
        // website files a collection under /collections and an occasion
        // under /occasions; the app keeps both on one screen, so a link
        // written for the website has to be read rather than passed on.
        // Anything the app has no screen for comes back empty and the strip
        // is words rather than a door, which is better than a tap that goes
        // nowhere.
        ribbonTo: appRoute(ribbon?.href ?? ""),
        whatsapp: settings.whatsapp_number,
        // Where to leave us a review, so the app can ask for one on a
        // delivered order exactly as the website does. Empty where admin has
        // not put a link in, and then nothing is asked.
        google: googleLinks(settings),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not read the menu." },
      { status: 503 }
    );
  }
}
