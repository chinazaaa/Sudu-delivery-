import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import AddToCart from "@/components/AddToCart";

import Thumb from "@/components/Thumb";
import { menuView } from "@/lib/menu";
import { parseBands } from "@/lib/fees";
import { valueBandsOfEach } from "@/lib/areas-server";
import { productNotes, safeSettings } from "@/lib/settings";
import { naira } from "@/lib/money";
import { photoOf } from "@/lib/product-photo";
import { isExtra } from "@/lib/shelf";
import { saidAbout } from "@/lib/product-said";
import { deliveryIn, returnsPolicy } from "@/lib/offer-shipping";

export const dynamic = "force-dynamic";

/** Whether this is the thing that was asked for, by its name or by the uuid
 *  every link sent before the names existed still says. */
const isIt = (item: { id: string; href: string }, ref: string) =>
  item.href === ref || item.id === ref;

/**
 * What this thing is, in a sentence, for anywhere a sentence is needed.
 *
 * Most of the menu has no description of its own: a kitchen sends a price
 * list, not copy. Search Console counts that as a product card missing its
 * description, and the honest fix is not to invent one but to say the true
 * things we already know, in the order a person would say them.
 */
/** The dish, the kitchen it comes from, and a canonical of its own. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ itemId: string }>;
}): Promise<Metadata> {
  const { itemId } = await params;
  const menu = await menuView();
  const place = menu.find((m) => m.items.some((i) => isIt(i, itemId)));
  const item = place?.items.find((i) => isIt(i, itemId));
  if (!place || !item) return {};

  const filed = place.categories.find((one) => one.id === item.categoryId);

  return {
    title: `${item.name} from ${place.restaurant.name}`,
    description: saidAbout(item, place.restaurant.name),
    // The readable address, never the uuid, even when the uuid is what was
    // typed: two addresses for one page split what the page is worth, and
    // the one with the dish's name in it is the one worth having.
    alternates: { canonical: `/p/${item.href}` },
    // A pot of sauce is bought alongside a dish, never looked for. The page
    // stays, because the menu links to it; it is just not offered up.
    robots: isExtra(filed?.name) ? { index: false, follow: true } : undefined,
    openGraph: {
      title: `${item.name} from ${place.restaurant.name}`,
      // Left to fall through to the drawn card in app/opengraph-image.tsx
      // when there is no photo: that card says what the shop is, which is a
      // better thing to paste into a group chat than a plain orange square.
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

  /*
   * The menu on its own first, and nothing else yet.
   *
   * These three used to be awaited together, which read as the faster thing
   * to do and was the reason the redirect below arrived too late to be one.
   * A redirect can only set a status code while the response is still
   * unsent, and waiting on the fee ladders and the settings before deciding
   * meant the page had begun streaming by the time it was decided. Next
   * cannot send a 301 into a response it has already started, so it fell
   * back to a meta refresh at 200: the old address kept answering with a
   * whole page, which is the duplicate this was meant to end.
   *
   * The menu is the only one of the three the decision needs, and it is
   * cached under the "menu" tag, so asking for it by itself costs nothing
   * on the ordinary path where no redirect happens.
   */
  const menu = await menuView();

  const place = menu.find((m) => m.items.some((i) => isIt(i, itemId)));
  const item = place?.items.find((i) => isIt(i, itemId));
  if (!place || !item) notFound();

  /*
   * One page, one address.
   *
   * A dish answers to its uuid as well as its name, because every link ever
   * sent on WhatsApp says the uuid and none of them may break. This sends
   * the old one to the address the rest of the site uses, carrying the cart
   * line along so a tap from the basket still lands on the right choices.
   *
   * Only when there is a name to send it to: without a slug the href is the
   * uuid, and redirecting the uuid to itself is a loop.
   */
  if (item.href !== itemId) {
    const line = editingKey === "" ? "" : `?line=${encodeURIComponent(editingKey)}`;
    permanentRedirect(`/p/${item.href}${line}`);
  }

  // Everything the page itself needs, asked for only once it is settled that
  // this page is the one being drawn.
  const [settings, valueBandsOf] = await Promise.all([
    safeSettings(),
    valueBandsOfEach(),
  ]);

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
    image: photoOf(item, place.restaurant),
    brand: { "@type": "Brand", name: place.restaurant.name },
    offers: {
      "@type": "Offer",
      price: item.price,
      priceCurrency: "NGN",
      availability: item.available
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: "Sudu" },
      shippingDetails: deliveryIn(fees),
      hasMerchantReturnPolicy: returnsPolicy(),
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
                href={`/p/${other.href}`}
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
