import Link from "next/link";

import { liveOccasions, boxesAcross, isTimed, onShelf, type Shelf } from "@/lib/boxes";
import { cheapestBoxes } from "@/lib/box-view";
import { naira } from "@/lib/money";
import Thumb from "./Thumb";
import { whenLabel } from "@/lib/time";

/**
 * One shelf of boxes: the collections, or the occasions.
 *
 * Both shelves are the same card with the same pitch on it, and the only
 * difference is what is standing on them and what the page above calls it.
 * Written once so the two can never drift apart.
 *
 * Which means a price on every card. "Games night" is a category and
 * categories do not sell anything; "Games night, from ₦32,900 with delivery"
 * is an offer, and the difference is whether a thumb stops.
 */
export default async function BoxShelf({
  kind,
  base,
  title,
  blurb,
  empty,
  other,
}: {
  kind: Shelf;
  /** Where one of these lives, so a card links to its own word. */
  base: string;
  title: string;
  blurb: string;
  /** What to say when this shelf is bare. */
  empty: string;
  /** The other shelf, offered rather than hidden: somebody who came for a
   *  birthday box and found none should be told where the rest are. */
  other: { href: string; said: string };
}) {
  const all = await liveOccasions();
  const mine = onShelf(all, kind);
  const boxes = await boxesAcross(mine.map((one) => one.id));
  const from = await cheapestBoxes(boxes);

  const counts = new Map<string, number>();
  for (const box of boxes) {
    if (box.is_extra) continue;
    counts.set(box.occasion_id, (counts.get(box.occasion_id) ?? 0) + 1);
  }

  const worth = mine.filter((one) => (counts.get(one.id) ?? 0) > 0);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">{title}</h1>
        <p className="mt-1 text-muted">{blurb}</p>
      </div>

      {worth.length === 0 ? (
        <p className="card text-sm text-muted">
          {empty}{" "}
          <Link href={other.href} className="font-semibold text-brand">
            {other.said}
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
                  href={`${base}/${one.slug}`}
                  /* A timed one is the urgent one and should not look like
                     the standing ones beside it. */
                  className={`flex items-center gap-3 overflow-hidden rounded-2xl bg-paper text-left shadow-card transition active:scale-[0.99] ${
                    timed ? "ring-2 ring-brand/40" : ""
                  }`}
                >
                  {/* A picture, because a shelf of text reads as a list of
                      links rather than a shop. */}
                  <span className="block aspect-square w-24 shrink-0 self-center sm:w-28">
                    <Thumb
                      src={one.image_url}
                      name={one.name}
                      rounded=""
                      variant="banner"
                    />
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

      {/* The other shelf, and then the menu. Neither of these is a dead end. */}
      {worth.length > 0 && (
        <p className="text-sm text-muted">
          Not what you are after?{" "}
          <Link href={other.href} className="font-semibold text-brand">
            {other.said}
          </Link>
          , or{" "}
          <Link href="/products" className="font-semibold text-brand">
            put your own together
          </Link>
          .
        </p>
      )}
    </div>
  );
}
