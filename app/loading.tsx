import {
  ItemRowSkeleton,
  Line,
  RestaurantCardSkeleton,
  RunStripSkeleton,
  Shape,
} from "@/components/Skeleton";

/** The home page, laid out before it arrives: run strip, search, slider,
 *  restaurants, then what people are buying. */
export default function LoadingHome() {
  return (
    <div className="space-y-6">
      <RunStripSkeleton />

      <div className="sk h-[3.75rem] rounded-xl" />

      <Shape className="h-64 rounded-2xl sm:h-80" />

      <section className="space-y-3">
        <Line w="w-36" h="h-6" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <RestaurantCardSkeleton key={i} />
          ))}
        </div>
      </section>

      <section className="space-y-3 pb-28">
        <Line w="w-44" h="h-6" />
        {[0, 1, 2].map((i) => (
          <ItemRowSkeleton key={i} />
        ))}
      </section>
    </div>
  );
}
