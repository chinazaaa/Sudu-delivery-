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
    said.startsWith("/receipt")
  );
}
