"use client";

import { useState } from "react";
import Thumb from "@/components/Thumb";
import type { PrintGroup } from "@/lib/printing";

/**
 * What can be printed, with no price on any of it.
 *
 * Every one of these is quoted: a hundred flyers and a thousand are not
 * the same number, and a banner depends on its size. So the catalogue is
 * not a shop and must not look like one. There is no basket and no total,
 * only a way of saying "that one" that fills the form in for you.
 *
 * The point of showing two hundred of them is breadth. Nobody guesses
 * that the people printing their assignment also do roll-up banners, ID
 * cards and mugs unless it is in front of them, and a quote request for a
 * banner is worth a great deal more than one for twelve pages.
 */
export default function PrintCatalogue({
  groups,
  photos,
  onPick,
}: {
  groups: PrintGroup[];
  /** Our own photographs, by slug. Mostly empty until they are taken. */
  photos: Record<string, string>;
  /** Hands the chosen thing to the form above, which is the whole point:
   *  a quote request that already says what it is about. */
  onPick: (name: string) => void;
}) {
  const [typed, setTyped] = useState("");
  const [open, setOpen] = useState(groups[0]?.name ?? "");

  const words = typed.trim().toLowerCase();
  const found =
    words === ""
      ? null
      : groups
          .flatMap((group) =>
            group.items
              .filter(
                (one) =>
                  one.name.toLowerCase().includes(words) ||
                  one.said.toLowerCase().includes(words)
              )
              .map((one) => ({ ...one, group: group.name }))
          )
          .slice(0, 30);

  const Card = ({
    slug,
    name,
    said,
  }: {
    slug: string;
    name: string;
    said: string;
  }) => (
    <li className="flex gap-3 py-3">
      <span className="size-16 shrink-0 overflow-hidden rounded-xl">
        <Thumb src={photos[slug] ?? ""} name={name} drawing="box" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-snug">{name}</span>
        {said !== "" && (
          <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{said}</span>
        )}
        <button
          type="button"
          onClick={() => onPick(name)}
          className="mt-1.5 rounded-full border-2 border-ink bg-volt px-3 py-1 text-sm font-bold text-ink"
        >
          Request a quote
        </button>
      </span>
    </li>
  );

  return (
    <section className="space-y-3">
      <h2 className="font-display text-[32px] font-black uppercase leading-none sm:text-[40px]">
        What we print
      </h2>
      <div className="max-w-[760px] space-y-2.5 leading-relaxed text-ink/80">
        <p>
          Projects, theses and assignments first, then everything else:
          banners, flyers, ID cards, stickers, mugs, shirts, packaging and a
          good deal besides. None of it has a price here because none of it
          has one until we know the size and the quantity, and a hundred
          flyers and a thousand are different jobs. Tap a thing and we come
          back with a number.
        </p>
      </div>

      <div className="relative">
        <input
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder="Search: banner, sticker, ID card, mug…"
          aria-label="Search what we print"
          className="field py-3.5 pl-11"
        />
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
          <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </span>
      </div>

      {found ? (
        <div className="card">
          {found.length === 0 ? (
            <p className="text-sm text-muted">
              Nothing matches that. Ask us anyway: the list is what we are
              asked for most, not everything that can be printed.
            </p>
          ) : (
            <ul className="divide-y divide-black/5">
              {found.map((one) => (
                <Card key={one.slug} slug={one.slug} name={one.name} said={one.said} />
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <div key={group.name} className="card">
              <button
                type="button"
                onClick={() => setOpen(open === group.name ? "" : group.name)}
                aria-expanded={open === group.name}
                className="flex w-full items-center justify-between gap-3 text-left font-semibold"
              >
                <span>{group.name}</span>
                <span className="text-sm font-normal text-muted">
                  {open === group.name ? "Close" : `${group.items.length} items`}
                </span>
              </button>
              {open === group.name && (
                <ul className="mt-1 divide-y divide-black/5">
                  {group.items.map((one) => (
                    <Card
                      key={one.slug}
                      slug={one.slug}
                      name={one.name}
                      said={one.said}
                    />
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
