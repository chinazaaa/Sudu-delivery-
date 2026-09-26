import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import RestaurantMenu from "@/components/RestaurantMenu";
import Thumb from "@/components/Thumb";
import { menuViewFor } from "@/lib/menu";
import { dealsAt } from "@/lib/coupons";
import { isSkincare } from "@/lib/skincare";
import Deals from "@/components/Deals";

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
        image: place.restaurant.bannerUrl || place.restaurant.logoUrl || undefined,
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
    <div className="space-y-5">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }}
      />
      <div className="relative -mx-4 h-52 overflow-hidden sm:mx-0 sm:h-64 sm:rounded-2xl">
        <Thumb
          src={place.restaurant.bannerUrl}
          name={place.restaurant.name}
          rounded="rounded-none"
          variant="banner"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4 text-white">
          <span className="size-14 shrink-0 overflow-hidden rounded-2xl border-2 border-white/80">
            <Thumb
              src={place.restaurant.logoUrl}
              name={place.restaurant.name}
              rounded="rounded-none"
            />
          </span>
          <div className="min-w-0">
            {/* The name and what this page is: a search for "does KFC
                deliver to PAU" should find a heading that answers it,
                rather than a heading that only says KFC. Clamped to two
                lines, because a long restaurant name plus the rest is more
                than one line on a phone. */}
            <h1 className="line-clamp-2 text-2xl font-extrabold sm:text-3xl">
              {place.restaurant.name} delivery to PAU
            </h1>
            <p className="text-sm text-white/75">
              {place.items.length} item{place.items.length === 1 ? "" : "s"} on
              the menu
            </p>
          </div>
        </div>
      </div>

      {deals.length > 0 && <Deals deals={deals} />}

      {/* Nothing about when it arrives here. They came to this page to read a
          menu, and the answer to "when" belongs at checkout where it is
          actually chosen. */}

      <RestaurantMenu place={place} />

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
