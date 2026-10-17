/**
 * The three ways an order gets in: the website, the app, and the chat.
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
  return "";
}
