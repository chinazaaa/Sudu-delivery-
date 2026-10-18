import { naira } from "@/lib/money";
import type { PricedGroup } from "@/lib/laundry";

/**
 * The price list, by the kind of thing rather than one list of two hundred.
 *
 * Folded shut, each section its own. Two hundred and eighty rows laid out
 * flat is a wall nobody reads, and the person looking at this page wants
 * one answer: what does a shirt cost. The sections are the shape the trade
 * already uses and the shape people already think in.
 */
export default function LaundryPrices({
  groups,
  minimum,
  note,
}: {
  groups: PricedGroup[];
  /** The basket worth sending a car for. Zero says nothing at all rather
   *  than promising there is no minimum. */
  minimum: number;
  note: string;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-[32px] font-black uppercase leading-none sm:text-[40px]">
        What it costs
      </h2>

      <div className="max-w-[760px] space-y-2.5 leading-relaxed text-ink/80">
        <p>
          Priced per item, because a blouse and a duvet are not the same job.
          Collection from your block and the trip back are included.
          {minimum > 0 ? (
            <>
              {" "}
              There is a minimum of{" "}
              <span className="font-semibold text-ink">{naira(minimum)}</span>{" "}
              on a collection: under that it is not worth a car, so gather a
              few things or go in with somebody on your floor.
            </>
          ) : null}
        </p>
        {note !== "" && <p>{note}</p>}
      </div>

      <div className="space-y-2 pt-1">
        {groups.map((group) => (
          <details key={group.name} className="card">
            <summary className="flex cursor-pointer items-center justify-between gap-3 font-semibold">
              <span>{group.name}</span>
              <span className="text-sm font-normal text-muted">
                {group.items.length} item{group.items.length === 1 ? "" : "s"}
              </span>
            </summary>
            <ul className="mt-3 divide-y divide-black/5">
              {group.items.map((one) => (
                <li
                  key={one.name}
                  className="flex items-baseline justify-between gap-4 py-1.5 text-[15px]"
                >
                  <span className="min-w-0">{one.name}</span>
                  <span className="shrink-0 font-mono font-semibold">
                    {naira(one.price)}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>

      <p className="max-w-[760px] text-sm text-muted">
        Anything not on this list, ask and we will price it. Prices are for
        items in ordinary condition: something that needs a stain treated is
        the stain line as well, and we tell you before it is done rather
        than after.
      </p>
    </section>
  );
}
