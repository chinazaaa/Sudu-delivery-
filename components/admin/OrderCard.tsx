"use client";

import Link from "next/link";
import { useState } from "react";
import ConfirmButton from "./ConfirmButton";
import SaveButton from "@/components/SaveButton";
import { naira } from "@/lib/money";
import { STAGE_LABEL, type BatchStage } from "@/lib/stages";
import { formatPhone } from "@/lib/phone";

export type OrderCardLine = {
  id: string;
  qty: number;
  name: string;
  restaurant: string;
  choices: string[];
  for_name: string | null;
  unit_price_at_order: number;
};

export type OrderCardData = {
  id: string;
  ref: string;
  name: string;
  forName: string | null;
  phone: string;
  hostel: string;
  batchLabel: string;
  status: string;
  total: number;
  fee: number;
  food: number;
  /** True when they came in on somebody else's delivery link. */
  joinedDelivery: boolean;
  /** In a shared delivery that has not closed, so it has no fee yet. */
  awaitingGroup: boolean;
  /** Taken off the total by a code, if one was typed. */
  discount: number;
  /** The code that took it off, so the money can be explained. */
  couponCode: string | null;
  createdAt: string;
  paymentMethod: string;
  pin: string | null;
  paymentLink: string | null;
  /** That person's other orders in the same run, which this one tops up. */
  otherItems: number;
  otherFee: number;
  inGroup: boolean;
  /** The group's own number, when this order is one part of one. */
  groupRef: string | null;
  groupSize: number;
  /** Where its run has got to, as the customer is reading it right now. */
  runStage: BatchStage;
  customerNote: string;
  adminNote: string;
  /** The promoter whose customer this is, if anybody brought them. This is
   *  what commission on a run is charged against. */
  promoter: { code: string; name: string } | null;
  /** Which front door it came through: "app", "web", or empty for the
   *  orders taken before the shop wrote it down. */
  source: string;
  /** The money the card link has to be made out in, where somebody abroad
   *  is paying. Empty is naira, which is nearly every order. */
  payCurrency: string;
  /** That total in their money, as the shop's own rate works it out. */
  payRoughly: string;
  /** A parcel rather than food. It has no lines at all, so without this the
   *  card is a name, a number and an empty list.
   *
   *  The questions as the sender was asked them, with what they typed. Not a
   *  summary: summarising is how a block became part of a street. */
  parcel: {
    route: string;
    answers: { question: string; answer: string }[];
  } | null;
  /** What they were told to type in the transfer. */
  narration: string;
  lines: OrderCardLine[];
  /** Ready-made WhatsApp links, one per template, built on the server. */
  templates: { kind: string; label: string; href: string }[];
};

/**
 * One order, everything about it in one place. Marking paid and messaging the
 * customer is a single tap: the order is updated and WhatsApp opens with the
 * confirmation already written.
 */
export default function OrderCard({
  order,
  onList = true,
  markPaid,
  markDelivered,
  refund,
  cancel,
  remove,
  savePaymentLink,
  saveNote,
}: {
  order: OrderCardData;
  /** False on the order's own page, where a link to the page you are
   *  already reading is noise. */
  onList?: boolean;
  markPaid: (form: FormData) => Promise<void>;
  markDelivered: (form: FormData) => Promise<void>;
  refund: (form: FormData) => Promise<void>;
  cancel: (form: FormData) => Promise<void>;
  remove: (form: FormData) => Promise<void>;
  savePaymentLink: (form: FormData) => Promise<void>;
  saveNote: (form: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const confirmed = order.templates.find((t) => t.kind === "confirmed");

  return (
    <article className="card space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-bold">
            <Link href={`/admin/orders/${order.id}`} className="hover:text-brand">
              <span className="text-muted">{order.ref}</span>{" "}
              {order.forName ?? order.name}
            </Link>
          </h3>
          {order.groupRef && (
            <Link
              href={`/admin/orders?status=all&q=${order.groupRef}`}
              className="mt-0.5 inline-block text-sm font-semibold text-brand"
            >
              Part of group #{order.groupRef} · {order.groupSize} parts
              {order.forName && order.forName !== order.name && (
                <span className="font-normal text-muted"> · {order.name} started it</span>
              )}
            </Link>
          )}
          <p className="text-sm text-muted">
            {order.batchLabel} · {order.hostel} · {formatPhone(order.phone)}
          </p>
          {order.parcel && (
            <span className="mt-1 inline-block rounded-full bg-brand-tint px-2.5 py-1 text-xs font-bold text-brand-dark">
              Parcel · {order.parcel.route}
            </span>
          )}
          {/* Which front door. Beside the promoter, because both answer the
              same sort of question: where did this order actually come
              from. Silent on the older orders, which never recorded it, and
              a guess would be worse than nothing. */}
          {/* Before the link is made, not after: a Stripe link in the wrong
              currency is a payment that has to be sent back. */}
          {order.payCurrency !== "" && (
            <span className="inline-block rounded-full bg-brand px-2.5 py-1 text-xs font-extrabold text-white">
              Card link in {order.payCurrency}
              {order.payRoughly ? ` · ${order.payRoughly}` : ""}
            </span>
          )}
          {order.source !== "" && (
            <span className="inline-block rounded-full bg-black/5 px-2.5 py-1 text-xs font-bold text-muted">
              {order.source === "app" ? "From the app" : "From the website"}
            </span>
          )}
          {order.promoter && (
            <Link
              href={`/admin/orders?status=all&promoter=${encodeURIComponent(
                order.promoter.code
              )}`}
              className="text-sm font-semibold text-muted hover:text-brand"
            >
              Brought in by {order.promoter.name}
            </Link>
          )}
          {order.status !== "pending" && order.runStage !== "ordering" && (
            <p className="text-sm font-semibold text-muted">
              They are seeing: {STAGE_LABEL[order.runStage]}
            </p>
          )}
          {/* How they said they would pay is the first thing you need when
              chasing an unpaid order. */}
          <span
            className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-bold ${
              order.paymentMethod !== "card"
                ? "bg-black/5 text-muted"
                : order.paymentLink
                  ? "bg-mint/10 text-mint"
                  : "bg-amber-100 text-amber-800"
            }`}
          >
            {order.paymentMethod !== "card"
              ? "Paying by transfer"
              : order.paymentLink
                ? "Card link saved"
                : "Wants a card link"}
          </span>
        </div>
        <div className="text-right">
          <p className="font-extrabold">{naira(order.total)}</p>
          <StatusPill status={order.status} />
        </div>
      </div>

      {order.customerNote && (
        <p className="rounded-xl bg-brand-tint px-3 py-2 text-sm text-brand-dark">
          <span className="font-bold">They asked: </span>
          {order.customerNote}
        </p>
      )}

      {order.status === "pending" && (
        <div className="rounded-2xl bg-brand-tint p-3">
          <form action={savePaymentLink} className="space-y-1.5">
            <label className="label" htmlFor={`link-${order.id}`}>
              Card payment link
            </label>
            <div className="flex gap-2">
              <input
                id={`link-${order.id}`}
                name="payment_link"
                defaultValue={order.paymentLink ?? ""}
                placeholder="Paste the link you generated"
                className="field grow py-2 text-sm"
              />
              <input type="hidden" name="order_id" value={order.id} />
              <SaveButton quiet className="shrink-0 px-4 py-2 text-sm">
                Save
              </SaveButton>
            </div>
            <p className="text-xs text-muted">
              Saved against this order. &quot;Send card link&quot; then sends
              this one, and their own page turns it into a pay button.
              {order.paymentMethod !== "card" &&
                " They asked to pay by transfer, so this is only needed if they change their mind."}
            </p>
          </form>
        </div>
      )}

      {/* Marking this paid now would take food money and no delivery, because
          the fee is not worked out until the group closes. */}
      {order.awaitingGroup && order.status === "pending" && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <span className="font-bold">Their group has not closed yet.</span> There is
          no delivery fee on this order, so {naira(order.total)} is the food alone.
          Wait for the group to close, or you will be marking it paid for less than
          it will cost.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {order.status === "pending" ? (
          <form
            action={markPaid}
            onSubmit={() => {
              // WhatsApp opens from the click itself, so the pop-up is not
              // blocked, and the order is marked paid by the same tap.
              if (confirmed) window.open(confirmed.href, "_blank", "noopener");
            }}
          >
            <input type="hidden" name="order_id" value={order.id} />
            <ConfirmButton
              className="px-4 py-2 text-sm"
              confirm={`Yes, ${naira(order.total)} received`}
            >
              Mark paid and message
            </ConfirmButton>
          </form>
        ) : order.status === "cancelled" ? null : order.status === "paid" ? (
          <form action={markDelivered}>
            <input type="hidden" name="order_id" value={order.id} />
            <ConfirmButton className="px-4 py-2 text-sm" confirm="Yes, delivered">
              Mark delivered
            </ConfirmButton>
          </form>
        ) : null}

        {order.templates.map((item) => (
          <a
            key={item.kind}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="chip border-black/10 bg-white hover:border-ink/30"
          >
            {item.label}
          </a>
        ))}

        {/* The way in. The order number at the top has always been a link,
            but a number does not look like one, so the page that holds the
            photographs, the run it is on and the notes was reachable only by
            somebody who already knew it was there. */}
        {onList && (
          <Link
            href={`/admin/orders/${order.id}`}
            className="chip border-ink/20 bg-white font-bold hover:border-ink/40"
          >
            Open this order
          </Link>
        )}

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="chip border-black/10 bg-white hover:border-ink/30"
        >
          {open
            ? "Hide details"
            : order.parcel
              ? "The parcel"
              : `${order.lines.length} item lines`}
        </button>
      </div>

      {open && (
        <div className="space-y-3 border-t border-black/5 pt-3">
          {/* Nothing is bought on a parcel, so there are no lines: what there
              is instead is where to go, what to ask for and what to hand
              over. Everything the trip needs, in the order it is needed. */}
          {order.parcel && (
            <dl className="space-y-2 rounded-xl bg-shell p-3 text-sm">
              {order.parcel.answers.map((one) => (
                <div key={one.question}>
                  <dt className="text-xs text-muted">{one.question}</dt>
                  <dd className="font-semibold text-ink">{one.answer}</dd>
                </div>
              ))}
            </dl>
          )}
          <ul className="space-y-1 text-sm">
            {order.lines.map((line) => (
              <li key={line.id} className="flex justify-between gap-3">
                <span>
                  {line.qty}× {line.name}
                  {line.choices.length > 0 && (
                    <span className="text-muted"> · {line.choices.join(", ")}</span>
                  )}
                  <span className="text-muted"> · {line.restaurant}</span>
                  {(line.for_name || order.lines.some((l) => l.for_name)) && (
                    <span className="text-muted">
                      {" "}· for {line.for_name ?? order.name}
                    </span>
                  )}
                </span>
                <span>{naira(line.qty * line.unit_price_at_order)}</span>
              </li>
            ))}
          </ul>

          <dl className="space-y-1 text-sm text-muted">
            {/* Nothing is bought on a parcel, so "Food ₦0" is a line about
                something that never happened. */}
            {!order.parcel && (
              <div className="flex justify-between">
                <dt>Food</dt>
                <dd>{naira(order.food)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>
                {order.parcel
                  ? "Carrying it"
                  : order.joinedDelivery
                  ? "Delivery, sharing a car with a friend"
                  : order.otherItems > 0
                    ? `Delivery top-up (${order.otherItems} more item${
                        order.otherItems === 1 ? "" : "s"
                      } already in this run)`
                    : "Delivery"}
              </dt>
              <dd>{naira(order.fee)}</dd>
            </div>
            {/* Without this the food and the delivery do not add up to the
                total, and somebody watching the bank is looking for the wrong
                amount. */}
            {order.discount > 0 && (
              <div className="flex justify-between">
                <dt>
                  Discount
                  {order.couponCode && (
                    <span className="font-semibold text-ink"> · {order.couponCode}</span>
                  )}
                </dt>
                <dd className="font-semibold text-ink">−{naira(order.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>Pays by</dt>
              <dd>{order.paymentMethod === "card" ? "Card link" : "Transfer"}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Narration to look for</dt>
              <dd className="font-semibold text-ink">{order.narration}</dd>
            </div>
            {order.pin && (
              <div className="flex justify-between">
                {/* A PIN belongs to a phone number, not to a group. In a
                    one-payer group this is the buyer's, and the friends have
                    none of their own until they order themselves. */}
                <dt>
                  PIN for {formatPhone(order.phone)}
                  {order.inGroup && " (whoever placed this)"}
                </dt>
                <dd className="font-semibold text-ink">{order.pin}</dd>
              </div>
            )}
          </dl>

          <form action={saveNote} className="space-y-1.5">
            <label className="label" htmlFor={`note-${order.id}`}>
              Your note on this order
            </label>
            <div className="flex gap-2">
              <input
                id={`note-${order.id}`}
                name="admin_note"
                defaultValue={order.adminNote}
                placeholder="Paid in cash at the gate, wants it early"
                className="field grow py-2 text-sm"
              />
              <input type="hidden" name="order_id" value={order.id} />
              <SaveButton quiet className="shrink-0 px-4 py-2 text-sm">
                Save
              </SaveButton>
            </div>
            <p className="text-xs text-muted">Only you see this.</p>
          </form>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/o/${order.id}`}
              target="_blank"
              className="chip border-black/10 bg-white"
            >
              Open customer page
            </Link>
            {/* Cancelling is for an order nobody paid for: a test, a
                duplicate, somebody who changed their mind before any money
                moved. Once money has moved it is a refund, which is a
                different thing, so the two are never offered together. */}
            {order.status === "pending" ? (
              <form action={cancel}>
                <input type="hidden" name="order_id" value={order.id} />
                <ConfirmButton tone="brand" confirm="Yes, cancel it">
                  Cancel this order
                </ConfirmButton>
              </form>
            ) : order.status !== "refunded" && order.status !== "cancelled" ? (
              <form action={refund}>
                <input type="hidden" name="order_id" value={order.id} />
                <ConfirmButton tone="brand" confirm={`Yes, refund ${naira(order.total)}`}>
                  Refund
                </ConfirmButton>
              </form>
            ) : null}

            {/* For the ones that should never have existed: a test, a bot, a
                duplicate of a duplicate. Cancelling leaves a row that says
                what happened, which is right nearly always; this really is
                gone. Never offered on an order anybody paid for.

                Cancelled ones only. A live order is somebody waiting for
                food, and going from waiting to gone in one press is how an
                order disappeared overnight with nobody able to say what had
                become of it. Cancel first: that is the decision, and this is
                only the tidying up afterwards. */}
            {order.status === "cancelled" && (
              <form action={remove}>
                <input type="hidden" name="order_id" value={order.id} />
                <ConfirmButton tone="brand" confirm="Yes, delete it for good">
                  Delete
                </ConfirmButton>
              </form>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "pending"
      ? "bg-brand-tint text-brand-dark"
      : status === "refunded" || status === "cancelled"
        ? "bg-black/5 text-muted"
        : "bg-mint/10 text-mint";
  return (
    <span className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>
      {status === "pending" ? "Unpaid" : status}
    </span>
  );
}
