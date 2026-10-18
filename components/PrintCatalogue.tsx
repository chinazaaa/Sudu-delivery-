"use client";

import { useEffect, useState } from "react";
import Thumb from "@/components/Thumb";
import { waLink } from "@/lib/whatsapp";
import { blanksFor } from "@/lib/printing";
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
  whatsapp,
  here,
}: {
  groups: PrintGroup[];
  /** Our own photographs, by slug. Mostly empty until they are taken. */
  photos: Record<string, string>;
  /** Hands the chosen thing to the form above, for whoever has no
   *  WhatsApp or would rather type. */
  onPick: (name: string) => void;
  whatsapp: string;
  /** This page's own address, so a quote carries a link back to the exact
   *  thing it is about rather than to the shop in general. */
  here: string;
}) {
  const [typed, setTyped] = useState("");
  const [open, setOpen] = useState(groups[0]?.name ?? "");

  /*
   * A link to one item has to open the drawer it lives in.
   *
   * Every quote we send carries one of these, so they go out on WhatsApp
   * and come back weeks later from somebody else's phone. Landing them on
   * a closed drawer would make the link a lie: the thing it names is not
   * on the page until something opens the section holding it.
   */
  useEffect(() => {
    const slug = window.location.hash.replace("#", "");
    if (slug === "") return;
    const holding = groups.find((group) =>
      group.items.some((one) => one.slug === slug)
    );
    if (!holding) return;
    setOpen(holding.name);
    // After the drawer has rendered, or there is nothing to scroll to.
    window.setTimeout(
      () => document.getElementById(slug)?.scrollIntoView({ block: "center" }),
      60
    );
  }, [groups]);

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

  /*
   * The supplier left sixty-five descriptions as the name of the
   * category they are filed under, so the line under "Wilson White Gift
   * Set" read "Branding Material", which the reader can already see. A
   * line that only repeats what is above it is worse than no line.
   */
  const Card = ({
    slug,
    name,
    said,
    group,
  }: {
    slug: string;
    name: string;
    said: string;
    group: string;
  }) => {
    /* Opened the way every other message from this shop opens. The trade
       writes "Hello, I'm interested in"; the shop says "Hi Sudu", and a
       message arriving in the wrong voice reads as a form rather than as
       somebody talking. */
    const ask = waLink(
      whatsapp || null,
      `Hi Sudu, I am interested in: ${name}\n` +
        blanksFor(group)
          .map((one) => `${one}: `)
          .join("\n") +
        `\n\n${here}#${slug}`
    );
    return (
    <li id={slug} className="flex scroll-mt-24 gap-3 py-3">
      <span className="size-16 shrink-0 overflow-hidden rounded-xl">
        <Thumb src={photos[slug] ?? ""} name={name} drawing="print" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-snug">{name}</span>
        {said !== "" && said.trim().toLowerCase() !== group.trim().toLowerCase() && (
          <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{said}</span>
        )}
        {ask ? (
          <a
            href={ask}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-block rounded-full border-2 border-ink bg-volt px-3 py-1 text-sm font-bold text-ink"
          >
            Request a quote
          </a>
        ) : (
          <button
            type="button"
            onClick={() => onPick(name)}
            className="mt-1.5 rounded-full border-2 border-ink bg-volt px-3 py-1 text-sm font-bold text-ink"
          >
            Request a quote
          </button>
        )}
      </span>
    </li>
    );
  };

  return (
    <section id="catalogue" className="scroll-mt-24 space-y-3">
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
                <Card
                  key={one.slug}
                  slug={one.slug}
                  name={one.name}
                  said={one.said}
                  group={one.group}
                />
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
                      group={group.name}
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
