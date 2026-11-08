/**
 * Asking for something to be brought from the UK.
 *
 * Football shirts and books are not shelves. Nothing on them has a price,
 * because the price depends on the item and on what it costs in the UK,
 * and is sent on WhatsApp the way every custom order is. So each is a
 * short form, and what it collects is worded here into the one line the
 * request inbox already shows, with the details a person needs to quote
 * it: which shirt, which size, which edition.
 *
 * Kept as plain functions so the wording is tested rather than hoped for.
 */

export const SHIRT_STYLES = ["Home", "Away", "Third", "Goalkeeper", "Retro"] as const;
export const SHIRT_FITS = ["Men's", "Women's", "Kids"] as const;
export const BOOK_FORMATS = ["Paperback", "Hardback", "Whichever is cheaper"] as const;

/** What every shirt request starts with, so the inbox can tell it apart. */
export const SHIRT_TAG = "Football shirt";
/** And every book request. */
export const BOOK_TAG = "Book";

export type UkKind = "shirt" | "book";

export type Composed =
  | { ok: true; wanted: string }
  | { ok: false; error: string };

const clean = (value: string, most: number) =>
  String(value ?? "").replace(/\s+/g, " ").trim().slice(0, most);

/** One of a fixed list, or nothing: a hand-edited form field is not a style. */
function oneOf<T extends string>(value: string, list: readonly T[]): T | "" {
  const said = clean(value, 40).toLowerCase();
  return list.find((one) => one.toLowerCase() === said) ?? "";
}

export function composeShirt(input: {
  club: string;
  style: string;
  look: string;
  fit: string;
  size: string;
}): Composed {
  const club = clean(input.club, 60);
  if (club.length < 2) return { ok: false, error: "Which club?" };

  const size = clean(input.size, 30);
  if (size === "") return { ok: false, error: "What size?" };

  const style = oneOf(input.style, SHIRT_STYLES);
  const fit = oneOf(input.fit, SHIRT_FITS);
  const look = clean(input.look, 60);

  const which = [club, style.toLowerCase()].filter(Boolean).join(" ");
  const wanted =
    `${SHIRT_TAG} · ${which}` +
    (look ? ` (${look})` : "") +
    ` · ${[fit, size].filter(Boolean).join(" ")}`;
  return { ok: true, wanted };
}

export function composeBook(input: {
  title: string;
  author: string;
  format: string;
}): Composed {
  const title = clean(input.title, 120);
  if (title.length < 2) return { ok: false, error: "Which book?" };

  const author = clean(input.author, 60);
  const format = oneOf(input.format, BOOK_FORMATS);

  const wanted =
    `${BOOK_TAG} · ${title}` +
    (author ? ` by ${author}` : "") +
    (format ? ` · ${format}` : "");
  return { ok: true, wanted };
}

/** Whether a request in the inbox came from one of these forms. */
export function ukKindOf(wanted: string): UkKind | null {
  const said = String(wanted ?? "");
  if (said.startsWith(`${SHIRT_TAG} · `)) return "shirt";
  if (said.startsWith(`${BOOK_TAG} · `)) return "book";
  return null;
}

/** Where each form lives, so the page it came from is where it returns. */
export const UK_PATH: Record<UkKind, string> = {
  shirt: "/football-shirts",
  book: "/books",
};

/** Where it is going: the campus, or somewhere else in Lagos. */
export type UkWhere = "pau" | "lagos";

export type Placed =
  | { ok: true; hostel: string; note: string }
  | { ok: false; error: string };

/**
 * Where a request is going, put into the two fields the inbox already has.
 *
 * On campus it is a block from the list, which the request keeps in its
 * hostel field like every other order. Anywhere else in Lagos it is an
 * address, and an address is longer than the hostel field holds, so the
 * field says only "Lagos" and the address leads the note, where it has
 * room and where whoever is quoting will read it first. Either way
 * something is required: a price for a delivery that has nowhere to go is
 * a guess.
 */
export function composeWhere(input: {
  where: string;
  hostel: string;
  address: string;
  note: string;
}): Placed {
  const note = clean(input.note, 300);

  if (input.where === "lagos") {
    const address = clean(input.address, 200);
    // Eight characters, so an area on its own ("Lekki") is asked again
    // while "5 Ozumba Mbadiwe" is not. A sanity check and not a validator:
    // the price is agreed on WhatsApp, where the rest can be asked.
    if (address.length < 8) return { ok: false, error: "What is the address in Lagos?" };
    return {
      ok: true,
      hostel: "Lagos",
      note: `Deliver to: ${address}` + (note ? ` · ${note}` : ""),
    };
  }

  const hostel = clean(input.hostel, 80);
  if (hostel === "") return { ok: false, error: "Which block?" };
  return { ok: true, hostel, note };
}
