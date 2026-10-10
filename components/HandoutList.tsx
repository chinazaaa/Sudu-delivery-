"use client";

import Link from "next/link";
import ConfirmButton from "./admin/ConfirmButton";

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
  const done = entries.filter((entry) =>
    entry.orders.every((order) => order.status === "delivered")
  ).length;

  return (
    <div className="space-y-2">
      <p className="hint">
        {done}/{entries.length} handed over
      </p>
      <ul className="space-y-2">
        {entries.map((entry) => {
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
                <a
                  href={`tel:${entry.phone.replace(/\s/g, "")}`}
                  className="btn-admin btn-admin-sm"
                >
                  Call {entry.name}
                </a>

                {/* The one thing here a customer sees the result of. A bag can
                    hold more than one order, so it says which it covers. */}
                <form action={setDelivered} className="inline">
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

                {entry.orders.map((order) => (
                  <div key={order.id} className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="btn-admin btn-admin-sm"
                    >
                      View {order.ref}
                      <span className="text-muted">
                        {order.status} · {order.total}
                      </span>
                    </Link>
                    <a
                      href={order.message}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-admin btn-admin-sm"
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
                  </div>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
