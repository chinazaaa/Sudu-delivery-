/**
 * Pages the shop's own furniture does not belong on.
 *
 * The header, the footer, the ribbon, the tab bar and the centred column
 * are drawn once in the root layout for every page there is. Three kinds of
 * page are not pages of the shop: the board behind it, the promoter's own
 * bar, and a receipt, which is a document somebody prints or sends to their
 * parents and has no business carrying a menu and fifteen footer links.
 *
 * Written once because it was written six times, and the sixth place to
 * learn about a new one is the place that forgets.
 */
export function ownsThePage(path: string | null | undefined): boolean {
  const said = path ?? "";
  return (
    said.startsWith("/admin") ||
    said.startsWith("/promoter") ||
    said.startsWith("/receipt") ||
    // The run sheet, which is a tool and not a shop. It arrived wearing
    // the whole shop: a menu header, a four tab bar offering Cart and
    // Group, the ordering chat, an offer card asking whether the person
    // reading it was hungry, and a pumpkin drifting across the bag list.
    // All of it addressed to a customer, on a page being read by somebody
    // working, at a counter, in a hurry.
    said.startsWith("/run")
  );
}

