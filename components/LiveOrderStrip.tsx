import Link from "next/link";
import type { LiveOrder } from "@/lib/live-order";

/**
 * The order already on its way, said on the page they land on.
 *
 * Somebody who has just ordered comes back to the site to find out where
 * their food is, and the front page answered with eleven menus. The one
 * question they opened it to ask was the one thing it did not say, so they
 * messaged a person instead, which is the question the order page exists
 * to answer.
 *
 * A strip rather than a card. It is a line of news above the shop, not a
 * section of it: everything that was on this page is still where it was,
 * one row further down, and the moment the food is handed over this stops
 * drawing itself with nothing to switch off.
 *
 * Money first where money is owed. "Orders closed, getting ready to go" is
 * no use to somebody whose food is not on the run yet, and an order that
 * has not been paid for comes off it: that is the sentence to read, and
 * the button says the thing to do about it.
 */
export default function LiveOrderStrip({ order }: { order: LiveOrder | null }) {
  if (!order) return null;

  return (
    <Link
      href={`/o/${order.id}`}
      className={`mb-4 flex items-center justify-between gap-3 rounded-2xl border-2 border-ink px-4 py-3 shadow-hard ${
        order.unpaid ? "bg-brand text-white" : "bg-ink text-white"
      }`}
    >
      <span className="min-w-0">
        <span className="ticket block text-[11px] text-white/70">
          Your order {order.ref}
        </span>
        <span className="block truncate text-[15px] font-bold leading-tight">
          {order.said}
        </span>
      </span>
      <span className="shrink-0 rounded-full bg-white/15 px-3.5 py-2 text-sm font-bold">
        {order.unpaid ? "Pay now" : "Track it"}
      </span>
    </Link>
  );
}
