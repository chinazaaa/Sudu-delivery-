import Link from "next/link";

import { liveOccasions, boxesAcross, isTimed, onShelf, type Shelf } from "@/lib/boxes";
import { cheapestBoxes } from "@/lib/box-view";
import { naira } from "@/lib/money";
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
  kind: Shelf | "all";
  /** Where one of these lives, so a card links to its own word. */
  base: string;
  title: string;
  blurb: string;
  /** What to say when this shelf is bare. */
  empty: string;
  /** Where else to look when this shelf is bare. */
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

  // The shelf's own order decides the tiers, the way the board lays them
  // out: the first across the whole width in Tomato, the next on Ink, and
  // everything after that as the white cards.
  //
  // By position rather than by whether it has a date on it. Nearly nothing
  // on the collections shelf has a date, so a rule about dates left that
  // whole page as a flat grid of white cards and the lead card appeared on
  // no page at all. Which one leads is the shop's decision, and the shop
  // already has a way of saying it: the order it put them in.
  const [lead = null, second = null, ...rest] = worth;

  /** The small word on a card: the shop's own, or the date, or nothing. */
  const tagOf = (one: (typeof worth)[number]): string =>
    one.tag !== ""
      ? one.tag
      : isTimed(one) && one.happens_at
        ? `${one.when_word} ${whenLabel(one.happens_at)}`
        : "";

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
          {/* The one the shop put first, across the whole width and in
              Tomato. */}
          {lead && (
            <Link
              href={`${base}/${lead.slug}`}
              className="flex min-h-[280px] flex-col justify-between gap-5 rounded-2xl border-2 border-ink bg-brand p-6 text-white shadow-[8px_8px_0_#15110e] sm:col-span-2 sm:p-7 lg:col-span-3"
            >
              {tagOf(lead) !== "" && (
                <span className="ticket self-start bg-ink px-2.5 py-1 text-volt">
                  {tagOf(lead)}
                </span>
              )}
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

          {second && (
            <Link
              href={`${base}/${second.slug}`}
              className="flex min-h-[240px] flex-col gap-3 rounded-2xl border-2 border-ink bg-ink p-6 text-shell transition active:translate-x-0.5 active:translate-y-0.5"
            >
              {tagOf(second) !== "" && (
                <span className="ticket self-start bg-volt px-2.5 py-1 text-ink">
                  {tagOf(second)}
                </span>
              )}
              <span className="break-words font-display text-[34px] font-extrabold uppercase leading-[0.9] sm:text-[40px]">
                {second.name}
              </span>
              {second.blurb !== "" && (
                <span className="leading-relaxed text-rail-text">
                  {second.blurb}
                </span>
              )}
              <span className="mt-auto font-semibold text-volt">
                {said(counts.get(second.id) ?? 0, from.get(second.id))}
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
                className="flex min-h-[240px] flex-col gap-3 rounded-2xl border-2 border-ink bg-paper p-6 transition active:translate-x-0.5 active:translate-y-0.5"
              >
                {tagOf(one) !== "" && (
                  <span className="ticket self-start bg-ink px-2.5 py-1 text-volt">
                    {tagOf(one)}
                  </span>
                )}
                <span className="break-words font-display text-[34px] font-extrabold uppercase leading-[0.9] sm:text-[40px]">
                  {one.name}
                </span>
                {one.blurb !== "" && (
                  <span className="leading-relaxed text-ink/70">{one.blurb}</span>
                )}

                <span className="mt-auto flex items-end justify-between gap-3 border-t-2 border-dashed border-line pt-3">
                  <span className="flex flex-col">
                    <span className="ticket text-muted">From · delivery in it</span>
                    <span className="font-display text-[30px] font-extrabold leading-none">
                      {price === undefined ? "—" : naira(price)}
                    </span>
                  </span>
                  <span className="ticket bg-ink px-2 py-1 text-volt">
                    {boxCount} box{boxCount === 1 ? "" : "es"}
                  </span>
                </span>
              </Link>
            );
          })}

          {/* Never a dead end: the menu, as a card of its own. */}
          <Link
            href="/products"
            className="flex min-h-[240px] flex-col justify-between gap-3 rounded-2xl border-2 border-ink bg-volt p-6 text-ink transition active:translate-x-0.5 active:translate-y-0.5"
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
        <section className="bleed border-t-2 border-ink bg-paper">
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
