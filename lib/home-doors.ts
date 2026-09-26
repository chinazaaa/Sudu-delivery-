/**
 * The order of the front page, and what is on it.
 *
 * The buckets were in the order somebody typed them in, which is fine until
 * the week you want to push parcels, or the week skincare has a restock and
 * should lead. Moving a card should not be a deploy, so the order is a
 * setting and the front page reads it.
 *
 * Kept as one line, because the order and what is switched off are the same
 * question: "-skincare" is skincare, still known about, still in its place,
 * just not on the page this week. Anything the line does not mention is new
 * since it was saved, and lands at the end rather than vanishing.
 */
export type DoorKey = "food" | "shelves" | "parcel" | "skincare" | "custom" | "group";

/** Every door there is, in the order the shop shipped with. */
export const DOORS: DoorKey[] = [
  "food",
  "shelves",
  "parcel",
  "skincare",
  "custom",
  "group",
];

/** What each one is called in admin. The customer sees the card's own words. */
export const DOOR_LABEL: Record<DoorKey, string> = {
  food: "Food",
  shelves: "Collections and occasions, one card each",
  parcel: "Send a parcel",
  skincare: "Skincare",
  custom: "Can't find it?",
  group: "Ordering together?",
};

/** A line of admin help, so the list reads without having to guess. */
export const DOOR_NOTE: Record<DoorKey, string> = {
  food: "Every restaurant in one list.",
  shelves:
    "Each collection and occasion by its own name, with a price. Their order " +
    "is the one you set on the Collections screen.",
  parcel: "Only shows while parcels are on and a route is priced.",
  skincare: "Only shows while the skincare shop is on.",
  custom: "Tell us what you are looking for and we will get it.",
  group: "Everybody adds their own, one delivery between them.",
};

export type DoorRow = { key: DoorKey; on: boolean };

/**
 * The saved line, as rows, with anything missing added at the end.
 *
 * Never returns a short list: a door left out of the setting is a door that
 * would be unreachable, and a front page is the only signpost this shop has.
 */
export function readDoors(saved: string): DoorRow[] {
  const rows: DoorRow[] = [];
  const seen = new Set<DoorKey>();

  for (const raw of saved.split(",").map((one) => one.trim())) {
    if (raw === "") continue;
    const off = raw.startsWith("-");
    const key = (off ? raw.slice(1) : raw) as DoorKey;
    if (!DOORS.includes(key) || seen.has(key)) continue;
    seen.add(key);
    rows.push({ key, on: !off });
  }

  for (const key of DOORS) {
    if (!seen.has(key)) rows.push({ key, on: true });
  }
  return rows;
}

/** Rows back to the one line the setting keeps. */
export function writeDoors(rows: DoorRow[]): string {
  return rows.map((one) => (one.on ? one.key : `-${one.key}`)).join(",");
}
