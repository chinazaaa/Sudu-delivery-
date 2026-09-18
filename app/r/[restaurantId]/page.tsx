import Link from "next/link";
import { notFound } from "next/navigation";
import RestaurantMenu from "@/components/RestaurantMenu";
import Thumb from "@/components/Thumb";
import { menuViewFor } from "@/lib/menu";

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

      {/* Nothing about when it arrives here. They came to this page to read a
          menu, and the answer to "when" belongs at checkout where it is
          actually chosen. */}

      <RestaurantMenu place={place} />
    </div>
  );
}
