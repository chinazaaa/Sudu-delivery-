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
}: {
  order: OrderCardData;
  markDelivered: (form: FormData) => Promise<void>;
}) {
  const done = order.status === "delivered";

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

      <Link
        href={`/admin/orders/${order.id}`}
        className="btn-admin btn-admin-sm w-full sm:w-auto"
      >
        Everything about this order →
      </Link>
    </article>
  );
}
