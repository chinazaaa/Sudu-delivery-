import Link from "next/link";
import { notFound } from "next/navigation";
import RestaurantMenu from "@/components/RestaurantMenu";
import Thumb from "@/components/Thumb";
import { menuViewFor } from "@/lib/menu";
import { offersByRestaurant } from "@/lib/coupons";
import { offerLine } from "@/lib/offers";

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
  if (!place) notFound();

  // An offer belongs on the page of the food it is for, where somebody is
  // already deciding. The front page only carries the badge that brings them
  // here.
  const offer = (await offersByRestaurant()).get(place.restaurant.id) ?? null;

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

        <Link
          href="/"
          className="absolute left-4 top-4 grid size-9 place-items-center rounded-full bg-paper font-bold shadow-card"
          aria-label="Back to all restaurants"
        >
          ←
        </Link>

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

      {offer && (
        <div className="rounded-2xl border-2 border-brand/30 bg-brand-tint px-4 py-3">
          <p className="font-extrabold text-brand-dark">
            {offer.note.trim() || `${place.restaurant.name} delivery offer`}
          </p>
          <p className="mt-0.5 text-sm text-ink/80">
            {offerLine(offer)} It comes off by itself at checkout, with no code
            to type.
          </p>
          {/* The one condition, said before they build a cart rather than
              after: a second counter is a second stop, and the offer is for
              this one. */}
          <p className="mt-1 text-xs text-ink/70">
            Only while everything in your cart is from {place.restaurant.name}.
          </p>
        </div>
      )}

      {/* Nothing about when it arrives here. They came to this page to read a
          menu, and the answer to "when" belongs at checkout where it is
          actually chosen. */}

      <RestaurantMenu place={place} />
    </div>
  );
}
