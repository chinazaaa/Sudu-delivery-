import type { Metadata } from "next";
import Link from "next/link";
import Empty from "@/components/Empty";
import ProductGrid from "@/components/ProductGrid";
import { optionGroupsFor } from "@/lib/menu";
import { browseProducts, productFacets } from "@/lib/products";
import { safeSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Deals on at the counters",
  description:
    "What the restaurants around Sangotedo have cut this week, delivered to " +
    "Pan-Atlantic University. Their sale price, ours too, for as long as it " +
    "runs.",
  alternates: { canonical: "/deals" },
};

type Asked = {
  /** A restaurant id. */
  place?: string;
  sort?: string;
};

/**
 * What the counters have cut.
 *
 * Black Friday belongs to the restaurants: one does a third off a bucket,
 * the next halves a pizza. When their price falls ours falls with it, and
 * this is the one page where all of that is in a list rather than scattered
 * across eleven menus nobody is going to open one by one.
 *
 * Biggest saving first, because that is the order somebody reads a sale in.
 * Everything here has an end date on it, so the day a counter goes back to
 * its usual price this page empties itself with nothing to switch off.
 */
export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<Asked>;
}) {
  const asked = await searchParams;
  const sort =
    asked.sort === "cheap" || asked.sort === "dear" || asked.sort === "az"
      ? asked.sort
      : "";

  const [{ products, total }, facets, settings] = await Promise.all([
    browseProducts({
      deals: true,
      place: asked.place,
      sort,
      page: 1,
      upTo: true,
    }),
    productFacets(asked.place),
    safeSettings(),
  ]);

  /*
   * A word for the week it is, where there is one.
   *
   * Black Friday is a fortnight of the year and this page is not: counters
   * cut prices in March too, and a page headed Black Friday in March is a
   * page nobody believes. So the headline is typed in admin and emptying
   * the box takes it off, leaving the page exactly as it is the rest of
   * the time.
   */
  const headline = (settings.deals_headline ?? "").trim();

  const groups = await optionGroupsFor(products.map((one) => one.id));
  const cards = products.map((one) => ({
    category: one.category,
    item: {
      id: one.id,
      href: one.href,
      name: one.name,
      price: one.price,
      wasPrice: one.wasPrice ?? 0,
      dealLeft: one.dealLeft ?? "",
      available: true,
      imageUrl: one.imageUrl,
      description: one.description,
      categoryId: one.categoryId,
      containerPct: one.containerPct,
      orderedCount: 0,
      groups: groups.get(one.id) ?? [],
    },
    restaurant: {
      id: one.restaurantId,
      href: one.slug || one.restaurantId,
      name: one.restaurant,
      logoUrl: "",
      bannerUrl: "",
      brandHex: "",
      drawing: "",
      closedDays: "",
      areaId: "",
    },
  }));

  /** Only the kitchens that actually have something on, so the row of
   *  filters is not mostly dead ends. */
  const places = facets.places.filter((one) =>
    products.some((item) => item.restaurantId === one.id)
  );

  const link = (change: Partial<Asked>) => {
    const now = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...asked, ...change })) {
      if (!value || value === "") continue;
      now.set(key, String(value));
    }
    const query = now.toString();
    return query === "" ? "/deals" : `/deals?${query}`;
  };

  return (
    <div className="space-y-4 pb-10">
      <header className="space-y-2">
        {headline !== "" && (
          <span className="ticket text-brand-dark">{headline}</span>
        )}
        <h1 className="font-display text-[min(11vw,3rem)] font-black uppercase leading-[0.95] sm:text-[clamp(3rem,6vw,4.5rem)]">
          On sale now
        </h1>
        <p className="text-[15px] leading-relaxed text-muted">
          What the kitchens have cut. Their price is our price while it
          lasts, and each one says how long it has.
        </p>
      </header>

      {total === 0 ? (
        <Empty icon="bag" title="Nothing on sale right now" href="/products" action="Browse the menu">
          The kitchens run these, so some weeks there are none.
        </Empty>
      ) : (
        <>
          {/* Filter by kitchen and by price. Nothing else: a sale list is
              short, and a row of chips longer than the list it filters is
              a page about its own controls. */}
          <div className="space-y-2">
            {places.length > 1 && (
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                <Link
                  href={link({ place: "" })}
                  className={`chip shrink-0 ${
                    asked.place ? "border-black/10 bg-white" : "border-ink bg-ink text-white"
                  }`}
                >
                  Everything
                </Link>
                {places.map((one) => (
                  <Link
                    key={one.id}
                    href={link({ place: one.id })}
                    className={`chip shrink-0 ${
                      asked.place === one.id
                        ? "border-ink bg-ink text-white"
                        : "border-black/10 bg-white"
                    }`}
                  >
                    {one.name}
                  </Link>
                ))}
              </div>
            )}

            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {(
                [
                  ["", "Biggest saving"],
                  ["cheap", "Cheapest"],
                  ["dear", "Dearest"],
                  ["az", "A to Z"],
                ] as const
              ).map(([value, said]) => (
                <Link
                  key={value || "off"}
                  href={link({ sort: value })}
                  className={`chip shrink-0 ${
                    sort === value
                      ? "border-ink bg-ink text-white"
                      : "border-black/10 bg-white"
                  }`}
                >
                  {said}
                </Link>
              ))}
            </div>
          </div>

          <p className="ticket text-muted">
            {total} {total === 1 ? "thing" : "things"} on sale
          </p>

          <ProductGrid items={cards} />
        </>
      )}
    </div>
  );
}
