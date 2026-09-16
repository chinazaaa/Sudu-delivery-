import Link from "next/link";
import { notFound } from "next/navigation";
import RestaurantMenu from "@/components/RestaurantMenu";
import RunStrip from "@/components/RunStrip";
import Thumb from "@/components/Thumb";
import { openBatches } from "@/lib/batches";
import { menuView } from "@/lib/menu";
import { toBatchView } from "@/lib/view";

export const dynamic = "force-dynamic";

export default async function RestaurantPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;
  const [menu, batches] = await Promise.all([menuView(), openBatches()]);

  const place = menu.find((m) => m.restaurant.id === restaurantId);
  if (!place) notFound();

  const nextRun = batches.length > 0 ? toBatchView(batches[0]) : null;

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
              {place.items.length} item{place.items.length === 1 ? "" : "s"} · closes{" "}
              {place.restaurant.closesAt}
            </p>
          </div>
        </div>
      </div>

      {nextRun && <RunStrip run={nextRun} />}

      <RestaurantMenu place={place} />
    </div>
  );
}
