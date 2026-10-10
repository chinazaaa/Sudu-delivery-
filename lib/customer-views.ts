/**
 * The named cuts of the customer book, and the address of the message
 * screen, in a module with no "use client" on it.
 *
 * Both of these started life inside the composer, which is a client
 * component, and both are read by the two server pages that render it. A
 * server page importing a value from a client module does not get the
 * value: the bundler hands it a reference to something that only exists in
 * the browser, and the moment the server dots into it the render throws.
 * It compiles, it type-checks, the tests pass, and the page fails only when
 * somebody opens it.
 *
 * So the plain data and the pure function live here, where both halves can
 * have the real thing.
 */

export const VIEWS = [
  { value: "", label: "Everyone", nudge: "" },
  { value: "repeat", label: "Ordered twice or more", nudge: "have ordered twice or more" },
  { value: "quiet", label: "Quiet 30 days", nudge: "have not ordered in 30 days" },
  { value: "unreviewed", label: "Never reviewed", nudge: "have never left a review" },
  { value: "big", label: "Big spenders", nudge: "spend above the house average" },
] as const;

/** One person in the book, as much of them as a message needs. */
export type Picked = {
  phone: string;
  /** Their name as the book has it, or their number where there is none. */
  name: string;
  /** What a message opens with, worked out on the server where the book's
   *  own answer for this person lives. */
  greet: string;
  block: string;
  pin: string;
  spend: number;
  orders: number;
  /** Whether they have been ticked off as having left a Google review, so
   *  the bar can show the tick as it really stands rather than as an empty
   *  box over people who are all already ticked. */
  reviewed: boolean;
};

/** A template the owner can drop into the box, as the settings have it. */
export type Pattern = {
  kind: string;
  label: string;
  /** The admin's own wording with {name}, {block} and {pin} still in it. */
  body: string;
};

/**
 * Where the message screen lives for a given set of people.
 *
 * Who the message is for travels in the address rather than in a store, so
 * the screen can be linked to, reloaded, and sent to somebody else without
 * the list of nine people quietly turning into nobody. The cut it was
 * started from travels too, so the way back is the list as it was left.
 */
export function broadcastHref({
  phones,
  view = "",
  by = "",
  q = "",
  start = "",
}: {
  phones: string[];
  view?: string;
  by?: string;
  q?: string;
  /** The template to land on, where the button that opened this named one. */
  start?: string;
}): string {
  const params = new URLSearchParams();
  params.set("who", phones.join(","));
  for (const [key, value] of Object.entries({ view, by, q, start })) {
    if (value !== "") params.set(key, value);
  }
  return `/admin/broadcast?${params.toString()}`;
}
