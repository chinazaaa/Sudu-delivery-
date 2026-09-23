import type { Metadata } from "next";
import { lagosToday } from "@/lib/time";
import { liveOccasions } from "@/lib/boxes";
import Home from "@/components/Home";
import { openBatches } from "@/lib/batches";
import { menuView } from "@/lib/menu";
import { listSlides } from "@/lib/slides";
import { popularItemIds } from "@/lib/popular";
import {
  activeBands,
  AUTO_HEADLINE,
  AUTO_LINES,
  safeSettings,
  hoursByDay,
} from "@/lib/settings";
import { toBatchView } from "@/lib/view";
import { deliverySlots, slotsWorthOffering } from "@/lib/same-day";
import { nextArrival, runArrival } from "@/lib/arrival";
import { offersByRestaurant } from "@/lib/coupons";
import { dropLabel, nextDrop, skincareOn, skincareShop } from "@/lib/skincare";
import { liveRoutes, parcelsFrom } from "@/lib/parcels";
import { offerBadge } from "@/lib/offers";
import { sweepGroups } from "@/lib/groups";

export const dynamic = "force-dynamic";

/** The front page is its own canonical, now that the layout says nothing. */
export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  // Somebody opening the site is enough to close a group whose time is up, so
  // a car does not sit open because everybody in it put their phone away.
  sweepGroups();

  const [menu, batches, slides, settings, popularIds, bands] = await Promise.all([
    menuView(),
    openBatches(),
    listSlides(),
    safeSettings(),
    popularItemIds(),
    activeBands(),
  ]);
  // An offer says itself on the card of the restaurant it belongs to. The
  // home page has enough on it without a strip for every deal.
  const offers = await offersByRestaurant();
  const promos = Object.fromEntries(
    [...offers.entries()].map(([id, offer]) => [id, offerBadge(offer)])
  );

  const slots =
    settings.same_day_on === "on"
      ? slotsWorthOffering(
          deliverySlots(new Date(), await hoursByDay()),
          batches.map((one) => ({ run_date: one.run_date, window: one.delivery_window_text }))
        )
      : [];

  // Read once: the tile names the routes, so it needs the whole set up.
  const parcelSetup = parcelsFrom(settings);

  const lines = (settings.auto_lines || AUTO_LINES)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const runViews = batches
    .map(toBatchView)
    .filter((one) => !one.closed && !one.full)
    .map(runArrival);
  // The one rule, asked once: a run going today, a car of its own today, a
  // run tomorrow, tomorrow's first window. Worked out here so the clock is
  // the shop's rather than the phone's.
  const decided = nextArrival(runViews, slots, lagosToday());

  // What is packed, said as the thing itself rather than as a category.
  const occasions = await liveOccasions();
  const occasionsLine =
    occasions.length === 0
      ? ""
      : occasions.length === 1
        ? `${occasions[0].name}. One price, delivery in it.`
        : `${occasions
            .slice(0, 2)
            .map((one) => one.name)
            .join(", ")} and more. One price, delivery in it.`;

  return (
    <Home
      menu={menu}
      slides={slides}
      popularIds={popularIds}
      autoHeadline={settings.auto_headline || AUTO_HEADLINE}
      autoLines={lines.length > 0 ? lines : [""]}
      // When something ordered right now would land, by the one rule every
      // other way of ordering uses: a run going today while it is taking
      // orders, a car of its own today, a run tomorrow, tomorrow's first
      // window. Worked out here so the clock is the shop's.
      arriving={decided?.said ?? ""}
      // The other way, for whoever the headline does not suit. Somebody who
      // wants dinner tonight and somebody who wants it cheap both open this
      // page, and one sentence naming a run five days out sends the first of
      // them away. Worked out by asking the same rule twice, once with only
      // runs and once with only cars, so the wording cannot drift from it.
      alsoArriving={
        (() => {
          if (!decided) return null;
          const other = decided.onARun
            ? nextArrival([], slots, lagosToday())
            : nextArrival(runViews, [], lagosToday());
          return other && other.said !== decided.said
            ? { said: other.said, sooner: decided.onARun }
            : null;
        })()
      }
      promos={promos}
      // The one signpost. Named by whatever is nearest, because "Match day,
      // Saturday" is a reason to tap and "Occasions" is a filing cabinet.
      occasions={occasionsLine}
      // Something that is not food, carried on its own trip. Named by where
      // it goes rather than called "Parcels", because nobody is looking for
      // a parcel service: they have a dress sitting in a shop in Lekki.
      parcels={
        parcelSetup.on
          ? `${liveRoutes(parcelSetup.routes)
              .map((one) => one.label)
              .slice(0, 2)
              .join(", ")}${
              liveRoutes(parcelSetup.routes).length > 2 ? " and more" : ""
            }. Its own trip, on a day we agree.`
          : ""
      }
      // One car a week, on a Saturday. Empty when that shelf is off, and then
      // the page does not mention it at all.
      skincare={
        skincareOn(settings) && (await skincareShop())
          ? `Order any day. It comes ${dropLabel(nextDrop(settings).date)}.`
          : ""
      }
    />
  );
}
