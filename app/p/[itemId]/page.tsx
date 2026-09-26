import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCart from "@/components/AddToCart";

import Thumb from "@/components/Thumb";
import { menuView } from "@/lib/menu";
import { parseBands } from "@/lib/fees";
import { valueBandsOfEach } from "@/lib/areas-server";
import { productNotes, safeSettings } from "@/lib/settings";
import { naira } from "@/lib/money";

export const dynamic = "force-dynamic";

/**
 * What this thing is, in a sentence, for anywhere a sentence is needed.
 *
 * Most of the menu has no description of its own: a kitchen sends a price
 * list, not copy. Search Console counts that as a product card missing its
 * description, and the honest fix is not to invent one but to say the true
 * things we already know, in the order a person would say them.
 */
function saidAbout(
  item: { name: string; description: string; price: number },
  restaurant: string
): string {
  const said = item.description.trim();
  return (
    (said ? `${said} ` : "") +
    `${item.name} from ${restaurant}, ${naira(item.price)}, ` +
    `delivered to Pan-Atlantic University.`
  );
}

/** The dish, the kitchen it comes from, and a canonical of its own. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ itemId: string }>;
}): Promise<Metadata> {
  const { itemId } = await params;
  const menu = await menuView();
  const place = menu.find((m) => m.items.some((i) => i.id === itemId));
  const item = place?.items.find((i) => i.id === itemId);
  if (!place || !item) return {};

  return {
    title: `${item.name} from ${place.restaurant.name}`,
    description: saidAbout(item, place.restaurant.name),
    alternates: { canonical: `/p/${item.id}` },
    openGraph: {
      title: `${item.name} from ${place.restaurant.name}`,
      images: item.imageUrl ? [item.imageUrl] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ itemId: string }>;
  // `line` arrives when this was opened from the cart, so the buy box below
  // starts on the choices already made rather than blank.
  searchParams: Promise<{ line?: string }>;
}) {
  const { itemId } = await params;
  const editingKey = (await searchParams).line ?? "";
  const [menu, settings, valueBandsOf] = await Promise.all([
    menuView(),
    safeSettings(),
    valueBandsOfEach(),
  ]);

  const place = menu.find((m) => m.items.some((i) => i.id === itemId));
  const item = place?.items.find((i) => i.id === itemId);
  if (!place || !item) notFound();

  const alsoFrom = place.items.filter((i) => i.id !== item.id).slice(0, 6);
  const category = place.categories.find((c) => c.id === item.categoryId);

  // What a search engine reads instead of guessing from the page. A price
  // and a yes on availability are what put a dish in a shopping result at
  // all, and both are already on this page for people.
  // What delivery costs, said as a range because it honestly is one: it is
  // charged per order rather than per thing, and a counter that prices by
  // what the shopping comes to has a ladder of its own. The cheapest and the
  // dearest rung are both true, and saying only one of them would not be.
  const ladder = valueBandsOf[place.restaurant.id] ?? parseBands(settings.fee_bands);
  const fees = ladder.map((band) => band.fee).filter((fee) => fee > 0);

  const card = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: item.name,
    description: saidAbout(item, place.restaurant.name),
    image: item.imageUrl || undefined,
    brand: { "@type": "Brand", name: place.restaurant.name },
    offers: {
      "@type": "Offer",
      price: item.price,
      priceCurrency: "NGN",
      availability: item.available
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: "Sudu" },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          currency: "NGN",
          minValue: fees.length > 0 ? Math.min(...fees) : 0,
          maxValue: fees.length > 0 ? Math.max(...fees) : 0,
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "NG",
          addressRegion: "Lagos",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 0,
            maxValue: 1,
            unitCode: "DAY",
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 0,
            maxValue: 2,
            unitCode: "DAY",
          },
        },
      },
    },
  };

  return (
    <div className="space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(card) }}
      />
      <nav className="flex flex-wrap items-center gap-1 text-sm text-muted">
        <Link href="/" className="hover:text-ink">Menu</Link>
        <span>/</span>
        <Link href={`/r/${place.restaurant.href}`} className="hover:text-ink">
          {place.restaurant.name}
        </Link>
        {category && (
          <>
            <span>/</span>
            <span>{category.name}</span>
          </>
        )}
      </nav>

      <div className="grid gap-6 sm:grid-cols-[320px_1fr]">
        <div className="overflow-hidden rounded-2xl bg-paper shadow-card">
          <div className="aspect-[4/3] sm:aspect-square">
            <Thumb src={item.imageUrl} name={item.name} rounded="rounded-none" />
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <Link
              href={`/r/${place.restaurant.href}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"
            >
              <span className="size-6 overflow-hidden rounded-md">
                <Thumb
                  src={place.restaurant.logoUrl}
                  name={place.restaurant.name}
                  rounded="rounded-none"
                />
              </span>
              {place.restaurant.name}
            </Link>

            <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight">
              {item.name}
            </h1>
            <p className="mt-1 text-2xl font-bold text-brand">{naira(item.price)}</p>
            {item.groups.length > 0 && (
              <p className="text-sm text-muted">Before choices below</p>
            )}
            {item.description && (
              <p className="mt-3 text-ink/75">{item.description}</p>
            )}
          </div>

          <AddToCart item={item} restaurant={place.restaurant} editingKey={editingKey} />

          <ul className="space-y-1 border-t border-black/5 pt-4 text-sm text-muted">
            {productNotes(settings, place.restaurant.name).map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      </div>

      {alsoFrom.length > 0 && (
        <section className="space-y-3">
          <h2 className="section-title">More from {place.restaurant.name}</h2>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
            {alsoFrom.map((other) => (
              <Link
                key={other.id}
                href={`/p/${other.id}`}
                className="w-40 shrink-0 overflow-hidden rounded-2xl bg-paper shadow-card"
              >
                <span className="block h-28">
                  <Thumb src={other.imageUrl} name={other.name} rounded="rounded-none" />
                </span>
                <span className="block p-3">
                  <span className="block truncate font-bold">{other.name}</span>
                  <span className="block text-sm text-muted">{naira(other.price)}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
