import {
  ItemRowSkeleton,
  Line,
  RestaurantCardSkeleton,
  RunStripSkeleton,
  Shape,
} from "@/components/Skeleton";

/**
 * The home page, laid out before it arrives: run strip, search, slider,
 * restaurants, then what people are buying.
 *
 * In a route group, which is the whole point of the group. This file used
 * to sit at the root of app/, where a loading file does not belong to the
 * page beside it but to every page under it. So every address in the shop
 * drew the home page's skeleton on the way in, which was wrong on a shelf
 * and absurd on a hamper.
 *
 * It also cost every one of them its status code. A loading file is a
 * Suspense boundary, and a boundary means the response starts streaming
 * before the page has decided anything: by the time notFound() ran, the
 * two hundred had been sent. Every made-up address under a dynamic route
 * answered with a whole page and an OK, which is the soft 404 Google
 * reports and then quietly distrusts the rest of the site for.
 *
 * The group changes no addresses. The home page is still at /.
 */
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
