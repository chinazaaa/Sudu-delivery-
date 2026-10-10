"use client";

import Link from "next/link";
import { useState } from "react";
import ConfirmButton from "./admin/ConfirmButton";

/**
 * The row action, for the links and buttons that are not a component.
 *
 * `btn-admin-sm` is already forty-four pixels on a phone and thirty-four
 * from `sm`, which is what the six rules ask for on a list worked through
 * with a thumb while holding a bag. The heights were being written out a
 * second time beside it, and a size kept in two places is a size that
 * drifts.
 */
const ROW_ACTION = "btn-admin btn-admin-sm";

export type HandoutEntry = {
  id: string;
  name: string;
  hostel: string;
  phone: string;
  items: string[];
  /** Every order in this bag: one bag can hold several. */
  orders: {
    id: string;
    ref: string;
    status: string;
    total: string;
    /** A prefilled WhatsApp confirmation for that order. */
    message: string;
  }[];
};

/**
 * Read at the drop point, one-handed, in the dark.
 *
 * There is one gesture here, not two: handing a bag over is marking it
 * delivered. A private tick on top of that would be the same list kept twice,
 * and the one that mattered would be the one nobody had updated.
 */
export default function HandoutList({
  entries,
  setDelivered,
  refund,
}: {
  entries: HandoutEntry[];
  setDelivered: (form: FormData) => Promise<void>;
  refund: (form: FormData) => Promise<void>;
}) {
  const isOut = (entry: HandoutEntry) =>
    entry.orders.every((order) => order.status === "delivered");
  const done = entries.filter(isOut).length;

  /** Which block is open on a phone. From the rail up they all are. */
  const [opened, setOpened] = useState<string | null>(null);
  const [find, setFind] = useState("");

  const looking = find.trim().toLowerCase();
  const matches = (entry: HandoutEntry) =>
    looking === "" ||
    [entry.name, entry.hostel, entry.phone, ...entry.orders.map((o) => o.ref)]
      .join(" ")
      .toLowerCase()
      .includes(looking);

  /*
   * By block, not one list of thirty-one names.
   *
   * A handout happens standing in one place: everybody in Queen Mary, then
   * everybody at the school gate. A flat alphabetical list means walking
   * the car's length for every name on it, and on a phone it is a thumb
   * scrolling past twenty-eight people to reach the two in front of you.
   *
   * Most still to hand over first, which is as close to "nearest" as the
   * data can honestly get: nothing here knows how far a block is from
   * anything.
   */
  const blocks = [...new Set(entries.map((entry) => entry.hostel))]
    .map((hostel) => {
      const bags = entries.filter((entry) => entry.hostel === hostel);
      return {
        hostel,
        bags,
        shown: bags.filter(matches),
        out: bags.filter(isOut).length,
      };
    })
    .filter((block) => block.shown.length > 0)
    .sort(
      (a, b) =>
        b.bags.length - b.out - (a.bags.length - a.out) ||
        a.hostel.localeCompare(b.hostel)
    );

  return (
    <div className="space-y-2">
      {/* How far through the handout you are, which the board draws as the
          first thing on the screen: the count big, what is left in volt
          beside it, and a bar under both. A line of grey nine-point text
          was the only answer to "how many more" on a page read at a gate
          with a boot full of bags. */}
      <div className="card border-ink bg-ink px-3.5 py-3 text-paper">
        <p className="flex items-baseline gap-2.5">
          <span className="font-display text-[40px] font-black leading-none">
            {done}
          </span>
          <span className="text-sm text-rail-text">of {entries.length} done</span>
          {entries.length - done > 0 && (
            <span className="ml-auto font-mono text-[13px] font-semibold text-volt">
              {entries.length - done} left
            </span>
          )}
        </p>
        <span
          aria-hidden
          className="mt-2.5 block h-[7px] overflow-hidden rounded-full bg-rail-line"
        >
          <span
            className="block h-full rounded-full bg-volt"
            style={{
              width: `${entries.length === 0 ? 0 : Math.round((done / entries.length) * 100)}%`,
            }}
          />
        </span>
      </div>
      {/* One box, because at a gate the thing you have is a name somebody
          shouted or the last four digits of a number. It filters what is
          already here rather than asking the server again: the whole run is
          on this page, and a search that needs signal is a search that does
          not work in a car park. */}
      <label className="block">
        <span className="sr-only">Find a bag by name, number or block</span>
        <input
          value={find}
          onChange={(event) => setFind(event.target.value)}
          placeholder="Name, number or block"
          className="field field-admin min-h-[44px] border-[1.5px] border-line bg-paper"
        />
      </label>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-[21px] font-black uppercase leading-none sm:text-[24px]">
          By block
        </h3>
        {/* Not "nearest first": nothing in the data knows how far a block is
            from anything. Most left to hand over is the honest version of
            the same idea. */}
        <span className="hint">Most left first</span>
      </div>

      {blocks.length === 0 && (
        <p className="hint">Nothing here matches {`"${find.trim()}"`}.</p>
      )}

      {blocks.map((block) => {
        const all = block.out === block.bags.length;
        // A search opens whatever it found: hunting for a name and then
        // tapping its block to see it is two gestures for one question.
        const open = looking !== "" || opened === block.hostel;
        return (
          <div key={block.hostel} className="space-y-2">
            <button
              type="button"
              onClick={() => setOpened(opened === block.hostel ? null : block.hostel)}
              aria-expanded={open}
              /* A drill-in on a phone and a heading on a desk, where every
                 bag under it is already on screen and there is nothing for
                 a press to reveal. */
              className={`card flex w-full items-center gap-2.5 p-3.5 text-left lg:pointer-events-none ${
                all ? "opacity-60" : ""
              }`}
            >
              <span
                aria-hidden
                className={`tick size-[30px] rounded-full text-[15px] font-black ${
                  all ? "tick-done" : ""
                }`}
              >
                {all ? "✓" : ""}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15.5px] font-bold">{block.hostel}</span>
                <span className="hint block">
                  {block.out} of {block.bags.length} handed over
                </span>
                <span
                  aria-hidden
                  className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-rule"
                >
                  <span
                    className="block h-full rounded-full bg-mint"
                    style={{
                      width: `${Math.round((block.out / block.bags.length) * 100)}%`,
                    }}
                  />
                </span>
              </span>
              <span aria-hidden className="shrink-0 text-lg text-muted lg:hidden">
                ›
              </span>
            </button>

            <ul className={`space-y-2 ${open ? "" : "hidden lg:block"}`}>
            {block.shown.map((entry) => {
              const handedOut = entry.orders.every(
                (order) => order.status === "delivered"
              );
              const ids = entry.orders.map((order) => order.id).join(",");
              const refs = entry.orders.map((order) => order.ref).join(" and ");

              return (
                <li
                  key={entry.id}
                  className={`soft ${handedOut ? "border-mint bg-mint-tint" : ""}`}
                >
                  <div>
                    <div
                      className={`flex gap-3 px-3 py-2.5 ${
                        handedOut ? "text-muted line-through" : ""
                      }`}
                    >
                      {/* The board puts a tick box at the head of every handout
                          row. It is a picture of where this bag has got to and
                          not a second control: the one gesture is the button
                          below, so a tick on top of it would be the same list
                          kept twice. */}
                      <span
                        aria-hidden="true"
                        className={`tick font-black no-underline ${handedOut ? "tick-done" : ""}`}
                      >
                        {handedOut ? "✓" : ""}
                      </span>
                      <span className="min-w-0 flex-1">
                      {/* Read at a gate, one-handed, in the dark. The block is
                          where you are standing and the name is who you are
                          looking for, so those two are the big type and
                          everything else gets out of their way. */}
                      <span className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-[17px] font-extrabold">{entry.name}</span>
                        <span className="tag bg-wash text-ink">{entry.hostel}</span>
                      </span>
                      <span className="mt-1.5 block space-y-1 text-sm">
                        {entry.items.map((item) => (
                          <span key={item} className="block leading-snug">
                            {item}
                          </span>
                        ))}
                      </span>
                      <span className="hint mt-1.5 block">
                        {entry.orders.map((order) => order.ref).join(" ")} ·{" "}
                        {entry.phone}
                      </span>
                      </span>
                    </div>
                  </div>

                  {/* Everything this bag needs, on this bag. With twenty bags,
                      scrolling to a second list to message one of them is not a
                      thing anybody does at a gate in the dark. */}
                  <div className="space-y-2 border-t-[1.5px] border-rule px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={`tel:${entry.phone.replace(/\s/g, "")}`}
                        className={ROW_ACTION}
                      >
                        Call {entry.name}
                      </a>

                      {/* The one thing here a customer sees the result of. A bag
                          can hold more than one order, so it says which it
                          covers. */}
                      <form action={setDelivered}>
                        <input type="hidden" name="order_ids" value={ids} />
                        <input type="hidden" name="delivered" value={String(!handedOut)} />
                        <ConfirmButton
                          tone="admin"
                          confirm={
                            handedOut
                              ? `Yes, undo ${refs}`
                              : `Yes, ${refs} delivered`
                          }
                        >
                          {handedOut
                            ? "Undo delivered"
                            : entry.orders.length > 1
                              ? `Mark all ${entry.orders.length} delivered`
                              : "Mark delivered"}
                        </ConfirmButton>
                      </form>
                    </div>

                    {entry.orders.map((order) => (
                      <div key={order.id} className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className={ROW_ACTION}
                        >
                          View {order.ref}
                          <span className="text-muted">
                            {order.status} ·{" "}
                            <span className="font-mono">{order.total}</span>
                          </span>
                        </Link>
                        <a
                          href={order.message}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={ROW_ACTION}
                        >
                          Confirm on WhatsApp
                        </a>
                        {entry.orders.length > 1 && order.status !== "delivered" && (
                          <form action={setDelivered}>
                            <input type="hidden" name="order_ids" value={order.id} />
                            <input type="hidden" name="delivered" value="true" />
                            <ConfirmButton
                              tone="admin"
                              confirm={`Yes, ${order.ref} only`}
                            >
                              Deliver {order.ref} only
                            </ConfirmButton>
                          </form>
                        )}
                        <form action={refund}>
                          <input type="hidden" name="order_id" value={order.id} />
                          <ConfirmButton
                            tone="bad"
                            confirm={`Yes, refund ${order.ref}`}
                          >
                            Refund
                          </ConfirmButton>
                        </form>
                        {/* The fifth rule: what is forever is written next
                            to the button, not in a dialog after it. */}
                        <span className="hint w-full">
                          Refunding {order.ref} is forever. The money goes
                          back and the order stops travelling on this run.
                        </span>
                      </div>
                    ))}
                  </div>
                </li>
              );
            })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
