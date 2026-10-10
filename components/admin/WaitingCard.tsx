import Link from "next/link";
import ConfirmButton from "./ConfirmButton";
import SaveButton from "@/components/SaveButton";
import type { OrderCardData } from "./OrderCard";
import { naira } from "@/lib/money";
import { placedLabel } from "@/lib/time";

/**
 * One order that is waiting on something, with the one thing it is waiting
 * for on it.
 *
 * The board's New in cut is not a shorter orders list: it is a list of jobs.
 * Everything that has been dealt with is gone from it, and what is left
 * carries its state in a word — waiting on transfer, needs a card link — and
 * the action that ends that state, at a size a thumb hits first time in a
 * moving car.
 *
 * `OrderCard` is the other cut's card and stays as it is: everything about
 * an order, every control it has, read at a desk. This one is three lines
 * and two buttons. Trying to make one card be both is what had somebody
 * hunting for "Mark paid" among eleven other buttons on a phone.
 */
export default function WaitingCard({
  order,
  /** The account the money is expected in, so the hint says where to look. */
  into = "",
  markPaid,
  savePaymentLink,
}: {
  order: OrderCardData;
  into?: string;
  markPaid: (form: FormData) => Promise<void>;
  savePaymentLink: (form: FormData) => Promise<void>;
}) {
  const wantsCard = order.paymentMethod === "card";
  const needsLink = wantsCard && !order.paymentLink;
  // Asking for the money, and sending the link they asked to pay with. Both
  // are WhatsApp messages written on the server and opened by hand.
  const chase = order.templates.find((one) => one.kind === "payment") ?? null;
  const sendLink = order.templates.find((one) => one.kind === "card") ?? null;

  return (
    <article className="card space-y-2.5 px-3.5 py-3 sm:px-4 sm:py-3.5">
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

      {/* When it came in, which run it is on, where it is going, and how they
          said they would pay. Everything needed to decide whether this one
          can wait another hour. */}
      <p className="hint">
        {[
          order.createdAt ? placedLabel(order.createdAt) : "",
          order.batchLabel,
          order.hostel,
          wantsCard ? "Wants a card link" : into === "" ? "Transfer" : `Transfer · ${into}`,
        ]
          .filter((part) => part !== "")
          .join(" · ")}
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        <span
          /* The board's own two grounds: the amber chip for something
             worth doing, the red one for something that is holding the
             order up. */
          className={`tag ${
            needsLink ? "bg-brand-wash text-brand-dark" : "bg-brand-tint text-amber-deep"
          }`}
        >
          {needsLink
            ? "needs a card link"
            : wantsCard
              ? "card link sent, not paid"
              : "waiting on transfer"}
        </span>
        {order.narration !== "" && !wantsCard && (
          <span className="hint">
            narration <span className="font-mono font-semibold">{order.narration}</span>
          </span>
        )}
      </div>

      {/* No delivery fee worked out yet, so marking it paid now takes the
          food money alone. Said here as well as on the full card, because
          this is where somebody on a phone will tap it. */}
      {order.awaitingGroup && (
        <p className="rounded-r-lg border-l-4 border-volt bg-brand-tint px-[11px] py-2 text-[13.5px]">
          <span className="font-bold text-brand-dark">Their group has not closed.</span>{" "}
          {naira(order.total)} is the food with no delivery on it yet.
        </p>
      )}

      {/*
       * They asked to pay by card and there is no link on the order yet.
       *
       * The board's tomato button here says "Send card link", and there is
       * no link to send: the template would go out promising one in the next
       * message. So the one action is pasting the link, and sending it is
       * the tap after that, on the same card. The field is here rather than
       * behind "Open" because the missing link is the whole reason this
       * order is in the cut.
       */}
      {needsLink && (
        <form action={savePaymentLink} className="soft space-y-2 bg-brand-tint p-3">
          <label className="label" htmlFor={`newlink-${order.id}`}>
            Card payment link
          </label>
          <input
            id={`newlink-${order.id}`}
            name="payment_link"
            placeholder="Paste the link you generated"
            className="field field-admin w-full border-[1.5px] border-line bg-paper px-3"
          />
          <input type="hidden" name="order_id" value={order.id} />
          <div className="flex gap-2">
            <SaveButton
              look="btn-admin-go"
              className="min-h-[48px] flex-[1.4] text-[15px] sm:min-h-[44px]"
            >
              Save the link
            </SaveButton>
            {chase && <Chase href={chase.href} />}
          </div>
          <p className="hint">
            Saved against this order, and their own page turns it into a pay
            button. Send card link appears here once it is saved.
          </p>
        </form>
      )}

      {/* The link is on the order, so the one action is sending it. */}
      {wantsCard && !needsLink && sendLink && (
        <div className="flex gap-2">
          <a
            href={sendLink.href}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-admin-go min-h-[48px] flex-[1.4] text-[15px] sm:min-h-[44px]"
          >
            Send card link
          </a>
          {chase && <Chase href={chase.href} />}
        </div>
      )}

      {/*
       * The reference and the two taps, in one form so the button beside it
       * sits on the same row. The reference is typed before the button is
       * pressed, which is why it is above and full width rather than
       * squeezed in beside it.
       *
       * On a card order this is the quieter of the two, because the job on
       * that one is the link. It is still here: people say card at checkout
       * and transfer in the end, and that is exactly when somebody is
       * holding a phone looking for this button.
       */}
      <form action={markPaid} className="space-y-2">
        <input type="hidden" name="order_id" value={order.id} />
        <label className="sr-only" htmlFor={`ref-${order.id}`}>
          The reference on the transfer
        </label>
        <input
          id={`ref-${order.id}`}
          name="payment_ref"
          autoComplete="off"
          placeholder={
            order.narration === ""
              ? "Reference on the transfer"
              : `Reference, or ${order.narration}`
          }
          className="field field-admin border-[1.5px] border-line bg-paper px-3"
        />
        {/* Wrapping, because asking swaps "Mark paid" for "Yes, ₦18,400
            received" and two buttons that fitted a phone side by side no
            longer do. */}
        <div className="flex flex-wrap items-center gap-2">
          <ConfirmButton
            tone="admin"
            className={
              wantsCard
                ? "min-h-[44px] flex-1 sm:min-h-[34px]"
                : "btn-admin-go min-h-[48px] flex-[1.4] text-[15px] sm:min-h-[44px]"
            }
            confirm={`Yes, ${naira(order.total)} received`}
          >
            Mark paid
          </ConfirmButton>
          {chase && !wantsCard && <Chase href={chase.href} />}
        </div>
      </form>

      <Link
        href={`/admin/orders/${order.id}`}
        className="btn-admin btn-admin-sm w-full sm:w-auto"
      >
        Everything about this order →
      </Link>
    </article>
  );
}

/** The outline button beside the tomato one: ask them for the money. */
function Chase({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="btn-admin min-h-[48px] flex-1 text-[15px] sm:min-h-[44px]"
    >
      Chase
    </a>
  );
}
