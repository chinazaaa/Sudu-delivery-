/**
 * What a shelf page tells a search engine it is.
 *
 * The skincare and pharmacy counters are one page with filters on it rather
 * than a page per product, and the filters are the part worth finding:
 * "CeraVe delivered in Lagos" and "paracetamol delivered in Lagos" are real
 * searches, and a shelf answers them better than eight hundred product pages
 * nobody would ever crawl. The sitemap has said so for a while: a hundred and
 * eighty of those addresses are listed in it.
 *
 * None of them could ever be indexed. The card at the top of each counter is
 * written in its layout, and a layout cannot see what was asked for, so every
 * one of those filters declared itself a copy of the bare counter. Google
 * agreed, filed all of them under "alternative page with proper canonical
 * tag", and listed nothing. A sitemap asking for a page and a tag on that
 * page saying it is somebody else is a contradiction, and the tag wins.
 *
 * So the canonical is worked out from what was actually asked for, here,
 * where the shelf and the brand are known.
 */

export type ShelfAsked = {
  shelf?: string;
  brand?: string;
  q?: string;
  sort?: string;
  under?: string;
  over?: string;
  page?: string;
};

export type ShelfFacets = {
  shelves: { name: string }[];
  brands: { name: string }[];
};

export type ShelfSeo = {
  /** Null to leave the layout's own title and description alone, which is
   *  right for the bare counter: that card is written by hand. */
  title: string | null;
  description: string | null;
  canonical: string;
  /** True for a search somebody typed, which is never a page worth listing. */
  noindex: boolean;
};

/**
 * The title, the description and the one address this page answers to.
 *
 * A filter only speaks for itself when it is a real one. Anybody can type
 * ?shelf=anything, and a made up shelf that declares itself a page of its own
 * is how a shop ends up with a thousand empty addresses in an index.
 */
export function shelfSeo(args: {
  /** "/skincare" or "/pharmacy". */
  path: string;
  /** What the counter calls itself, for the title. */
  shopName: string;
  asked: ShelfAsked;
  facets: ShelfFacets;
}): ShelfSeo {
  const { path, shopName, asked, facets } = args;

  // A typed search is a dead end: not listed, and not followed out of, because
  // every link on it carries the query along and one crawled search becomes a
  // shelf times a brand times a sort order.
  if ((asked.q ?? "").trim() !== "") {
    return { title: null, description: null, canonical: path, noindex: true };
  }

  const known = (list: { name: string }[], said: string | undefined) => {
    const want = (said ?? "").trim().toLowerCase();
    if (want === "") return "";
    return list.find((one) => one.name.toLowerCase() === want)?.name ?? "";
  };

  // A brand beats a shelf. Somebody who picked both asked for one shelf of one
  // brand, which is a narrower thing than either and too narrow to be worth a
  // page; the brand is the half of it people search for.
  const brand = known(facets.brands, asked.brand);
  const shelf = known(facets.shelves, asked.shelf);
  const named = brand || shelf;

  if (named === "") {
    // Sorting, a price range, page four. Every one of them is the same shelf
    // in a different order, and each competing with the others is how none of
    // them rank.
    return { title: null, description: null, canonical: path, noindex: false };
  }

  const key = brand ? "brand" : "shelf";
  return {
    title: `${named} delivered in Lagos`,
    description:
      `Order ${named} from ${shopName} and have it delivered anywhere in ` +
      `Lagos. One delivery for everything in the basket.`,
    // The filter and nothing else. Page two of a shelf is the same shelf, and
    // a sort order is the same shelf again.
    canonical: `${path}?${key}=${encodeURIComponent(named)}`,
    noindex: false,
  };
}
