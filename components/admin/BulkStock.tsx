"use client";

import { setManyStock } from "@/app/admin/actions";
import { Picking, showingNow, Tick, usePicked } from "./Picking";

export { Picking, Tick };

/**
 * The bar above the list.
 *
 * Always there, because a control that only appears once you have found it
 * is a control nobody finds. Empty it is one line saying what the ticks are
 * for; with something ticked it is the two buttons.
 *
 * Switching on refuses anything with no price, the same way the single
 * switch does, and says how many it actually moved rather than how many
 * were ticked. An item with no price prints a zero on the menu, and a zero
 * reads as free.
 */
export function Bar({
  back,
  sticky = true,
}: {
  /** Where to land afterwards, filters and all. */
  back: string;
  sticky?: boolean;
}) {
  const held = usePicked();
  if (!held) return null;

  const ids = [...held.on];

  if (ids.length === 0) {
    return (
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted">
        <span>Tick items to switch several at once.</span>
        <button
          type="button"
          onClick={() => held.set(showingNow())}
          className="font-semibold text-ink underline"
        >
          Tick everything showing
        </button>
      </div>
    );
  }

  return (
    <div
      className={`mb-3.5 rounded-xl bg-ink px-4 py-2.5 text-shell ${
        sticky ? "sticky top-2 z-20 shadow-lg" : ""
      }`}
    >
      <form action={setManyStock} className="flex flex-wrap items-center gap-2.5">
        <input type="hidden" name="back" value={back} />
        {ids.map((id) => (
          <input key={id} type="hidden" name="id" value={id} />
        ))}

        <strong className="text-sm">{ids.length} ticked</strong>

        <button
          type="button"
          onClick={() => held.set(showingNow())}
          className="text-[12.5px] underline opacity-70"
        >
          All showing
        </button>
        <button
          type="button"
          onClick={() => held.set([])}
          className="text-[12.5px] underline opacity-70"
        >
          Clear
        </button>

        <span className="ml-auto flex flex-wrap gap-1.5">
          <button
            name="available"
            value="true"
            className="btn-admin btn-admin-sm btn-admin-dark font-bold"
          >
            Put on sale
          </button>
          <button
            name="available"
            value="false"
            className="btn-admin btn-admin-sm btn-admin-dark font-bold"
          >
            Take off sale
          </button>
        </span>
      </form>
    </div>
  );
}

/**
 * What the last bulk switch did, read back off the address.
 *
 * Said rather than left to be noticed, because the list it changed may be
 * sixty rows long and because switching on quietly skips anything with no
 * price. "14 of 15 put on sale" is the sentence that explains the one that
 * did not move.
 */
export function Done({
  did,
  asked,
  on,
}: {
  did: number;
  asked: number;
  on: boolean;
}) {
  const short = asked - did;

  return (
    <div
      className={`card mb-3.5 border-l-[6px] p-3.5 sm:p-4 ${
        on ? "border-l-mint" : "border-l-amber"
      }`}
    >
      <p className="text-sm font-bold">
        {did === 0
          ? "Nothing changed"
          : `${did} ${on ? "put on sale" : "taken off sale"}`}
      </p>
      <p className="hint mt-1">
        {short > 0 && on
          ? `${short} of the ${asked} ticked had no price yet, so ${
              short === 1 ? "it stayed" : "they stayed"
            } off. A price of nothing prints as free on the menu. Give ${
              short === 1 ? "it" : "them"
            } a price on the item itself and tick again.`
          : "All at once, so there is nothing to undo in one tap. Tick anything that should go the other way and switch it back."}
      </p>
    </div>
  );
}
