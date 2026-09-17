"use client";

import Link from "next/link";
import { useState } from "react";
import { naira } from "@/lib/money";
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
  createdAt: string;
  paymentMethod: string;
  pin: string | null;
  paymentLink: string | null;
  /** That person's other orders in the same run, which this one tops up. */
  otherItems: number;
  otherFee: number;
  inGroup: boolean;
  customerNote: string;
  adminNote: string;
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
  markPaid,
  markDelivered,
  refund,
  savePaymentLink,
  saveNote,
}: {
  order: OrderCardData;
  markPaid: (form: FormData) => Promise<void>;
  markDelivered: (form: FormData) => Promise<void>;
  refund: (form: FormData) => Promise<void>;
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
            {order.forName && order.forName !== order.name && (
              <span className="font-normal text-muted"> · in {order.name}&apos;s group</span>
            )}
          </h3>
          <p className="text-sm text-muted">
            {order.batchLabel} · {order.hostel} · {formatPhone(order.phone)}
          </p>
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
            <button className="btn-primary px-4 py-2 text-sm">
              Mark paid and message
            </button>
          </form>
        ) : order.status === "paid" ? (
          <form action={markDelivered}>
            <input type="hidden" name="order_id" value={order.id} />
            <button className="btn-quiet px-4 py-2 text-sm">Mark delivered</button>
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

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="chip border-black/10 bg-white hover:border-ink/30"
        >
          {open ? "Hide items" : `${order.lines.length} item lines`}
        </button>
      </div>

      {open && (
        <div className="space-y-3 border-t border-black/5 pt-3">
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
            <div className="flex justify-between">
              <dt>Food</dt>
              <dd>{naira(order.food)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>
                {order.otherItems > 0
                  ? `Delivery top-up (${order.otherItems} more item${
                      order.otherItems === 1 ? "" : "s"
                    } already in this run)`
                  : "Delivery"}
              </dt>
              <dd>{naira(order.fee)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Pays by</dt>
              <dd>{order.paymentMethod === "card" ? "Card link" : "Transfer"}</dd>
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
              <button className="btn-quiet shrink-0 px-4 py-2 text-sm">Save</button>
            </div>
            <p className="text-xs text-muted">Only you see this.</p>
          </form>

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
              <button className="btn-quiet shrink-0 px-4 py-2 text-sm">Save</button>
            </div>
            <p className="text-xs text-muted">
              Saved against this order, so you can send it again without
              generating another one.
            </p>
          </form>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/o/${order.id}`}
              target="_blank"
              className="chip border-black/10 bg-white"
            >
              Open customer page
            </Link>
            {order.status !== "refunded" && (
              <form action={refund}>
                <input type="hidden" name="order_id" value={order.id} />
                <button className="chip border-black/10 bg-white text-brand">
                  Refund
                </button>
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
      : status === "refunded"
        ? "bg-black/5 text-muted"
        : "bg-mint/10 text-mint";
  return (
    <span className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>
      {status === "pending" ? "Unpaid" : status}
    </span>
  );
}
