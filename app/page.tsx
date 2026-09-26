import type { Metadata } from "next";
import { lagosToday } from "@/lib/time";
import { boxesAcross, liveOccasions, onShelf } from "@/lib/boxes";
import { readDoors, type DoorKey } from "@/lib/home-doors";
import type { Bucket } from "@/components/Home";
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
import { dropLabel, nextDrop, skincareOn, skincareShop } from "@/lib/skincare";
import { liveRoutes, parcelsFrom } from "@/lib/parcels";
import { sweepGroups } from "@/lib/groups";

export const dynamic = "force-dynamic";

/** The front page is its own canonical, now that the layout says nothing. */
export const metadata: Metadata = { alternates: { canonical: "/" } };

/**
 * How many collections and occasions the front page names before it stops
 * naming them. Six is three rows on a phone, which is as much as anybody
 * scrolls past the food.
 */
const MOST_SHELVES = 6;

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
        // The price and nothing else. The name says what it is and the card
        // is not the place to explain it: two lines of blurb made every card
        // a paragraph and the grid twice as tall.
        const said =
          price !== undefined ? `From ${naira(price)}, delivery in` : one.blurb;
        return {
          href: `/${kind === "occasion" ? "occasions" : "collections"}/${one.slug}`,
          title: one.name,
          line: said,
          action: "See",
          // Its own picture where it has one, the shelf's where it does not.
          image:
            one.image_url ||
            `/covers/${kind === "occasion" ? "occasions" : "collections"}.svg`,
        };
      });

  // Collections stand all term, so they lead. An occasion is the urgent one
  // and there is rarely more than one at a time.
  const shelves = [...doorsFor("collection"), ...doorsFor("occasion")];

  // Everything packed, by name, so the search can find it. Somebody typing
  // "care" means the care package, and a search that only reads the menu
  // tells them the shop has never heard of it.
  const byId = new Map(packed.map((one) => [one.id, one]));
  const packs = packedBoxes
    .filter((box) => !box.is_extra)
    .flatMap((box) => {
      const shelf = byId.get(box.occasion_id);
      if (!shelf) return [];
      const where = shelf.kind === "occasion" ? "occasions" : "collections";
      return [
        {
          title: box.name,
          line: `${shelf.name}${box.serves ? ` · ${box.serves}` : ""}`,
          href: `/${where}/${shelf.slug}`,
        },
      ];
    });

  // The parcel line names where it goes rather than calling itself a parcel
  // service, because nobody is looking for a parcel service: they have a
  // dress sitting in a shop in Lekki.
  const parcelLine = parcelSetup.on
    ? `${liveRoutes(parcelSetup.routes)
        .map((one) => one.label)
        .slice(0, 2)
        .join(", ")}${
        liveRoutes(parcelSetup.routes).length > 2 ? " and more" : ""
      }. Its own trip, on a day we agree.`
    : "";

  // One car a week, on a Saturday. Empty when that shelf is off, and then the
  // page does not mention it at all.
  const skincareLine =
    skincareOn(settings) && (await skincareShop())
      ? `Order any day. It comes ${dropLabel(nextDrop(settings).date)}.`
      : "";

  // Every door there is, keyed, so the order can be a setting rather than the
  // order somebody typed them in. A door with nothing behind it is not a
  // door: it would be a card that opens on an apology.
  const door: Record<DoorKey, Bucket[]> = {
    food: [
      {
        href: "/products",
        image: "/covers/food.svg",
        title: "Food",
        line: "Every restaurant in one list",
        action: "Browse",
      },
    ],
    // Capped, because this list only grows and a front page that is forty
    // cards is a catalogue again. The rest are one door.
    shelves: [
      ...shelves.slice(0, MOST_SHELVES),
      ...(shelves.length > MOST_SHELVES
        ? [
            {
              href: "/collections",
              image: "/covers/collections.svg",
              title: "Everything else packed",
              line: `${shelves.length - MOST_SHELVES} more, all at one price with delivery in it`,
              action: "See",
            },
          ]
        : []),
    ],
    parcel:
      parcelLine === ""
        ? []
        : [
            {
              href: "/parcel",
              image: "/covers/parcel.svg",
              title: "Send a parcel",
              line: parcelLine,
              action: "Send",
            },
          ],
    skincare:
      skincareLine === ""
        ? []
        : [
            {
              href: "/skincare",
              image: "/covers/skincare.svg",
              title: "Skincare",
              line: skincareLine,
              action: "Shop",
            },
          ],
    custom: [
      {
        href: "/custom-order",
        image: "/covers/custom.svg",
        title: "Can't find it?",
        line: "Tell us what you are looking for and we will get it for you",
        action: "Ask us",
      },
    ],
    group: [
      {
        href: "/group",
        image: "/covers/group.svg",
        title: "Ordering together?",
        line: "Everybody adds their own, one delivery between you",
        action: "Start",
      },
    ],
  };

  // The order, and what is switched off, both come from admin. Promoting
  // parcels for a week should not be a deploy.
  const buckets = readDoors(settings.home_order)
    .filter((row) => row.on)
    .flatMap((row) => door[row.key]);

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
      buckets={buckets}
      // The boxes by name, so a search for "care" finds the care package
      // rather than reporting that nothing matches.
      packs={packs}
    />
  );
}
