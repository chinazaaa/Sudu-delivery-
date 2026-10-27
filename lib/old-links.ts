/**
 * The addresses that were sent before the names existed.
 *
 * Every dish and every counter answered to a uuid once, and those uuids are
 * sitting in WhatsApp threads that people still open. They have to keep
 * working, and they have to stop being a second address for a page that now
 * has a readable one: two addresses for one page split what the page is
 * worth, and a search engine has to be told which is which.
 *
 * This is the map from the old to the new, and `middleware.ts` is what reads
 * it. It is there rather than in the page because a redirect written into a
 * page can only run once routing has already chosen that page and begun
 * drawing it, and by then the answer has been sent and its status code is
 * settled. The page's own redirect never got to be a 301; it became a meta
 * refresh inside a perfectly ordinary 200, and the old address went on
 * answering with a whole page.
 *
 * Filled in at build time by scripts/old-links.ts, which is why it is empty
 * here. Empty is a safe way to be wrong: nothing is redirected, the page
 * behaves exactly as it did before, and the canonical tag goes on doing the
 * consolidating on its own.
 *
 * The set never grows. A uuid only needs forwarding if somebody could have
 * sent it before the names arrived, and everything made since is linked by
 * its name everywhere the shop writes a link.
 */

/** A dish's old uuid to the name its page answers to now. */
export const OLD_ITEM_LINKS: Record<string, string> = {};

/** The same for the counters. */
export const OLD_PLACE_LINKS: Record<string, string> = {};
