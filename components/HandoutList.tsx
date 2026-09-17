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
      <p className="text-sm text-muted">
        {done}/{entries.length} handed over
      </p>
      <ul className="space-y-2">
        {entries.map((entry) => {
          const handedOut = entry.orders.every(
            (order) => order.status === "delivered"
          );
          const ids = entry.orders.map((order) => order.id).join(",");

          return (
            <li
              key={entry.id}
              className={`rounded-xl border ${
                handedOut
                  ? "border-mint/30 bg-mint/5"
                  : "border-black/15 bg-white"
              }`}
            >
              <div>
                <div
                  className={`px-3 py-2 ${handedOut ? "text-muted line-through" : ""}`}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold">
                      <span className="text-muted">
                        {entry.orders.map((order) => order.ref).join(" ")}{" "}
                      </span>
                      {entry.name}
                    </span>
                    <span className="text-xs text-muted">{entry.hostel}</span>
                  </span>
                  <span className="mt-1 block space-y-0.5 text-sm">
                    {entry.items.map((item) => (
                      <span key={item} className="block">
                        {item}
                      </span>
                    ))}
                  </span>
                  <span className="text-xs text-muted">{entry.phone}</span>
                </div>
              </div>

              {/* Everything this bag needs, on this bag. With twenty bags,
                  scrolling to a second list to message one of them is not a
                  thing anybody does at a gate in the dark. */}
              <div className="space-y-2 border-t border-black/5 px-3 py-2">
                <a
                  href={`tel:${entry.phone.replace(/\s/g, "")}`}
                  className="chip border-black/10 bg-white py-1.5 text-xs"
                >
                  Call {entry.name}
                </a>

                {/* The one thing here a customer sees the result of. */}
                <form action={setDelivered} className="inline">
                  <input type="hidden" name="order_ids" value={ids} />
                  <input type="hidden" name="delivered" value={String(!handedOut)} />
                  <ConfirmButton
                    className="py-1.5 text-xs"
                    confirm={handedOut ? "Yes, undo it" : "Yes, delivered"}
                  >
                    {handedOut ? "Undo delivered" : "Mark delivered"}
                  </ConfirmButton>
                </form>

                {entry.orders.map((order) => (
                  <div key={order.id} className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="chip border-black/10 bg-white py-1.5 text-xs"
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
                      className="chip border-black/10 bg-white py-1.5 text-xs"
                    >
                      Confirm on WhatsApp
                    </a>
                    <form action={refund}>
                      <input type="hidden" name="order_id" value={order.id} />
                      <ConfirmButton
                        tone="brand"
                        className="py-1.5 text-xs"
                        confirm="Yes, refund"
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
