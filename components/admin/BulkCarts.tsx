"use client";

import { closeManyCarts, deleteManyCarts } from "@/app/admin/actions";
import ConfirmButton from "./ConfirmButton";
import { showingNow, usePicked } from "./Picking";
import ActionButton from "@/components/ActionButton";

/**
 * The bar above the left behind list.
 *
 * Closing a cart is five words and a tap, which is right for a real person
 * who did not pay and absurd for the six carts a morning of testing leaves
 * behind. Ticking is the way out of that: tick what is yours, close the lot
 * with one reason between them, or delete them if they were never anybody.
 *
 * Always on screen, because a control that only appears once you have found
 * it is a control nobody finds. Empty it is one line saying what the ticks
 * are for.
 */
export default function BulkCarts({ reasons }: { reasons: string[] }) {
  const held = usePicked();
  if (!held) return null;

  const ids = [...held.on];

  if (ids.length === 0) {
    return (
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted">
        <span>Tick carts to close or delete several at once.</span>
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

  const fields = ids.map((id) => (
    <input key={id} type="hidden" name="id" value={id} />
  ));

  return (
    <div className="sticky top-2 z-20 mb-3.5 rounded-xl bg-ink px-4 py-2.5 text-shell shadow-lg">
      <div className="flex flex-wrap items-center gap-2.5">
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
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {/* One reason between them. The two that promise something keep the
            same promise they keep one at a time. */}
        <form action={closeManyCarts} className="flex flex-wrap items-center gap-1.5">
          {fields}
          <select
            name="reason"
            defaultValue={reasons[0]}
            aria-label="Why these are being closed"
            className="min-h-[34px] rounded-lg border-[1.5px] border-[#4a443c] bg-transparent px-2 text-[13px] font-semibold text-shell"
          >
            {reasons.map((one) => (
              <option key={one} value={one} className="text-ink">
                {one}
              </option>
            ))}
          </select>
          <ActionButton
            className="btn-admin btn-admin-sm btn-admin-dark font-bold"
            busy="Closing…"
            done="Closed ✓"
          >
            Close {ids.length}
          </ActionButton>
        </form>

        {/* Deleting is forever, and it is the one anybody clearing their own
            tests actually wants, so it says so rather than hiding.

            The board's own asking, not the browser's. window.confirm puts
            up a grey box headed "sudu.store says" with a blue iOS button
            in it, which is the one piece of furniture on the page that
            belongs to somebody else. Every other destructive button here
            turns into its own question and this one should too. */}
        <form action={deleteManyCarts} className="ml-auto">
          {fields}
          <ConfirmButton
            tone="bare"
            className="btn-admin btn-admin-sm btn-admin-dark font-bold"
            confirm={`Yes, delete ${ids.length}`}
          >
            Delete {ids.length}
          </ConfirmButton>
        </form>
      </div>
    </div>
  );
}
