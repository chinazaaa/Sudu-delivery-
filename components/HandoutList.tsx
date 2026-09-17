"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
 * Read at the drop point, one-handed, in the dark. Ticks are kept in the
 * browser so a refresh at the gate does not lose the handout so far.
 */
export default function HandoutList({
  batchId,
  entries,
  markDelivered,
  refund,
}: {
  batchId: string;
  entries: HandoutEntry[];
  markDelivered: (form: FormData) => Promise<void>;
  refund: (form: FormData) => Promise<void>;
}) {
  const storageKey = `sudu_handout_${batchId}`;
  const [ticked, setTicked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) setTicked(JSON.parse(saved));
    } catch {
      /* Private mode or blocked storage: ticking still works, just not saved. */
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

  const done = entries.filter((e) => ticked[e.id]).length;

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">
        {done}/{entries.length} handed out
      </p>
      <ul className="space-y-2">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className={`rounded-xl border ${
              ticked[entry.id]
                ? "border-mint/30 bg-mint/5"
                : "border-black/15 bg-white"
            }`}
          >
            <button
              type="button"
              onClick={() => toggle(entry.id)}
              className={`w-full px-3 py-2 text-left ${
                ticked[entry.id] ? "text-muted line-through" : ""
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
              <span className="mt-1 block text-sm">{entry.items.join(", ")}</span>
              <span className="text-xs text-muted">{entry.phone}</span>
            </button>

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
                    {order.ref}
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
                  {order.status !== "delivered" && (
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
        ))}
      </ul>
    </div>
  );
}
