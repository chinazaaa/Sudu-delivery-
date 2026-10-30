import { unstable_cache } from "next/cache";
import { COUNTERS, type Counter } from "./counter";
import { counterOn, counterShop, nextDrop } from "./counter";
import { dropLabel } from "./skincare";
import { safeSettings } from "./settings";
import { boxesAcross, isTimed, liveOccasions } from "./boxes";
import { cheapestBoxes } from "./box-view";
import { shelfPhotos } from "./shelf-photo";
import { liveRoutes, parcels } from "./parcels";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store";

/**
 * Everything on the app's home screen that is not the menu.
 *
 * The screen used to ask for these one at a time: the skincare shelf, the
 * pharmacy shelf, the parcel routes and the boxes, four requests on top of
 * the menu, each filling in its own strip of the page as it landed. On a
 * phone on campus wifi that is the page assembling itself in front of
 * somebody, one section at a time, for several seconds.
 *
 * So they are answered with the menu, in the one request the app was
 * already making. Everything in here is small and already cached: it is
 * four quick reads beside a megabyte of menu, and they happen at the same
 * time as each other rather than one after another.
 */
export type AppDoors = {
  skincare: { on: boolean; when: string };
  pharmacy: { on: boolean; when: string };
  /** The places parcels go, named rather than the routes themselves: a
   *  route is named for where it is not PAU, so both directions of one
   *  road collapse into one place. */
  parcels: { on: boolean; places: string[] };
  shelves: AppShelf[];
};

/** A shelf of boxes, as a card on the home screen. */
export type AppShelf = {
  slug: string;
  name: string;
  blurb: string;
  boxes: number;
  from: number | null;
  happensAt: string | null;
  whenWord: string;
  kind: string;
  image: string;
};

/** The cover for a shelf, as a PNG the phone can actually draw. */
export function shelfCover(imageUrl: string, kind: string): string {
  const named = (imageUrl || "").trim();
  // Anything already hosted elsewhere is somebody's own photograph and is
  // left alone. Only our own drawings have a PNG beside them.
  if (named.startsWith("http")) return named;
  const file = named.startsWith("/covers/")
    ? named.replace(/\.svg$/, ".png")
    : `/covers/${kind === "occasion" ? "occasions" : "collections"}.png`;
  return `${SITE}${file}`;
}

/**
 * The shelves of boxes, priced.
 *
 * Lifted out of the route that answers the app's shelf list so the home
 * screen can have the same cards without a second request and without a
 * second copy of how they are built. A card with no price on it is a
 * category, and categories sell nothing.
 */
export async function appShelves(): Promise<AppShelf[]> {
  const occasions = await liveOccasions();
  if (occasions.length === 0) return [];

  const boxes = await boxesAcross(occasions.map((one) => one.id));
  const [from, photo] = await Promise.all([
    cheapestBoxes(boxes),
    // A photograph of the best thing on each shelf. The drawing is the
    // fallback, not the first choice.
    shelfPhotos(boxes).catch(() => ({}) as Record<string, string>),
  ]);

  const counts = new Map<string, number>();
  for (const box of boxes) {
    if (box.is_extra) continue;
    counts.set(box.occasion_id, (counts.get(box.occasion_id) ?? 0) + 1);
  }

  return occasions
    .filter((one) => (counts.get(one.id) ?? 0) > 0)
    .map((one) => ({
      slug: one.slug,
      name: one.name,
      blurb: one.blurb,
      boxes: counts.get(one.id) ?? 0,
      from: from.get(one.id) ?? null,
      happensAt: isTimed(one) ? one.happens_at : null,
      whenWord: one.when_word,
      kind: one.kind,
      image: photo[one.id] || shelfCover(one.image_url, one.kind),
    }));
}

/** Whether a counter is open, and the day its next car goes. */
async function doorFor(
  counter: Counter,
  settings: Awaited<ReturnType<typeof safeSettings>>
): Promise<{ on: boolean; when: string }> {
  if (!counterOn(counter, settings)) return { on: false, when: "" };
  const shop = await counterShop(counter).catch(() => null);
  if (!shop) return { on: false, when: "" };
  return { on: true, when: dropLabel(nextDrop(counter, settings).date) };
}

async function readDoorsNow(): Promise<AppDoors> {
  const settings = await safeSettings();

  const [skincare, pharmacy, parcelSetup, shelves] = await Promise.all([
    doorFor(COUNTERS.skincare, settings).catch(() => ({ on: false, when: "" })),
    doorFor(COUNTERS.pharmacy, settings).catch(() => ({ on: false, when: "" })),
    parcels().catch(() => null),
    appShelves().catch(() => [] as AppShelf[]),
  ]);

  const routes = parcelSetup ? liveRoutes(parcelSetup.routes) : [];
  const places: string[] = [];
  for (const route of routes) {
    const place = route.label
      .replace(/\s*to\s+PAU\s*$/i, "")
      .replace(/^\s*PAU\s+to\s*/i, "")
      .trim();
    if (place !== "" && !places.includes(place)) places.push(place);
  }

  return {
    skincare,
    pharmacy,
    parcels: {
      on: Boolean(parcelSetup?.on) && routes.length > 0,
      places,
    },
    shelves,
  };
}

/**
 * The same answer for everybody, so it is worked out once a minute.
 *
 * This rides on the menu, which every launch of the app asks for, and
 * none of it is about the person asking: which counters are open, what day
 * their car goes, where parcels go and what is on the shelves are facts
 * about the shop. Admin clears this the moment anything changes, so the
 * minute only ever covers a stretch where nothing has.
 */
export const appDoors = unstable_cache(readDoorsNow, ["app-doors"], {
  revalidate: 60,
  tags: ["menu"],
});
