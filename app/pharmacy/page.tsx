import type { Metadata } from "next";
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
import { deliverySlots } from "@/lib/same-day";
import { hoursByDay, sameDayPricing } from "@/lib/settings";
import { shelfSeo } from "@/lib/shelf-seo";
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
/**
 * A shelf's own title and its own address.
 *
 * Written here rather than in the layout because a layout cannot see what
 * was asked for, and the thing worth saying about this page is which shelf
 * or whose brand it is showing. See lib/shelf-seo.ts: a hundred and eighty
 * of these addresses are in the sitemap, and until now every one of them
 * told Google it was a copy of the bare counter.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Asked>;
}): Promise<Metadata> {
  const asked = await searchParams;
  const [shop, facets] = await Promise.all([
    pharmacyShop().catch(() => null),
    pharmacyFacets().catch(() => ({ shelves: [], brands: [] })),
  ]);

  const seo = shelfSeo({
    path: "/pharmacy",
    shopName: shop?.name ?? "Pharmacy",
    asked,
    facets,
  });

  return {
    // Null leaves the layout's own card alone, which is what the bare
    // counter wants: that one is written by hand.
    ...(seo.title ? { title: seo.title, description: seo.description ?? undefined } : {}),
    alternates: { canonical: seo.canonical },
    robots: seo.noindex ? { index: false, follow: false } : undefined,
  };
}

/** What the filters above the shelf put in the address. */
type Asked = {
  shelf?: string;
  brand?: string;
  q?: string;
  sort?: string;
  under?: string;
  over?: string;
  page?: string;
};

export default async function PharmacyPage({
  searchParams,
}: {
  searchParams: Promise<Asked>;
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

  /*
   * Whether somebody could have it today instead.
   *
   * Medicine is the counter where waiting until Saturday is sometimes not
   * an answer, so the other way is offered here rather than discovered at
   * the checkout. Only where there is actually a slot left: an offer of a
   * car today, made at eleven at night, is a promise the morning has to
   * break.
   */
  const soon =
    settings.same_day_on === "on"
      ? deliverySlots(new Date(), await hoursByDay()).filter(
          (one) => one.day === "today" || one.day === "tomorrow"
        )
      : [];
  const sameDayFrom = soon.length > 0 ? (await sameDayPricing()).bands[0]?.fee ?? 0 : 0;
  // Said as the soonest it could actually be, because deliveries finish in
  // the evening and "today" printed at ten at night is a promise the clock
  // has already broken.
  const soonest = soon.some((one) => one.day === "today") ? "today" : "tomorrow";

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
            {sameDayFrom > 0 && (
              <span className="flex items-center rounded-full border-2 border-ink bg-paper px-4 py-2 text-sm font-semibold text-ink">
                Or {soonest}, a car of its own · from {naira(sameDayFrom)}
              </span>
            )}
          </div>
          <p className="max-w-[640px] text-[15px] leading-relaxed text-ink/70">
            {pharmacyBlurb(settings) ||
              `Order any day. Order before ${pharmacyCutOff(settings) || "08:00"} on the morning of the drop and you are on it, otherwise it is the week after.`}{" "}
            To PAU, or anywhere in Lagos.
            {sameDayFrom > 0 && (
              <>
                {" "}
                If it cannot wait, choose a time at the checkout and we make
                the trip {soonest} instead, at what a trip costs.
              </>
            )}
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
        href="/pharmacy"
        // The strength and the count live at the end of a drug's name.
        wholeName
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
