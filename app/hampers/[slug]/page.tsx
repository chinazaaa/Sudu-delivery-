import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";

import { boxBySlug, isTimed } from "@/lib/boxes";
import { boxViews, whenOptions, type WhenOption } from "@/lib/box-view";
import { furthest, soonestStandard } from "@/lib/box-day";
import { SYMBOL, moniesOn, rateFor } from "@/lib/abroad";
import { hostelNames } from "@/lib/hostels";
import { currentCustomer, customerDetails } from "@/lib/customer-auth";
import { safeSettings } from "@/lib/settings";
import { namedPromoters } from "@/lib/promoters";
import { WHO_COOKIE } from "@/lib/came-from";
import { lagosToday } from "@/lib/time";
import { naira } from "@/lib/money";
import { ESTIMATE_NOTE } from "@/lib/arrival";
import { deliveryIn, returnsPolicy } from "@/lib/offer-shipping";
import OccasionBoxes from "@/components/OccasionBoxes";
import NoSeasonDecor from "@/components/NoSeasonDecor";
import Thumb from "@/components/Thumb";
import HelpLine from "@/components/HelpLine";

export const dynamic = "force-dynamic";

/**
 * One hamper, at an address of its own.
 *
 * A shelf is one page with six things on it, which is one thing for a
 * search engine to match and one link to send somebody who means the third
 * one down. This is the other way round: a title, a photograph, a price and
 * a list of what is inside, all about one hamper, so it can be found,
 * quoted, shared and marked up as the product it is.
 *
 * Only boxes given an address answer here. Everything else is still picked
 * in place on its shelf, which is right for dinner: nobody searches for the
 * pizza box, they search for pizza.
 */
const found = async (slug: string) => {
  const hit = await boxBySlug(slug);
  if (!hit) return null;
  const [view] = await boxViews([hit.box]).catch(() => []);
  if (!view) return null;
  return { ...hit, view };
};

/** What one of these costs, delivery in it, which is the only price the
 *  shop ever quotes on a box. */
const costs = (view: { food: number; runFee: number }) => view.food + view.runFee;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const hit = await found(slug);
  if (!hit) return {};

  const price = naira(costs(hit.view));
  const said =
    hit.view.contents.length > 0
      ? `${hit.view.contents.length} things in a basket: ${hit.view.contents
          .slice(0, 8)
          .join(", ")}. ${price}, delivery to Lagos included.`
      : `${hit.view.blurb || hit.box.name}. ${price}, delivery included.`;

  return {
    title: `${hit.box.name} · ${price} delivered`,
    description: said.slice(0, 300),
    alternates: { canonical: `/hampers/${hit.box.slug}` },
    openGraph: {
      title: `${hit.box.name} · ${price}`,
      description: said.slice(0, 300),
      images: hit.view.imageUrl ? [hit.view.imageUrl] : undefined,
    },
  };
}

export default async function HamperPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const hit = await found(slug);
  if (!hit) notFound();

  const { box, occasion, view } = hit;
  const signedIn = await currentCustomer();

  // All at once, and none of it allowed to take the page down with it. A
  // throw here is the error boundary, which is a stranger's page where an
  // offer should be.
  const [when, hostels, promoters, me, settings] = await Promise.all([
    whenOptions(occasion, box).catch((): WhenOption[] => []),
    hostelNames().catch((): string[] => []),
    namedPromoters().catch(() => [] as { code: string; name: string }[]),
    signedIn ? customerDetails(signedIn).catch(() => null) : Promise.resolve(null),
    safeSettings(),
  ]);

  const fromLink = (await cookies()).get(WHO_COOKIE)?.value ?? "";
  const sentBy = promoters.find((one) => one.code === fromLink)?.code ?? "";

  // What a search engine reads instead of guessing. The price is the one
  // the page quotes, delivery in it, because that is what somebody pays.
  const card = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: box.name,
    description:
      view.contents.length > 0
        ? view.contents.join(", ")
        : view.blurb || box.name,
    image: view.imageUrl || undefined,
    brand: { "@type": "Brand", name: "Sudu" },
    offers: {
      "@type": "Offer",
      url: `/hampers/${box.slug}`,
      price: costs(view),
      priceCurrency: "NGN",
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: "Sudu" },
      shippingDetails: deliveryIn([0]),
      hasMerchantReturnPolicy: returnsPolicy(),
    },
  };

  return (
    <div className="-mt-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(card) }}
      />

      {/* A shelf with a season of its own is already dressed. */}
      {occasion.starts_at !== null && <NoSeasonDecor />}

      <header className="bleed relative overflow-hidden bg-ink text-shell">
        <span
          aria-hidden
          className="absolute inset-y-0 -right-10 w-[34%] opacity-85"
          style={{
            background:
              "repeating-linear-gradient(-60deg,#e5321d 0 7px,transparent 7px 16px)",
          }}
        />
        <div className="shell relative flex flex-col gap-4 pb-9 pt-6 sm:gap-5 sm:pb-12 sm:pt-7">
          <nav aria-label="Breadcrumb" className="ticket flex flex-wrap gap-2 text-[#b9b0a5]">
            <Link href="/" className="text-[#b9b0a5] hover:text-volt">
              Home
            </Link>
            <span aria-hidden>/</span>
            <Link
              href={`/collections/${occasion.slug}`}
              className="text-[#b9b0a5] hover:text-volt"
            >
              {occasion.name}
            </Link>
            <span aria-hidden>/</span>
            <span className="text-volt">{box.name}</span>
          </nav>

          <h1 className="break-words font-display text-[min(13vw,5.5rem)] font-black uppercase leading-[0.86]">
            {box.name}
          </h1>

          {view.blurb !== "" && (
            <p className="max-w-[560px] text-[17px] leading-snug text-rail-text sm:text-xl">
              {view.blurb}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span className="ticket bg-volt px-2.5 py-1.5 text-ink">
              {naira(costs(view))} · delivery in it
            </span>
            {view.serves !== "" && (
              <span className="ticket border-2 border-shell px-2.5 py-1.5">
                {view.serves}
              </span>
            )}
            <span className="ticket border-2 border-shell px-2.5 py-1.5">
              Fully customisable
            </span>
          </div>
        </div>
      </header>

      <div className="space-y-5 py-8">
        {view.imageUrl !== "" && (
          <div className="overflow-hidden rounded-2xl border-2 border-ink bg-paper">
            <span className="block aspect-square sm:aspect-[4/3]">
              <Thumb src={view.imageUrl} name={box.name} rounded="" />
            </span>
          </div>
        )}

        {/* The same form the shelf uses, with this one already chosen,
            because choosing it is why anybody is on this page. */}
        <OccasionBoxes
          slug={occasion.slug}
          boxes={[view]}
          when={when}
          only
          timed={isTimed(occasion) && occasion.starts_at === null}
          hint={occasion.custom_hint}
          monies={moniesOn(settings).map((code) => ({
            code,
            label: code === "GBP" ? "Pounds" : "Dollars",
            symbol: SYMBOL[code],
            rate: rateFor(settings, code),
          }))}
          today={lagosToday()}
          soonest={
            occasion.starts_at
              ? occasion.starts_at.slice(0, 10) > soonestStandard()
                ? occasion.starts_at.slice(0, 10)
                : soonestStandard()
              : soonestStandard()
          }
          latest={
            occasion.starts_at && occasion.happens_at
              ? occasion.happens_at.slice(0, 10)
              : furthest()
          }
          hostels={hostels}
          promoters={promoters.map((one) => ({ code: one.code, name: one.name }))}
          sentBy={sentBy}
          me={me}
          note={ESTIMATE_NOTE}
          shut={isTimed(occasion) && when.length === 0}
          seasonal={occasion.starts_at !== null}
          whatsapp={settings.whatsapp_number}
        />

        <p className="text-sm">
          <Link
            href={`/collections/${occasion.slug}`}
            className="font-semibold text-brand underline-offset-4 hover:underline"
          >
            See the other {occasion.item_word}s
          </Link>
        </p>

        <HelpLine number={settings.whatsapp_number} about={box.name} />
      </div>
    </div>
  );
}
