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
  ticket = "Packed & ready · delivery in every box",
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
  /** The small line over the headline. */
  ticket?: string;
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

  // The one with a date on it leads the shelf, the way the board leads with
  // whatever is on this term. Everything else is standing stock and goes in
  // the grid in the order admin put it in.
  const lead = worth.find((one) => isTimed(one) && one.happens_at) ?? null;
  const rest = worth.filter((one) => one !== lead);

  return (
    <div className="-mt-4 space-y-0">
      {/* The board's head: the claim, then the name of the thing as big as
          the page allows, on the speed stripes. */}
      <header className="bleed relative overflow-hidden border-b-2 border-ink">
        <span
          aria-hidden
          className="absolute inset-y-0 -right-10 w-[24%]"
          style={{
            background:
              "repeating-linear-gradient(-60deg,#e5321d 0 7px,transparent 7px 16px)",
          }}
        />
        <div className="shell relative flex flex-col gap-4 pb-8 pt-7 sm:gap-5 sm:pb-10 sm:pt-12">
          <span className="ticket text-brand-dark">{ticket}</span>
          <h1 className="font-display text-[min(16vw,7.5rem)] font-black uppercase leading-[0.86] sm:text-[clamp(3.75rem,9vw,7.5rem)]">
            {title}
          </h1>
          <p className="max-w-[560px] text-[17px] leading-relaxed text-ink/80 sm:text-lg">
            {blurb}
          </p>
        </div>
      </header>

      {worth.length === 0 ? (
        <p className="card mt-6 text-sm text-muted">
          {empty}{" "}
          <Link href={other.href} className="font-semibold text-brand">
            {other.said}
          </Link>
          .
        </p>
      ) : (
        <div className="grid gap-4 py-8 sm:grid-cols-2 sm:py-10 lg:grid-cols-3">
          {/* Whatever has a date on it, across the whole width and in
              Tomato, because it is the one on this shelf that stops being
              true. */}
          {lead && (
            <Link
              href={`${base}/${lead.slug}`}
              className="flex min-h-[260px] flex-col justify-between gap-5 rounded-2xl border-2 border-ink bg-brand p-6 text-white shadow-lift sm:col-span-2 sm:p-7 lg:col-span-3"
            >
              <span className="ticket self-start bg-ink px-2.5 py-1 text-volt">
                {lead.when_word} {whenLabel(lead.happens_at!)}
              </span>
              <span className="flex flex-col gap-3">
                <span className="break-words font-display text-[clamp(3rem,7vw,6rem)] font-black uppercase leading-[0.85]">
                  {lead.name}
                </span>
                {lead.blurb !== "" && (
                  <span className="max-w-[440px] text-lg leading-snug">
                    {lead.blurb}
                  </span>
                )}
              </span>
              <span className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-semibold">
                  {said(counts.get(lead.id) ?? 0, from.get(lead.id))}
                </span>
                <span className="flex min-h-12 items-center gap-2 rounded-full bg-ink px-5 font-bold">
                  See the boxes <span aria-hidden>→</span>
                </span>
              </span>
            </Link>
          )}

          {rest.map((one) => {
            const price = from.get(one.id);
            const boxCount = counts.get(one.id) ?? 0;

            return (
              <Link
                key={one.id}
                href={`${base}/${one.slug}`}
                className="flex min-h-[240px] flex-col gap-3 overflow-hidden rounded-2xl border-2 border-ink bg-paper transition active:translate-x-0.5 active:translate-y-0.5"
              >
                {/* The picture, where the shop has set one. A shelf of pure
                    type reads as a list of links rather than a shop, and a
                    card with a stretched placeholder on it reads worse than
                    one with none, so it is the photo or nothing. */}
                {one.image_url !== "" && (
                  <span className="block aspect-[16/9] border-b-2 border-ink">
                    <Thumb
                      src={one.image_url}
                      name={one.name}
                      rounded=""
                      variant="banner"
                    />
                  </span>
                )}

                <span className="flex flex-1 flex-col gap-3 p-5 pt-2">
                  <span className="break-words font-display text-[34px] font-extrabold uppercase leading-[0.9] sm:text-[40px]">
                    {one.name}
                  </span>
                  {one.blurb !== "" && (
                    <span className="leading-relaxed text-ink/70">{one.blurb}</span>
                  )}

                  <span className="mt-auto flex items-end justify-between gap-3 border-t-2 border-dashed border-line pt-3">
                    <span className="flex flex-col">
                      <span className="ticket text-muted">
                        From · delivery in it
                      </span>
                      <span className="font-display text-[30px] font-extrabold leading-none">
                        {price === undefined ? "—" : naira(price)}
                      </span>
                    </span>
                    <span className="ticket bg-ink px-2 py-1 text-volt">
                      {boxCount} box{boxCount === 1 ? "" : "es"}
                    </span>
                  </span>
                </span>
              </Link>
            );
          })}

          {/* Never a dead end: the menu, as a card of its own. */}
          <Link
            href="/products"
            className="flex min-h-[240px] flex-col justify-between gap-3 rounded-2xl border-2 border-ink bg-volt p-5 text-ink transition active:translate-x-0.5 active:translate-y-0.5"
          >
            <span className="font-display text-[34px] font-extrabold uppercase leading-[0.9] sm:text-[40px]">
              Build your own box
            </span>
            <span className="leading-relaxed">
              Pick anything from any kitchen. It all comes in one car.
            </span>
            <span className="flex items-center gap-2 font-bold">
              Open the menu <span aria-hidden>→</span>
            </span>
          </Link>
        </div>
      )}

      {/* The other shelf, and then the menu. Neither of these is a dead end. */}
      {worth.length > 0 && (
        <section className="bleed border-y-2 border-ink bg-paper">
          <div className="shell flex flex-wrap items-center justify-between gap-5 py-10">
            <h2 className="section-title">Not seeing it?</h2>
            <div className="flex flex-wrap gap-3">
              <Link href={other.href} className="btn bg-ink text-white">
                {other.said}
              </Link>
              <Link href="/products" className="btn-quiet">
                Put your own together
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

/** "4 boxes from ₦24,200 · delivery in it", or as much of it as is true. */
function said(count: number, price: number | undefined): string {
  const boxes = count === 1 ? "One box" : `${count} boxes`;
  if (price === undefined) return `${boxes} · delivery in it`;
  return `${boxes} from ${naira(price)} · delivery in it`;
}
