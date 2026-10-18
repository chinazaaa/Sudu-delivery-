import Link from "next/link";
import { notFound } from "next/navigation";
import { safeSettings } from "@/lib/settings";
import {
  browsePharmacy,
  dropLabel,
  nextDrop,
  PER_PAGE,
  pharmacyBands,
  pharmacyBlurb,
  pharmacyCutOff,
  pharmacyFacets,
  pharmacyOn,
  pharmacyPromise,
  pharmacyShop,
} from "@/lib/pharmacy";
import { naira } from "@/lib/money";
import Shelf from "@/components/Shelf";
import ShelfBar from "@/components/ShelfBar";

export const dynamic = "force-dynamic";

/**
 * The pharmacy counter, which is the same shop on the car's day.
 *
 * Built in the shape of the skincare shelf because it is the same
 * arrangement: one car, a cut off that morning, ordering open every day,
 * and only the waiting changes.
 *
 * What is not the same is what it must say about itself. A shelf of
 * cleansers can get away with a price and a picture; a shelf of medicine
 * cannot. The line under the heading is the whole of our position and it
 * is not in small print: we fetch, we carry, and we do not tell anybody
 * what to take. It says it here, it says it again at checkout, and the
 * terms say it at length.
 */
export default async function PharmacyPage({
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
  const shop = await pharmacyShop();
  if (!pharmacyOn(settings) || !shop) notFound();

  const asked = await searchParams;
  const page = Math.max(1, Number(asked.page ?? 1) || 1);

  const [{ products, total }, facets] = await Promise.all([
    browsePharmacy({
      shelf: asked.shelf,
      brand: asked.brand,
      query: asked.q,
      sort: asked.sort,
      under: Number(asked.under ?? 0) || 0,
      over: Number(asked.over ?? 0) || 0,
      page,
    }),
    pharmacyFacets(),
  ]);

  const drop = nextDrop(settings);
  const bands = pharmacyBands(settings);

  return (
    <div className="-mt-4 space-y-4 pb-36">
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
            {pharmacyPromise(settings)}
          </span>
          <h1 className="font-display text-[min(15vw,7rem)] font-black uppercase leading-[0.86] sm:text-[clamp(3.5rem,8vw,7rem)]">
            From the counter.
            <br />
            To your block.
          </h1>

          {/* Above the fold, above the products, in the shop's loudest
              panel rather than a footnote. Somebody who reads nothing else
              on this page has to read this. */}
          <p className="max-w-[640px] rounded-2xl border-2 border-ink bg-volt/25 px-4 py-3 text-[15px] font-semibold leading-relaxed">
            We are not a pharmacy and nobody here is a pharmacist. We fetch
            what you name and carry it, sealed as the shop sold it. We cannot
            tell you what to take or how much, and we do not carry anything
            that needs a prescription. Ask a pharmacist or a doctor, and read
            what is printed on the packet.
          </p>

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
            {pharmacyBlurb(settings) ||
              `Order any day. Order before ${pharmacyCutOff(settings) || "08:00"} on the morning of the drop and you are on it, otherwise it is the week after.`}{" "}
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
        counter="pharmacy"
        // One drawing for the whole shelf. Guessing off a name draws a
        // parcel for every drug it does not recognise, and a wall of
        // parcels is worse than a wall of the same honest icon.
        drawing="medicine"
        picked={{
          shelf: asked.shelf ?? "",
          brand: asked.brand ?? "",
          q: asked.q ?? "",
          sort: asked.sort ?? "",
          under: asked.under ?? "",
          over: asked.over ?? "",
        }}
      />

      <p className="text-center text-sm text-muted">
        Looking for food?{" "}
        <Link href="/" className="font-semibold text-brand">
          The menu is here
        </Link>
        , delivered today or on the next run. Or read{" "}
        <Link href="/pau-pharmacy" className="font-semibold text-brand">
          how the pharmacy run works
        </Link>
        .
      </p>

      <ShelfBar
        bands={bands}
        when={dropLabel(drop.date)}
        counter="pharmacy"
        href="/pharmacy/checkout"
      />
    </div>
  );
}
