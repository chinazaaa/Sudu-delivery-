"use client";

import Link from "next/link";

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
 * Read at the drop point, one-handed, in the dark. Ticking a bag marks its
 * orders delivered for real, so the customer's own page says delivered too;
 * tapping a ticked bag puts it back, for a tap in a pocket.
 */
export default function HandoutList({
  entries,
  setDelivered,
  markDelivered,
  refund,
}: {
  entries: HandoutEntry[];
  setDelivered: (form: FormData) => Promise<void>;
  markDelivered: (form: FormData) => Promise<void>;
  refund: (form: FormData) => Promise<void>;
}) {
  const done = entries.filter((entry) =>
    entry.orders.every((order) => order.status === "delivered")
  ).length;

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">
        {done}/{entries.length} handed out
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
                handedOut ? "border-mint/30 bg-mint/5" : "border-black/15 bg-white"
              }`}
            >
              <form action={setDelivered}>
                <input type="hidden" name="order_ids" value={ids} />
                <input type="hidden" name="delivered" value={String(!handedOut)} />
                <button
                  type="submit"
                  className={`w-full px-3 py-2 text-left ${
                    handedOut ? "text-muted line-through" : ""
                  }`}
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
                  <span className="mt-1 block text-xs font-bold text-mint">
                    {handedOut ? "Handed over. Tap to undo." : ""}
                  </span>
                </button>
              </form>

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
                    {order.status !== "delivered" && entry.orders.length > 1 && (
                      <form action={markDelivered}>
                        <input type="hidden" name="order_id" value={order.id} />
                        <button className="chip border-black/10 bg-white py-1.5 text-xs">
                          Delivered
                        </button>
                      </form>
                    )}
                    <form action={refund}>
                      <input type="hidden" name="order_id" value={order.id} />
                      <button className="chip border-black/10 bg-white py-1.5 text-xs text-brand">
                        Refund
                      </button>
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
