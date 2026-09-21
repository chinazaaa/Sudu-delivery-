import Link from "next/link";
import Thumb from "@/components/Thumb";

import { liveOccasions, boxesOf, isTimed } from "@/lib/boxes";
import { cheapestBoxes } from "@/lib/box-view";
import { naira } from "@/lib/money";
import { whenLabel } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * Everything the shop has already packed.
 *
 * The home page is the only signpost this shop has: no footer, no menu bar,
 * nobody arriving by search. So this has to say what it is and what it costs
 * in the first thing anybody's eye lands on.
 *
 * Which means a price on every card. "Games night" is a category and
 * categories do not sell anything; "Games night, from ₦32,900 with delivery"
 * is an offer, and the difference is whether a thumb stops.
 */
export default async function OccasionsPage() {
  const occasions = await liveOccasions();
  const boxes = (await Promise.all(occasions.map((one) => boxesOf(one.id)))).flat();
  const from = await cheapestBoxes(boxes);

  const counts = new Map<string, number>();
  for (const box of boxes) {
    if (box.is_extra) continue;
    counts.set(box.occasion_id, (counts.get(box.occasion_id) ?? 0) + 1);
  }

  const worth = occasions.filter((one) => (counts.get(one.id) ?? 0) > 0);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Food for a room full of people</h1>
        <p className="mt-1 text-muted">
          Already worked out. One price with delivery in it, and nothing to
          decide but when you want it.
        </p>
      </div>

      {worth.length === 0 ? (
        <p className="card text-sm text-muted">
          Nothing is packed just now.{" "}
          <Link href="/" className="font-semibold text-brand">
            See what is on
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-3">
          {worth.map((one) => {
            const price = from.get(one.id);
            const boxCount = counts.get(one.id) ?? 0;
            const timed = isTimed(one) && one.happens_at;

            return (
              <li key={one.id}>
                <Link
                  href={`/occasions/${one.slug}`}
                  /* A timed one is the urgent one and should not look like
                     the standing ones beside it. */
                  className={`flex items-stretch gap-3 overflow-hidden rounded-2xl bg-paper text-left shadow-card transition active:scale-[0.99] ${
                    timed ? "ring-2 ring-brand/40" : ""
                  }`}
                >
                  {/* Always something. An empty card is a line of text, and
                      a tint made from the name is at least a shape a thumb
                      can aim at. */}
                  <span className="w-24 shrink-0 sm:w-32">
                    <Thumb src={one.image_url} name={one.name} rounded="" />
                  </span>

                  <span className="min-w-0 flex-1 p-4">
                    {timed && (
                      <span className="mb-1 inline-block rounded-full bg-brand px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                        {one.when_word} {whenLabel(one.happens_at!)}
                      </span>
                    )}

                    <span className="block text-lg font-extrabold leading-tight">
                      {one.name}
                    </span>

                    {one.blurb !== "" && (
                      <span className="mt-0.5 block text-sm text-muted">{one.blurb}</span>
                    )}

                    {/* The whole pitch, on the card. Delivery said out loud,
                        because "included" is the part nobody believes until
                        it is written down. */}
                    {price !== undefined && (
                      <span className="mt-2 block font-bold text-brand-dark">
                        {boxCount === 1 ? "One box" : `${boxCount} boxes`} from{" "}
                        {naira(price)} <span className="font-semibold">· delivery in</span>
                      </span>
                    )}
                  </span>

                  <span className="flex items-center pr-4 text-xl text-muted" aria-hidden>
                    ›
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* Where the builder goes when it exists. Named now so the shape of
          the page does not have to change to make room for it later. */}
      <p className="text-sm text-muted">
        None of these quite right? Everything on the menu is still there.{" "}
        <Link href="/" className="font-semibold text-brand">
          Put your own together
        </Link>
        .
      </p>
    </div>
  );
}
