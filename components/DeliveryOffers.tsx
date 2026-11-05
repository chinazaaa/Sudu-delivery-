import Link from "next/link";
import { naira } from "@/lib/money";
import type { DeliveryOffer } from "@/lib/coupons";

/**
 * The delivery promotions, on the sale page beside the counters' own.
 *
 * Drawn as the price it is rather than as a banner: the figure, the
 * ladder struck out behind it, and under that the days and the counters
 * it holds for. Almost every one of these is pinned to a few kitchens, so
 * naming them is the whole point. A figure on its own would read as the
 * price from anywhere and send somebody to a counter it was never on.
 */
export default function DeliveryOffers({ offers }: { offers: DeliveryOffer[] }) {
  if (offers.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="ticket text-brand-dark">
        {offers.length === 1 ? "Delivery offer" : "Delivery offers"}
      </h2>

      <ul className="space-y-2">
        {offers.map((one) => (
          <li
            key={one.code}
            className="rounded-2xl border-2 border-ink bg-white p-3.5 shadow-[3px_3px_0_0_rgba(0,0,0,1)]"
          >
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="font-display text-2xl font-black leading-none">
                {one.fee === 0 ? "Free delivery" : `${naira(one.fee)} delivery`}
              </span>
              {one.was > 0 && (
                <span className="text-[15px] font-semibold text-muted line-through">
                  {naira(one.was)}
                </span>
              )}
              {one.left !== "" && (
                <span className="rounded-full bg-brand px-2.5 py-1 text-xs font-bold text-white">
                  {one.left}
                </span>
              )}
            </p>

            {/* The days and nothing else. The headline above already says
                what delivery costs, and spelling out the ladder under it
                ("for up to 3 items, then ₦500 each") turned a price into
                terms and conditions on the one page somebody is skimming
                for what is cheap. The checkout does the arithmetic. */}
            <p className="pt-1.5 text-[15px] leading-relaxed text-muted">
              {one.days === "" ? "Any day" : one.days}
              {one.firstOrderOnly ? " · first order only" : ""}
            </p>

            {one.places.length === 0 ? (
              <p className="pt-1 text-[15px] leading-relaxed text-muted">
                From every kitchen.
              </p>
            ) : (
              <div className="-mx-0.5 flex flex-wrap gap-1.5 pt-2">
                {one.places.map((place) => (
                  <Link
                    key={place.id}
                    href={`/r/${place.href}`}
                    className="chip shrink-0 border-black/10 bg-white"
                  >
                    {place.name}
                  </Link>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
