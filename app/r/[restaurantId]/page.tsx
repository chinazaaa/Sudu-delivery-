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

  return (
    <div className="space-y-5">
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
            <h1 className="truncate text-2xl font-extrabold sm:text-3xl">
              {place.restaurant.name}
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
    </div>
  );
}
