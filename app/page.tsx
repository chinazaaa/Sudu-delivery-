import type { Metadata } from "next";
import { lagosToday } from "@/lib/time";
import { boxesAcross, liveOccasions, onShelf } from "@/lib/boxes";
import { cheapestBoxes } from "@/lib/box-view";
import { naira } from "@/lib/money";
import Home from "@/components/Home";
import { openBatches } from "@/lib/batches";
import { menuView } from "@/lib/menu";
import { listSlides } from "@/lib/slides";
import {
  activeBands,
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

  const [menu, batches, slides, settings, bands] = await Promise.all([
    menuView(),
    openBatches(),
    listSlides(),
    safeSettings(),
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

  const runViews = batches
    .map(toBatchView)
    .filter((one) => !one.closed && !one.full)
    .map(runArrival);
  // The one rule, asked once: a run going today, a car of its own today, a
  // run tomorrow, tomorrow's first window. Worked out here so the clock is
  // the shop's rather than the phone's.
  const decided = nextArrival(runViews, slots, lagosToday());

  // What is packed, said as the thing itself rather than as a category.
  // Two shelves, named separately: an occasion has a date on it and a
  // collection stands there all term, and one door holding both was a door
  // that could only be called something like "boxes and gifts".
  // Every shelf as its own card, by name, rather than one door saying
  // "Collections". Nobody opens a filing cabinet: a front page is where you
  // advertise, and somebody who never knew we do a care package will only
  // find out if the words "Care package" are on the page they landed on.
  //
  // With a price, because a name is a category and a name with a price is an
  // offer. Two more queries to say "from ₦20,000, delivery in", which is the
  // sentence that gets the tap.
  const packed = await liveOccasions();
  const packedBoxes = await boxesAcross(packed.map((one) => one.id));
  const from = await cheapestBoxes(packedBoxes).catch(
    () => new Map<string, number>()
  );

  const boxCount = new Map<string, number>();
  for (const box of packedBoxes) {
    if (box.is_extra) continue;
    boxCount.set(box.occasion_id, (boxCount.get(box.occasion_id) ?? 0) + 1);
  }

  const doorsFor = (kind: "collection" | "occasion") =>
    onShelf(packed, kind)
      // A shelf with nothing on it is not a door. It would be a card that
      // opens on an apology.
      .filter((one) => (boxCount.get(one.id) ?? 0) > 0)
      .map((one) => {
        const price = from.get(one.id);
        const said = price !== undefined ? `From ${naira(price)}, delivery in.` : "";
        return {
          href: `/${kind === "occasion" ? "occasions" : "collections"}/${one.slug}`,
          title: one.name,
          line: one.blurb !== "" ? `${one.blurb}${said ? ` ${said}` : ""}` : said,
          action: "See",
        };
      });

  // Collections stand all term, so they lead. An occasion is the urgent one
  // and there is rarely more than one at a time.
  const shelves = [...doorsFor("collection"), ...doorsFor("occasion")];

  return (
    <Home
      iosAppId={settings.ios_app_id}
      menu={menu}
      slides={slides}
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
      // Every collection and every occasion by its own name, with a price,
      // because "Care package, from ₦20,000" is a reason to tap and
      // "Collections" is a filing cabinet.
      shelves={shelves}
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
