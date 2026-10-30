"use client";

import { useState } from "react";

/** One card on the settings page, as the box below looks it up. */
export type SettingCard = {
  /** The anchor on the page, without the hash. */
  id: string;
  /** What the card calls itself, word for word. */
  title: string;
  /** The category it sits under, said the way the pills say it. */
  where: string;
  /** What somebody would type looking for it, which is almost never its
   *  title: nobody searches for "Restaurants further out", they search for
   *  Ajah. */
  words: string;
};

/**
 * Getting to one setting without knowing which category it was filed under.
 *
 * This page is eighteen cards under nine headings, and the headings are the
 * shop's own filing: what a kitchen further out adds to the fee lives under
 * Delivery fees, which is correct and no use at all to somebody who thinks
 * of it as "the Ajah thing". Every trip to it was a pill, then a scroll
 * past four fee ladders.
 *
 * So the page can be asked. Type a word and the cards that answer to it are
 * listed by name, each a tap away. The categories stay underneath for
 * whoever is browsing rather than looking.
 *
 * Nothing is hidden and nothing is filtered: the list of matches is a list
 * of links, and the page below it is untouched. A box that quietly removed
 * cards would also quietly remove whatever somebody had half typed into
 * one of them.
 */
export default function FindSetting({ cards }: { cards: SettingCard[] }) {
  const [said, setSaid] = useState("");
  const looking = said.trim().toLowerCase();

  const found =
    looking === ""
      ? []
      : cards
          .filter(
            (one) =>
              one.title.toLowerCase().includes(looking) ||
              one.where.toLowerCase().includes(looking) ||
              one.words.toLowerCase().includes(looking)
          )
          .slice(0, 8);

  return (
    <div className="mb-[18px]">
      <input
        className="field field-admin"
        value={said}
        onChange={(event) => setSaid(event.target.value)}
        placeholder="Find a setting: ajah, hours, bank, ice"
        aria-label="Find a setting"
        type="search"
      />

      {looking !== "" && (
        <div className="soft mt-2 p-1.5">
          {found.length === 0 ? (
            <p className="hint px-2 py-2">
              Nothing by that name. The categories below are the whole page.
            </p>
          ) : (
            found.map((one) => (
              <a
                key={one.id}
                href={`#${one.id}`}
                onClick={() => setSaid("")}
                className="flex min-h-[44px] items-center justify-between gap-3 rounded-[10px] px-2.5 py-2 hover:bg-wash"
              >
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold leading-[1.25]">
                    {one.title}
                  </span>
                  <span className="hint block">{one.where}</span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-muted">
                  Go
                </span>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}
