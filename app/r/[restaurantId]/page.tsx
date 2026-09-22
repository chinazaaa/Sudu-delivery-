import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import RestaurantMenu from "@/components/RestaurantMenu";
import Thumb from "@/components/Thumb";
import { menuViewFor } from "@/lib/menu";
import { dealsAt } from "@/lib/coupons";
import { isSkincare } from "@/lib/skincare";
import Deals from "@/components/Deals";

export const dynamic = "force-dynamic";

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
