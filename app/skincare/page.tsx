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
  skincarePromise,
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
    <div className="-mt-4 space-y-4 pb-36">
      {/* The board's head: the claim in ticket type, the name of the thing
          across two lines, and the two facts that decide whether somebody
          orders today as pills under it. */}
      <header className="bleed relative overflow-hidden border-b-2 border-ink">
        <span
          aria-hidden
          className="absolute inset-y-0 -right-8 w-[18%]"
          style={{
            background:
              "repeating-linear-gradient(-60deg,#e5321d 0 7px,transparent 7px 16px)",
          }}
        />
        <div className="shell relative flex flex-col gap-4 pb-7 pt-7 sm:gap-5 sm:pb-8 sm:pt-11">
          <span className="ticket text-brand-dark">
            {shop.name} · {total} product{total === 1 ? "" : "s"} ·{" "}
            {skincarePromise(settings)}
          </span>
          <h1 className="font-display text-[min(15vw,7rem)] font-black uppercase leading-[0.86] sm:text-[clamp(3.5rem,8vw,7rem)]">
            Your fav brands.
            <br />
            To your block.
          </h1>
          <div className="flex flex-wrap gap-2.5">
            <span className="flex items-center rounded-full bg-ink px-4 py-2 text-sm font-semibold text-shell">
              One car a week · next drop {dropLabel(drop.date)}
            </span>
            {bands[0].fee > 0 && (
              <span className="flex items-center rounded-full bg-volt px-4 py-2 text-sm font-semibold text-ink">
                Delivery from {naira(bands[0].fee)}
              </span>
            )}
          </div>
          <p className="max-w-[640px] text-[15px] leading-relaxed text-ink/70">
            {settings.skincare_blurb ||
              `Order any day. Order before ${settings.skincare_cut_off || "08:00"} on the morning of the drop and you are on it, otherwise it is the week after.`}{" "}
            To PAU, or anywhere in Lagos.
          </p>
        </div>
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
