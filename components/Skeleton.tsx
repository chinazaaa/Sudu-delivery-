/**
 * The shapes a page wears while it is still coming.
 *
 * These are not decoration. Every page here reads the database on the way
 * out, so between a tap and the page there is a wait, and a blank screen
 * during that wait is what makes a site feel broken rather than busy. A
 * shape where the real thing goes says the tap landed, and it says roughly
 * what is arriving.
 *
 * The rule each of these follows: same size, same place, same rounding as
 * the real thing, so nothing shifts under a thumb when the page lands.
 */

/** A run of text. Widths vary because real words do. */
export function Line({
  w = "w-full",
  h = "h-4",
  className = "",
}: {
  w?: string;
  h?: string;
  className?: string;
}) {
  return <span className={`sk block rounded-md ${h} ${w} ${className}`} />;
}

/** A photograph, a banner, a logo: anything that is an image when it lands. */
export function Shape({ className = "" }: { className?: string }) {
  return <span className={`sk sk-dark block ${className}`} />;
}

/** The strip along the top saying when the next car leaves. */
export function RunStripSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-paper px-4 py-3 shadow-card">
      <span className="sk sk-dark size-2 shrink-0 rounded-full" />
      <Line w="w-52" />
      <Line w="w-24" className="hidden sm:block" />
    </div>
  );
}

/**
 * One line of a menu. Words on the left, picture on the right, which is the
 * way ItemRow lays it out.
 */
export function ItemRowSkeleton() {
  return (
    <div className="flex w-full items-start gap-4 rounded-2xl bg-paper p-3 shadow-card sm:p-4">
      <span className="min-w-0 flex-1 pt-1">
        <Line w="w-2/3" h="h-5" />
        <Line w="w-full" h="h-3" className="mt-2.5" />
        <Line w="w-1/3" h="h-3" className="mt-2" />
        <Line w="w-20" h="h-4" className="mt-3.5" />
      </span>
      <Shape className="size-24 shrink-0 rounded-xl sm:size-28" />
    </div>
  );
}

/** A restaurant tile on the home page: banner, logo, name, item count. */
export function RestaurantCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-paper shadow-card">
      <Shape className="h-36 rounded-none sm:h-40" />
      <div className="flex items-center gap-3 p-4">
        <Shape className="size-12 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Line w="w-40" h="h-5" />
          <Line w="w-24" h="h-3" />
        </div>
      </div>
    </div>
  );
}

/** A card with a heading and a few lines in it: an order, a run, a payout. */
export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="card space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <Line w="w-44" />
        <Line w="w-16" h="h-3" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }, (_, i) => (
          <Line key={i} w={i % 2 === 0 ? "w-3/4" : "w-1/2"} h="h-3" />
        ))}
      </div>
    </div>
  );
}

/** The page title, and usually a word or two under it. */
export function HeadingSkeleton({ sub = true }: { sub?: boolean }) {
  return (
    <div className="space-y-2">
      <Line w="w-48" h="h-7" />
      {sub && <Line w="w-64" h="h-3.5" />}
    </div>
  );
}
