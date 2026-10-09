import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import RestaurantMenu from "@/components/RestaurantMenu";
import Thumb from "@/components/Thumb";
import { menuViewFor } from "@/lib/menu";
import { dealsAt } from "@/lib/coupons";
import { isSkincare } from "@/lib/skincare";
import Deals from "@/components/Deals";
import { photoOf } from "@/lib/product-photo";
import { openBatches } from "@/lib/batches";
import { toBatchView } from "@/lib/view";
import { nextArrival, runArrival } from "@/lib/arrival";
import { deliverySlots, slotsWorthOffering } from "@/lib/same-day";
import { hoursByDay, safeSettings } from "@/lib/settings";
import { parseAreas } from "@/lib/areas";
import { activeBands } from "@/lib/settings";
import { lagosToday } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * This restaurant's own title, description and address.
 *
 * Every one of these pages used to be called "Sudu, your fav foods to PAU"
 * and claim to be the front page, so a search for a restaurant by name had
 * nothing of ours to find.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}): Promise<Metadata> {
  const { restaurantId } = await params;
  const place = await menuViewFor(restaurantId);
  if (!place) return {};

  const name = place.restaurant.name;
  const count = place.items.length;
  return {
    title: `${name} delivery to PAU`,
    description:
      `Order ${name} from Sangotedo to Pan-Atlantic University. ` +
      `${count} thing${count === 1 ? "" : "s"} on the menu, one delivery ` +
      `between everybody on the run.`,
    alternates: { canonical: `/r/${place.restaurant.href}` },
    openGraph: {
      title: `${name} delivery to PAU`,
      images: place.restaurant.bannerUrl ? [place.restaurant.bannerUrl] : undefined,
    },
  };
}

export default async function RestaurantPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;
  // Only the menu now. The runs were fetched to draw a strip this page no
  // longer has, and fetching them was the slowest thing it did.
  const place = await menuViewFor(restaurantId);
  // The skincare shelf has its own page, its own basket and its own day, and
  // this one would put its products in the food cart. Anybody who reached
  // here wanted the shelf, so they are sent to it rather than turned away.
  if (!place && (await isSkincare(restaurantId))) redirect("/skincare");
  if (!place) notFound();

  // One page, one address. A restaurant answers to its id as well as its
  // name, because every link ever pasted into a group chat says the id and
  // none of them may break. A canonical tag asks a search engine to treat
  // them as one page; this settles it before anybody has to be asked, and
  // sends the old link to the address the rest of the site uses.
  //
  // Only when there is a name to send it to: without a slug the href is the
  // id, and redirecting the id to itself is a loop.
  if (place.restaurant.href !== restaurantId) {
    permanentRedirect(`/r/${place.restaurant.href}`);
  }

  // Everything on offer here, in one place somebody can look on purpose
  // rather than find by accident.
  const deals = await dealsAt(place.restaurant.id, place.restaurant.name);

  // The three things the board puts under the name.
  //
  // Where the kitchen is, by the area's own name as admin writes it, so a
  // restaurant that moves area is a dropdown rather than a deploy. And when
  // the next car goes, worked out by exactly the rule the front page and the
  // checkout use, so no two pages of ours can promise different days.
  const [settings, batches, bands] = await Promise.all([
    safeSettings(),
    openBatches(),
    activeBands(),
  ]);
  const areas = parseAreas(settings.delivery_areas);
  const area =
    place.restaurant.areaId === ""
      ? ""
      : areas.find((one) => one.id === place.restaurant.areaId)?.name ?? "";

  const slots =
    settings.same_day_on === "on"
      ? slotsWorthOffering(
          deliverySlots(new Date(), await hoursByDay()),
          batches.map((one) => ({
            run_date: one.run_date,
            window: one.delivery_window_text,
          }))
        )
      : [];
  const arriving =
    nextArrival(
      batches
        .map(toBatchView)
        .filter((one) => !one.closed && !one.full)
        .map(runArrival),
      slots,
      lagosToday()
    )?.said ?? "";

  // What they sell, in their own words: the menu's own sections, lower
  // cased, up to four. Read from the menu so it can never describe a
  // kitchen that has changed what it does.
  const kinds = place.categories
    .map((one) => one.name.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 4);
  const sections =
    kinds.length > 1
      ? `Choose from ${kinds.slice(0, -1).join(", ")} and ${kinds[kinds.length - 1]}.`
      : kinds.length === 1
        ? `Choose from the ${kinds[0]}.`
        : "";

  // Who is who, said in the form a machine reads.
  //
  // The restaurant is the restaurant and Sudu is the courier: marking this
  // page as a Sudu restaurant would claim we cook, and marking the courier
  // as the seller of a pizza would claim Domino's drives to campus. Both are
  // wrong in ways that are hard to undo once they are believed.
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store";
  const here = `${site}/r/${place.restaurant.href}`;
  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Restaurant",
        "@id": `${here}#restaurant`,
        name: place.restaurant.name,
        image: photoOf({}, place.restaurant),
        url: here,
        servesCuisine: kinds.length > 0 ? kinds : undefined,
      },
      {
        // The trip itself, which is the part that is ours.
        "@type": "Service",
        name: `${place.restaurant.name} delivery to Pan-Atlantic University`,
        serviceType: "Food delivery",
        provider: { "@type": "Organization", name: "Sudu", url: site },
        areaServed: {
          "@type": "Place",
          name: "Pan-Atlantic University, Ibeju-Lekki, Lagos",
        },
        about: { "@id": `${here}#restaurant` },
      },
      {
        // The menu itself, readable. Each dish is a Product with a price in
        // naira and whether it can be had today, made by the restaurant and
        // sold by us, which is the same shape the dish's own page uses.
        //
        // Capped, because a market with two hundred and seventy lines would
        // be a hundred kilobytes of JSON on a page somebody is trying to
        // read on a phone, and the dishes each have a page of their own in
        // the sitemap anyway.
        "@type": "ItemList",
        name: `${place.restaurant.name} menu`,
        numberOfItems: place.items.length,
        itemListElement: place.items.slice(0, 60).map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "Product",
            name: item.name,
            description: item.description || undefined,
            image: photoOf(item, place.restaurant),
            url: `${site}/p/${item.id}`,
            brand: { "@type": "Brand", name: place.restaurant.name },
            offers: {
              "@type": "Offer",
              price: item.price,
              priceCurrency: "NGN",
              availability: item.available
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
              seller: { "@type": "Organization", name: "Sudu" },
            },
          },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Sudu", item: site },
          {
            "@type": "ListItem",
            position: 2,
            name: "Every menu",
            item: `${site}/products`,
          },
          { "@type": "ListItem", position: 3, name: place.restaurant.name, item: here },
        ],
      },
    ],
  };

  return (
    <div className="-mt-4 space-y-5">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }}
      />
      {/* The name, as big as the board draws it, on Ink.

          It was a photograph of the shopfront with the name over a
          gradient, which is every delivery app and reads as somebody
          else's brand rather than ours. The board puts the name in the
          display face on a black band with the speed stripes behind it,
          and the three things somebody needs before they read a menu
          underneath: where it is, when the next car goes, and that mixing
          kitchens costs nothing extra. */}
      <section className="bleed relative overflow-hidden bg-ink text-shell">
        <span
          aria-hidden
          className="absolute inset-y-0 -right-10 w-[38%] opacity-85"
          style={{
            background:
              "repeating-linear-gradient(-60deg,#e5321d 0 7px,transparent 7px 16px)",
          }}
        />
        <div className="shell relative flex flex-col gap-3 pb-6 pt-5 sm:gap-4 sm:pb-11 sm:pt-7">
          <nav aria-label="Breadcrumb" className="ticket flex gap-2 text-[#b9b0a5]">
            <Link href="/" className="text-[#b9b0a5] hover:text-volt">
              Home
            </Link>
            <span aria-hidden>/</span>
            <Link href="/products" className="text-[#b9b0a5] hover:text-volt">
              Restaurants
            </Link>
            <span aria-hidden>/</span>
            <span className="text-volt">{place.restaurant.name}</span>
          </nav>

          <h1 className="font-display text-[min(21.5vw,5.25rem)] font-black uppercase leading-[0.85] sm:text-[clamp(4rem,9vw,7.5rem)]">
            {place.restaurant.name}
          </h1>
          {/* The sentence a search engine needs, which the headline used
              to carry at the cost of being four words long. */}
          <span className="sr-only">
            {place.restaurant.name} delivery to Pan-Atlantic University
          </span>

          <div className="flex flex-wrap gap-1.5 text-[13px] sm:gap-2 sm:text-sm">
            {area !== "" && (
              <span className="flex items-center gap-1.5 rounded-full border border-[#4a423b] px-2.5 py-1 sm:px-3 sm:py-1.5">
                <Pin />
                {area}
              </span>
            )}
            {arriving !== "" && (
              <span className="flex items-center gap-1.5 rounded-full border border-[#4a423b] px-2.5 py-1 sm:px-3 sm:py-1.5">
                <Clock />
                Next run {arriving}
              </span>
            )}
            {place.restaurant.closedDays !== "" && (
              <span className="flex items-center gap-1.5 rounded-full border border-[#4a423b] px-2.5 py-1 sm:px-3 sm:py-1.5">
                {place.restaurant.closedDays}
              </span>
            )}
            <span className="rounded-full bg-volt px-2.5 py-1 font-semibold text-ink sm:px-3 sm:py-1.5">
              Mix with any other kitchen, same fee
            </span>
          </div>
        </div>
      </section>

      {deals.length > 0 && <Deals deals={deals} />}

      {/* Nothing about when it arrives here. They came to this page to read a
          menu, and the answer to "when" belongs at checkout where it is
          actually chosen. */}

      <RestaurantMenu place={place} bands={bands} />

      {/* Under the menu, on purpose. The relationship between a restaurant,
          this shop and the campus is the thing people search for, and a list
          of dishes leaves all of it to be guessed at, so it has to be
          somewhere on the page. But nobody arrived here to read a paragraph
          about delivery: they came for the food, and the food goes first. */}
      <p className="text-sm leading-relaxed text-muted">
        Order {place.restaurant.name} through Sudu and have it delivered to
        your Pan-Atlantic University hostel. {sections}{" "}
        You can add things from other restaurants to the same order, and the
        one delivery is shared between everybody on the run.
      </p>
    </div>
  );
}

/** Where it is. */
function Pin() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

/** When the next car goes. */
function Clock() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
