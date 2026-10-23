/**
 * The ways an order gets in: the website, the app, the chat, and the desk.
 *
 * The desk is the one nobody chose. Somebody orders on WhatsApp and the
 * shop types it in for them, and before this it either looked like a
 * website order or like nothing at all. It is worth telling apart: the
 * other three count how well each door works, and an order a person keyed
 * in says nothing about any of them.
 *
 * Here rather than beside the figures that count them, because a card in
 * admin says it too and a card is a client component: importing the
 * analytics for one word dragged the database, and next/headers with it,
 * into the browser bundle.
 */

/** What each door is called at the head of a column. */
export function doorLabel(source: string): string {
  if (source === "app") return "The app";
  if (source === "web") return "The website";
  if (source === "bot") return "Sudu Bot";
  if (source === "desk") return "Taken by us";
  return "Not known";
}

/**
 * The same thing on a pill beside an order.
 *
 * Shorter, because it stands in a row of tags rather than at the head of a
 * column. Empty where nothing was recorded: an order older than the column
 * says nothing about where it came from, and "Website" would be a guess
 * printed as a fact.
 */
export function doorTag(source: string): string {
  if (source === "app") return "App";
  if (source === "bot") return "Chat";
  if (source === "web") return "Website";
  if (source === "desk") return "Taken by us";
  return "";
}

/**
 * The door, said so it can be seen.
 *
 * The pill was there all along and read as grey text in a row of grey
 * text: beside a status, a run stage and a promoter it was one more tag
 * and the eye skipped it. The whole point of recording which door an
 * order came through is being able to tell at a glance, so each one gets
 * a colour of its own and sits first in the row.
 *
 * A tint each, and nothing for an order older than the column that
 * records it: a guess printed as a fact is worse than a gap.
 */
export function doorSkin(source: string): string {
  if (source === "app") return "bg-ink text-paper";
  if (source === "bot") return "bg-brand text-white";
  if (source === "web") return "bg-mint/20 text-ink";
  if (source === "desk") return "bg-volt text-ink";
  return "";
}
