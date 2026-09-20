import Link from "next/link";
import { notFound } from "next/navigation";
import { safeSettings } from "@/lib/settings";
import {
  browseSkincare,
  dropLabel,
  nextDrop,
  PER_PAGE,
  skincareBands,
  skincareFacets,
  skincareOn,
  skincareShop,
} from "@/lib/skincare";
import { naira } from "@/lib/money";
import Shelf from "@/components/Shelf";
import ShelfBar from "@/components/ShelfBar";

export const dynamic = "force-dynamic";

/**
 * Skincare, which is the same shop on a different day.
 *
 * One car a week, on a Saturday, with a cut off that morning. Ordering is
 * open every day: what waits is the arriving, and saying which Saturday it is
 * at the top of the page is the whole promise.
 */
export default async function SkincarePage({
  searchParams,
}: {
  searchParams: Promise<{
    shelf?: string;
    brand?: string;
    q?: string;
    sort?: string;
    under?: string;
    over?: string;
    page?: string;
  }>;
}) {
  const settings = await safeSettings();
  const shop = await skincareShop();
  if (!skincareOn(settings) || !shop) notFound();

  const asked = await searchParams;
  const page = Math.max(1, Number(asked.page ?? 1) || 1);

  const [{ products, total }, facets] = await Promise.all([
    browseSkincare({
      shelf: asked.shelf,
      brand: asked.brand,
      query: asked.q,
      sort: asked.sort,
      under: Number(asked.under ?? 0) || 0,
      over: Number(asked.over ?? 0) || 0,
      page,
    }),
    skincareFacets(),
  ]);

  const drop = nextDrop(settings);
  const bands = skincareBands(settings);

  return (
    <div className="space-y-4 pb-36">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold">{shop.name}</h1>
        <p className="text-ink/75">
          Order any day. It comes on {dropLabel(drop.date)}.
        </p>
        <p className="text-sm text-muted">
          {settings.skincare_blurb ||
            `One car a week. Order before ${settings.skincare_cut_off || "08:00"} that morning and you are on it, otherwise it is the week after.`}
          {bands[0].fee > 0 && ` Delivery from ${naira(bands[0].fee)}.`}
        </p>
      </header>

      <Shelf
        products={products}
        total={total}
        page={page}
        perPage={PER_PAGE}
        shelves={facets.shelves}
        brands={facets.brands}
        picked={{
          shelf: asked.shelf ?? "",
          brand: asked.brand ?? "",
          q: asked.q ?? "",
          sort: asked.sort ?? "",
          under: asked.under ?? "",
          over: asked.over ?? "",
        }}
      />

      {/* The food shop is the other half of this and nothing on this page
          says so, which is how somebody ends up thinking we only sell
          cleanser. */}
      <p className="text-center text-sm text-muted">
        Looking for food?{" "}
        <Link href="/" className="font-semibold text-brand">
          The menu is here
        </Link>
        , delivered today or on the next run.
      </p>

      <ShelfBar bands={bands} when={dropLabel(drop.date)} />
    </div>
  );
}
