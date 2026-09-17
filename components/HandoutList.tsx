"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
 * Two different things happen here and they are deliberately not the same
 * gesture. Tapping a bag ticks it off in this browser: free, reversible, and
 * seen by nobody, which is what a list is for while you are working through
 * one. Marking it delivered changes what the customer reads on their own
 * page, so it asks first.
 */
export default function HandoutList({
  batchId,
  entries,
  setDelivered,
  refund,
}: {
  batchId: string;
  entries: HandoutEntry[];
  setDelivered: (form: FormData) => Promise<void>;
  refund: (form: FormData) => Promise<void>;
}) {
  const storageKey = `sudu_handout_${batchId}`;
  const [ticked, setTicked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) setTicked(JSON.parse(saved));
    } catch {
      /* Private mode. Ticking still works, it is just not remembered. */
    }
  }, [storageKey]);

  function toggle(id: string) {
    setTicked((current) => {
      const next = { ...current, [id]: !current[id] };
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const done = entries.filter((entry) => ticked[entry.id]).length;

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">
        {done}/{entries.length} ticked off
      </p>
      <ul className="space-y-2">
        {entries.map((entry) => {
          const handedOut = entry.orders.every(
            (order) => order.status === "delivered"
          );
          const ids = entry.orders.map((order) => order.id).join(",");
          const checked = Boolean(ticked[entry.id]);

          return (
            <li
              key={entry.id}
              className={`rounded-xl border ${
                handedOut
                  ? "border-mint/30 bg-mint/5"
                  : checked
                    ? "border-ink/20 bg-black/[0.02]"
                    : "border-black/15 bg-white"
              }`}
            >
              <div>
                <button
                  type="button"
                  onClick={() => toggle(entry.id)}
                  className={`w-full px-3 py-2 text-left ${
                    checked ? "text-muted line-through" : ""
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
                  <span className="mt-1 block text-xs font-bold">
                    {handedOut ? (
                      <span className="text-mint">Delivered</span>
                    ) : checked ? (
                      <span className="text-muted">
                        Ticked off. Tap again to untick.
                      </span>
                    ) : (
                      ""
                    )}
                  </span>
                </button>
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
