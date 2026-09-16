import Link from "next/link";
import { notFound } from "next/navigation";
import Collection from "@/components/Collection";
import CountdownBanner from "@/components/CountdownBanner";
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
  const others = menu.filter((m) => m.restaurant.id !== restaurantId);

  return (
    <div className="space-y-6">
      {nextRun && (
        <CountdownBanner
          label={`${nextRun.label} batch`}
          cutOffISO={nextRun.cutOffISO}
          cutOffLabel={nextRun.cutOffLabel}
          deliveryWindow={nextRun.deliveryWindow}
          flashFee={nextRun.flashFee}
          flashReason={nextRun.flashReason}
        />
      )}

      <section className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0">
          <Thumb
            src={place.restaurant.bannerUrl}
            name={place.restaurant.name}
            rounded="rounded-none"
            variant="banner"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/50 to-ink/20" />
        </div>

        <div className="relative flex min-h-[200px] flex-col justify-end gap-2 p-6 text-white sm:min-h-[260px]">
          <div className="flex items-center gap-3">
            <span className="size-14 shrink-0 overflow-hidden rounded-2xl border border-white/25">
              <Thumb
                src={place.restaurant.logoUrl}
                name={place.restaurant.name}
                rounded="rounded-none"
              />
            </span>
            <div>
              <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
                {place.restaurant.name}
              </h1>
              <p className="text-sm text-white/75">
                {place.items.length} item{place.items.length === 1 ? "" : "s"} · kitchen
                closes {place.restaurant.closesAt} · collected from Sangotedo
              </p>
            </div>
          </div>
        </div>
      </section>

      <Collection place={place} />

      {others.length > 0 && (
        <section className="space-y-3 border-t border-black/5 pt-6">
          <h2 className="text-lg font-bold">Add from another restaurant</h2>
          <p className="text-sm text-muted">
            Mixing restaurants costs no extra delivery.
          </p>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {others.map((other) => (
              <Link
                key={other.restaurant.id}
                href={`/r/${other.restaurant.id}`}
                className="w-56 shrink-0 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-card transition hover:-translate-y-0.5"
              >
                <span className="block h-28">
                  <Thumb
                    src={other.restaurant.bannerUrl || other.restaurant.logoUrl}
                    name={other.restaurant.name}
                    rounded="rounded-none"
                    variant={other.restaurant.bannerUrl ? "tile" : "banner"}
                  />
                </span>
                <span className="block p-3">
                  <span className="block font-bold">{other.restaurant.name}</span>
                  <span className="block text-sm text-muted">
                    {other.items.length} item{other.items.length === 1 ? "" : "s"}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
