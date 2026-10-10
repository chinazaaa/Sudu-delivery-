"use client";

import Link from "next/link";
import { useState } from "react";
import ConfirmButton from "./ConfirmButton";
import SaveButton from "@/components/SaveButton";
import { naira } from "@/lib/money";
import { STAGE_LABEL, type BatchStage } from "@/lib/stages";
import { formatPhone } from "@/lib/phone";
import { placedLabel } from "@/lib/time";

export type OrderCardLine = {
  id: string;
  qty: number;
  name: string;
  restaurant: string;
  choices: string[];
  for_name: string | null;
  unit_price_at_order: number;
  /** Where to go and get it, where it is one of ours rather than a
   *  restaurant's. Empty for nearly every line. */
  source?: string;
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
  /** Whether this customer has been ticked as having left a Google
   *  review. Not a fact Google ever tells anybody: ticked by hand. */
  reviewed?: boolean;
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
  /** "Every month", where they asked for it again. Empty otherwise. */
  repeats: string;
  /** A box nobody has picked a day for yet. */
  dayToAgree: boolean;
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

/** A state read off the order, not a control: the board's small tinted
 *  `.chip`, which is our `tag` and is never pressable. */
function Tag({
  children,
  tone = "wash",
}: {
  children: React.ReactNode;
  tone?: "wash" | "brand" | "volt";
}) {
  const skin =
    tone === "brand"
      ? "bg-brand text-white"
      : tone === "volt"
        ? "bg-brand-tint text-brand-dark"
        : "bg-wash text-ink";
  return <span className={`tag ${skin}`}>{children}</span>;
}

/**
 * One order, everything about it in one place. Marking paid and messaging the
 * customer is a single tap: the order is updated and WhatsApp opens with the
 * confirmation already written.
 *
 * Sized to the admin board rather than the shop: the figure is the display
 * face at twenty-eight pixels, the states are small tinted labels, and every
 * action in the row is `.btn-admin-sm`. It used to be built out of the shop's
 * forty-four pixel `chip`, which is a thumb target, and a row of eight of
 * them is what made the list read as a blown-up version of itself.
 */
export default function OrderCard({
  order,
  onList = true,
  lead,
  without = [],
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
  /** The tick beside the order, where the list is picking several of them.
   *  It sits inside the card because that is where the board draws it: a
   *  checkbox floating outside the outline reads as belonging to nothing. */
  lead?: React.ReactNode;
  /** Message kinds the page already offers above the card, so the same
   *  WhatsApp link is not handed over twice. The board puts the PIN and the
   *  review at the top of the order's own page. */
  without?: string[];
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
  // The board gives the row itself a PIN button, so it is taken out of the
  // row of message buttons below: the same WhatsApp link offered twice on
  // one card is the same message sent twice.
  const pin = onList ? order.templates.find((one) => one.kind === "pin") ?? null : null;
  const offer = order.templates.filter(
    (one) => !without.includes(one.kind) && !(pin !== null && one.kind === "pin")
  );

  return (
    <article className="card space-y-2.5 px-3.5 py-3 sm:space-y-3 sm:px-4 sm:py-3.5">
      {/* On the order's own page the header, the stat row and the editor
          have already said who this is and what it comes to. Saying it a
          fourth time is what makes the page read as four cards about
          nothing. Here it is only the things to do. */}
      {onList && (
        <div className="flex items-start gap-2.5 sm:gap-3.5">
          {lead}
          <div className="min-w-0 flex-1">
            {/* One baseline row: the reference, the name, the day. The board
                reads it left to right in one glance, which three stacked
                lines of the same words never did. */}
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <Link
                href={`/admin/orders/${order.id}`}
                className="font-mono text-[13px] text-muted hover:text-brand"
              >
                {order.ref}
              </Link>
              <strong className="text-[15.5px] sm:text-[17px]">{order.forName ?? order.name}</strong>
              <span className="text-[13.5px] text-muted">
                {order.batchLabel} · {order.hostel}
              </span>
            </div>
            {/* The number to ring, and when it came in, which is not the day
                it is for. The email can be missed, and then the only
                question is how long this has been sitting here unpaid. */}
            <p className="hint mt-0.5">
              {formatPhone(order.phone)}
              {order.createdAt ? ` · ordered ${placedLabel(order.createdAt)}` : ""}
            </p>
            {order.groupRef && (
              <Link
                href={`/admin/orders?status=all&q=${order.groupRef}`}
                className="mt-0.5 inline-block text-[13.5px] font-semibold text-brand"
              >
                Part of group #{order.groupRef} · {order.groupSize} parts
                {order.forName && order.forName !== order.name && (
                  <span className="font-normal text-muted"> · {order.name} started it</span>
                )}
              </Link>
            )}
            {/* Everything that used to be six stacked lines, as one wrapped
                row of tinted labels. A card in a list is scanned, not read:
                the eye wants the name, the money and the state of it, and
                the rest is detail that should take up the space detail
                deserves. */}
            <div className="mt-[7px] flex flex-wrap items-center gap-1.5">
              {order.parcel && <Tag tone="volt">Parcel · {order.parcel.route}</Tag>}
              {/* Before the link is made, not after: a Stripe link in the
                  wrong currency is a payment that has to be sent back. */}
              {order.payCurrency !== "" && (
                <Tag tone="brand">
                  Card link in {order.payCurrency}
                  {order.payRoughly ? ` · ${order.payRoughly}` : ""}
                </Tag>
              )}
              <Tag tone={order.paymentMethod === "card" && !order.paymentLink ? "volt" : "wash"}>
                {order.paymentMethod !== "card"
                  ? "Transfer"
                  : order.paymentLink
                    ? "Card link saved"
                    : "Wants a card link"}
              </Tag>
              {order.repeats !== "" && <Tag tone="volt">{order.repeats}</Tag>}
              {order.dayToAgree && <Tag tone="volt">Day to agree</Tag>}
              {/* What is on their own page, worked out their way.
                  It used to print the run's stage for any order that was not
                  pending, so a cancelled order on a run that went out
                  without it read "They see: Delivered". The run was
                  delivered. The order was not, and the customer is being
                  told it was. */}
              {order.status !== "pending" && (
                <Tag>
                  They see:{" "}
                  {order.status === "cancelled"
                    ? "Cancelled"
                    : order.status === "refunded"
                      ? "Refunded"
                      : order.status === "delivered"
                        ? "Delivered"
                        : order.runStage === "ordering"
                          ? "Paid and on the run"
                          : STAGE_LABEL[order.runStage]}
                </Tag>
              )}
              {order.source !== "" && (
                <Tag>{order.source === "app" ? "App" : "Website"}</Tag>
              )}
              {order.promoter && (
                <Link
                  href={`/admin/orders?status=all&promoter=${encodeURIComponent(
                    order.promoter.code
                  )}`}
                  className="tag bg-wash text-ink hover:text-brand"
                >
                  Via {order.promoter.name}
                </Link>
              )}
            </div>
          </div>
          <div className="flex flex-none flex-col items-end gap-[7px] text-right">
            <span className="font-display text-[23px] font-black leading-none sm:text-[28px]">
              {naira(order.total)}
            </span>
            <StatusPill status={order.status} />
            {/* The board's two row actions, side by side: their PIN, which
                is the one message a row is opened for, and the way in.
                The PIN used to be the first of a wrapped row of message
                buttons under the card, and the order number at the top has
                always been a link but a number does not look like one, so
                the page that holds the photographs, the run it is on and
                the notes was reachable only by somebody who already knew it
                was there. */}
            <div className="flex gap-1.5">
              {pin && (
                <a
                  href={pin.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-admin btn-admin-sm"
                >
                  PIN
                </a>
              )}
              <Link href={`/admin/orders/${order.id}`} className="btn-admin btn-admin-sm">
                Open →
              </Link>
            </div>
          </div>
        </div>
      )}

      {order.customerNote && (
        <p className="rounded-r-lg border-l-4 border-volt bg-brand-tint px-[11px] py-2 text-[13.5px]">
          <span className="font-bold text-brand-dark">They asked: </span>
          {order.customerNote}
        </p>
      )}

      {order.status === "pending" && (
        <div className="soft bg-brand-tint p-3.5">
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
                className="field min-h-[42px] grow border-[1.5px] border-line bg-paper px-3 py-0 text-[14.5px]"
              />
              <input type="hidden" name="order_id" value={order.id} />
              {/* A pill, not a blob: the save button inherited the shop's
                  fifty-two pixel height with small side padding, which drew
                  a round red lozenge taller than the field beside it. */}
              <SaveButton className="min-h-[38px] shrink-0 px-4 text-[13px]">
                Save
              </SaveButton>
            </div>
            <p className="hint">
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
        <p className="rounded-r-lg border-l-4 border-volt bg-brand-tint px-[11px] py-2 text-[13.5px]">
          <span className="font-bold text-brand-dark">Their group has not closed yet.</span>{" "}
          There is no delivery fee on this order, so {naira(order.total)} is the food
          alone. Wait for the group to close, or you will be marking it paid for less
          than it will cost.
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
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
            <ConfirmButton tone="admin" confirm={`Yes, ${naira(order.total)} received`}>
              Mark paid and message
            </ConfirmButton>
          </form>
        ) : order.status === "cancelled" ? null : order.status === "paid" ? (
          <form action={markDelivered}>
            <input type="hidden" name="order_id" value={order.id} />
            <ConfirmButton tone="admin" confirm="Yes, delivered">Mark delivered</ConfirmButton>
          </form>
        ) : null}

        {offer.map((item) => (
          <a
            key={item.kind}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-admin btn-admin-sm"
          >
            {item.label}
          </a>
        ))}

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="btn-admin btn-admin-sm"
        >
          {open
            ? "Hide details"
            : order.parcel
              ? "The parcel"
              : `${order.lines.length} item lines`}
        </button>
      </div>

      {open && (
        <div className="space-y-3 border-t-[1.5px] border-rule pt-3.5">
          {/* Nothing is bought on a parcel, so there are no lines: what there
              is instead is where to go, what to ask for and what to hand
              over. Everything the trip needs, in the order it is needed. */}
          {order.parcel && (
            <dl className="soft space-y-2 p-3.5">
              {order.parcel.answers.map((one) => (
                <div key={one.question}>
                  <dt className="ticket text-muted">{one.question}</dt>
                  <dd className="text-[14.5px] font-semibold text-ink">{one.answer}</dd>
                </div>
              ))}
            </dl>
          )}
          {/* On the order's own page the editor below lists these, with the
              controls to change them. Two lists of the same twenty things is
              how somebody edits the one that is not editable. */}
          {onList && (
            <ul className="text-[14.5px]">
              {order.lines.map((line) => (
                <li
                  key={line.id}
                  className="flex justify-between gap-3 border-t-[1.5px] border-rule py-2.5 first:border-t-0 first:pt-0"
                >
                  <span className="min-w-0">
                    <span className="font-semibold">
                      <span className="text-muted">{line.qty} ×</span> {line.name}
                    </span>
                    {/* The choices under the name, not trailed after it. On a
                        pizza they are the only thing telling two lines
                        apart, and run into one sentence they are
                        unreadable. */}
                    {line.choices.length > 0 && (
                      <span className="hint mt-0.5 block">{line.choices.join(" · ")}</span>
                    )}
                    <span className="hint block">{line.restaurant}</span>
                    {(line.for_name || order.lines.some((l) => l.for_name)) && (
                      <span className="text-muted"> · for {line.for_name ?? order.name}</span>
                    )}
                    {/* Where to go and get it, for the things no restaurant
                        makes: a cake, flowers, a bucket. The moment anybody
                        needs this is the moment they are looking at the
                        order. */}
                    {(line.source ?? "") !== "" && (
                      <span className="mt-0.5 block text-[12.5px] font-semibold text-brand-dark">
                        Get it: {line.source}
                      </span>
                    )}
                  </span>
                  <span className="font-mono font-semibold">
                    {naira(line.qty * line.unit_price_at_order)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* The ticket label over the money, which is how the board writes
              every row of figures: a muted sentence on the left and a
              number on the right read as two columns of prose, and nobody
              could tell the food from the fee at a glance. */}
          <dl className="text-[14.5px]">
            {/* Nothing is bought on a parcel, so "Food ₦0" is a line about
                something that never happened. */}
            {!order.parcel && (
              <Money label="Food" value={naira(order.food)} />
            )}
            <Money
              label={
                order.parcel
                  ? "Carrying it"
                  : order.joinedDelivery
                    ? "Delivery, sharing a car"
                    : "Delivery"
              }
              detail={
                order.joinedDelivery
                  ? "Sharing a car with a friend"
                  : order.otherItems > 0
                    ? `${order.otherItems} more item${
                        order.otherItems === 1 ? "" : "s"
                      } on this number, charged on its own order`
                    : ""
              }
              value={naira(order.fee)}
            />
            {/* Without this the food and the delivery do not add up to the
                total, and somebody watching the bank is looking for the
                wrong amount. */}
            {order.discount > 0 && (
              <Money
                label="Discount"
                detail={order.couponCode ?? ""}
                value={`−${naira(order.discount)}`}
              />
            )}
            <Money
              label="Pays by"
              value={order.paymentMethod === "card" ? "Card link" : "Transfer"}
            />
            <Money label="Narration to look for" value={order.narration} />
            {order.pin && (
              /* A PIN belongs to a phone number, not to a group. In a
                 one-payer group this is the buyer's, and the friends have
                 none of their own until they order themselves. */
              <Money
                label={`PIN for ${formatPhone(order.phone)}`}
                detail={order.inGroup ? "Whoever placed this" : ""}
                value={order.pin}
              />
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
                className="field min-h-[42px] grow border-[1.5px] border-line bg-paper px-3 py-0 text-[14.5px]"
              />
              <input type="hidden" name="order_id" value={order.id} />
              <SaveButton className="min-h-[38px] shrink-0 px-4 text-[13px]">
                Save
              </SaveButton>
            </div>
            <p className="hint">Only you see this.</p>
          </form>

          <div className="flex flex-wrap gap-1.5">
            <Link
              href={`/o/${order.id}`}
              target="_blank"
              className="btn-admin btn-admin-sm"
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
                <ConfirmButton tone="bad" confirm="Yes, cancel it">
                  Cancel this order
                </ConfirmButton>
              </form>
            ) : order.status !== "refunded" && order.status !== "cancelled" ? (
              <form action={refund}>
                <input type="hidden" name="order_id" value={order.id} />
                <ConfirmButton tone="bad" confirm={`Yes, refund ${naira(order.total)}`}>
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
                <ConfirmButton tone="bad" confirm="Yes, delete it for good">
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

/** One row of the ticket: what it is in the board's `.k` label, what it
 *  comes to on the right, with the hairline rule between rows. */
function Money({
  label,
  detail = "",
  value,
}: {
  label: string;
  /** The qualification that used to be folded into the label itself, which
   *  is how one row grew to three lines of parenthesis. */
  detail?: string;
  value: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t-[1.5px] border-rule py-2 first:border-t-0 first:pt-0">
      <dt className="min-w-0">
        <span className="ticket block text-muted">{label}</span>
        {detail !== "" && <span className="hint block">{detail}</span>}
      </dt>
      <dd className="shrink-0 font-mono text-[14.5px] font-semibold text-ink">{value}</dd>
    </div>
  );
}

/**
 * What state an order is in, as the board's small tinted label.
 *
 * Exported because the order's own page shows the same state beside the
 * total on a phone, and a second copy of these tones is how two screens
 * come to disagree about what colour a refund is.
 */
export function StatusPill({ status }: { status: string }) {
  /* The board's own tints, each of which is a colour in its own right: mint
     for done, volt for paid and waiting, the red wash for money that has
     not arrived or has gone back, and grey for an order that is no longer
     going anywhere. A tint written as an opacity over the solid colour is
     whatever the page happens to be sitting on rather than the board's
     ground.

     Refunded is red and only cancelled is grey, which is what the board
     draws: money handed back is a figure somebody has to account for, and
     the two lumped together said a refund cost nothing. */
  const tone =
    status === "pending"
      ? "bg-brand-wash text-brand-dark"
      : status === "paid"
        ? "bg-volt text-ink"
        : status === "refunded"
          ? "bg-brand-wash text-brand-dark"
          : status === "cancelled"
            ? "bg-wash text-muted"
            : "bg-mint-tint text-mint";
  return <span className={`tag ${tone}`}>{status === "pending" ? "unpaid" : status}</span>;
}
