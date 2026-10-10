import Link from "next/link";
import ConfirmButton from "./ConfirmButton";
import type { OrderCardData } from "./OrderCard";
import { naira } from "@/lib/money";

/**
 * One order on today's run that is paid for, with the one thing left to do
 * on it.
 *
 * The New in cut used to hold unpaid orders and nothing else, so an order
 * that was paid for the moment it came in disappeared off the screen
 * entirely and the only way to hand it over was to open the run. On a day
 * with one order that is the whole job hidden two screens deep.
 *
 * `WaitingCard` is the same card for the other half of the day: an order
 * waiting on money, with the ways to ask for it. This one is an order
 * waiting on a doorway, so it carries the block, the PIN and one button.
 */
export default function HandOverCard({
  order,
  markDelivered,
  setReviewed,
}: {
  order: OrderCardData;
  markDelivered: (form: FormData) => Promise<void>;
  /** Ticking somebody off as having left a review. Google never says who
   *  wrote what, so this is only ever somebody's own hand. */
  setReviewed?: (form: FormData) => Promise<void>;
}) {
  const done = order.status === "delivered";
  // Only on a bag that has gone, and only where a Google link is set: the
  // template is built with the link in it, so there is no button at all
  // when there is nowhere to send anybody.
  const google = done
    ? order.templates.find((one) => one.kind === "google") ?? null
    : null;
  // Asking somebody who has already left one is the one thing this is all
  // meant to prevent, so the button goes once the tick is on.
  const ask = order.reviewed ? null : google;

  return (
    <article
      className={`card space-y-2.5 px-3.5 py-3 sm:px-4 sm:py-3.5 ${
        done ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-baseline justify-between gap-2.5">
        <div className="min-w-0">
          <strong className="text-[16.5px]">{order.forName ?? order.name}</strong>{" "}
          <Link
            href={`/admin/orders/${order.id}`}
            className="font-mono text-[12px] text-muted hover:text-brand"
          >
            {order.ref}
          </Link>
        </div>
        <span className="shrink-0 font-display text-[26px] font-black leading-none sm:text-[28px]">
          {naira(order.total)}
        </span>
      </div>

      {/* Where it goes and which car it is on. The PIN is here because it is
          what gets checked at the door, and hunting for it is the reason
          anybody opened the run sheet on the step. */}
      <p className="hint">
        {[order.batchLabel, order.hostel].filter((part) => part !== "").join(" · ")}
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`tag ${done ? "bg-mint-tint text-mint" : "bg-wash text-ink"}`}>
          {done ? "delivered" : "paid, not handed over"}
        </span>
        {order.pin && (
          <span className="hint">
            PIN <span className="font-mono font-semibold">{order.pin}</span>
          </span>
        )}

        {/*
          Ticking off a review, in the chip row rather than as a third
          button.

          Asking and being told are two different events and both have to be
          recordable, but the card is two buttons and should stay two
          buttons: a stack of three is a card nobody reads the bottom of. So
          the ask is the button, because it is the thing you do, and the
          answer is a tick beside the state, because it is a thing you
          merely note. It reads as part of the chip row and sits in the
          forty-four pixels the row already has.

          Against the person and not the order, because that is what it
          means: somebody who has left a review has left one, whichever bag
          they are collecting today.
        */}
        {google && setReviewed && (
          <form action={setReviewed} className="ml-auto">
            <input type="hidden" name="phone" value={order.phone} />
            <input
              type="hidden"
              name="reviewed"
              value={String(!order.reviewed)}
            />
            <button
              type="submit"
              aria-pressed={Boolean(order.reviewed)}
              className="flex min-h-[44px] items-center gap-1.5 text-[13px] font-semibold text-muted"
            >
              <span
                aria-hidden
                className={`tick size-6 text-[13px] ${order.reviewed ? "tick-done" : ""}`}
              >
                {order.reviewed ? "✓" : ""}
              </span>
              {order.reviewed ? "Reviewed" : "Mark reviewed"}
            </button>
          </form>
        )}
      </div>

      {!done && (
        <form action={markDelivered}>
          <input type="hidden" name="order_id" value={order.id} />
          {/* The run follows this: the last order on a car finishes the car,
              and one of six moves it to the hostels. Said on the button's
              confirmation rather than here, where it would be a sentence
              under every card on the screen. */}
          <ConfirmButton
            tone="admin"
            className="btn-admin-go min-h-[48px] w-full text-[15px] sm:min-h-[44px] sm:w-auto"
            confirm="Yes, handed over"
          >
            Mark delivered
          </ConfirmButton>
        </form>
      )}

      {/* The moment to ask. Somebody is pleased about the food now, and in
          an hour they are not thinking about it at all. WhatsApp is opened
          by hand with the message already written, the way every other
          message this shop sends goes out. */}
      {ask && (
        <a
          href={ask.href}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-admin min-h-[44px] w-full justify-center text-[14.5px] sm:w-auto"
        >
          Ask for a Google review
        </a>
      )}

      <Link
        href={`/admin/orders/${order.id}`}
        className="btn-admin btn-admin-sm w-full sm:w-auto"
      >
        Everything about this order →
      </Link>
    </article>
  );
}
