import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import ClearCart from "@/components/ClearCart";
import PayTo from "@/components/PayTo";
import FeeBands from "@/components/FeeBands";
import LiveOrder from "@/components/LiveOrder";
import ExpiryNote from "@/components/ExpiryNote";
import StageTimeline from "@/components/StageTimeline";
import ShareLink from "@/components/ShareLink";
import SplitCollect from "@/components/SplitCollect";
import CopyText from "@/components/CopyText";
import RepeatOrder from "@/components/RepeatOrder";
import MoveOrder from "@/components/MoveOrder";
import { openBatches } from "@/lib/batches";
import { SLOT_LABEL } from "@/lib/config";
import { naira, shareRef } from "@/lib/money";
import { bandFor, splitFee } from "@/lib/fees";
import { fillNote, narration, PAID_NOTE_DEFAULT } from "@/lib/messages";
import {
  feeStory,
  getOrder,
  repeatLines,
  type FullOrder,
  type OrderLine,
} from "@/lib/orders";
import { formatPhone } from "@/lib/phone";
import { STAGE_LABEL } from "@/lib/stages";
import { clockLabel, runDateLabel, weekdayLabel } from "@/lib/time";
import {
  activeBands,
  externalUrl,
  getSettings,
  whatsappLink,
} from "@/lib/settings";
import { payableAccounts } from "@/lib/banks";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const order = await getOrder((await params).id);
  if (!order) notFound();

  const settings = await getSettings();
  const bands = await activeBands();
  // Every account they may pay into, best first.
  const accounts = await payableAccounts(settings);
  const fees = await feeStory(order);
  const repeat = await repeatLines(order);
  // The runs it could be moved to, for an order whose own run has gone.
  const others = (await openBatches()).filter((run) => run.id !== order.batch_id);
  // An order can change nights right up until its run closes: unpaid because
  // nothing has been charged, paid because the money simply travels with it.
  // After that the food for that run has been bought.
  // Whether anything else is open is a separate question from whether this
  // order may move: hiding the control when the list is empty left people
  // hunting for something the page had silently decided not to show.
  const canStillMove =
    order.batch.status === "open" &&
    order.batch.stage === "ordering" &&
    new Date(order.batch.cut_off_at).getTime() > Date.now();

  // Only the person who just checked out has their browser emptied. A
  // pay-by-link friend opening this keeps their own cart.
  //
  // The PIN is deliberately not on this page. Anyone can place an order under
  // somebody else's number, and printing it here would hand them that
  // person's history. It goes out once, in the message sent after payment.
  const justPlaced = (await searchParams).placed === "1";

  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "";
  const site = host
    ? `${requestHeaders.get("x-forwarded-proto") ?? "https"}://${host}`
    : "";

  const batchLabel = `${weekdayLabel(order.batch.run_date)} ${SLOT_LABEL[order.batch.slot]}`;
  // Two runs can be open at once, so a weekday on its own does not say which.
  const runLabel = `${runDateLabel(order.batch.run_date)} · ${SLOT_LABEL[order.batch.slot]}`;
  // A run stops taking money when its cut-off passes, when it is closed by
  // hand, and the moment it moves past ordering. Otherwise somebody pays for
  // food that is already being cooked, and that money has to go back.
  const expired =
    new Date(order.batch.cut_off_at).getTime() <= Date.now() ||
    order.batch.status !== "open" ||
    order.batch.stage !== "ordering";
  const paid = order.status === "paid" || order.status === "delivered";
  const drops = dropsFor(order);
  const split = order.group?.mode === "split" && order.shares.length > 1;
  // One group reads as one order with a part each: 1005a, 1005b, not 1005 and
  // an unrelated-looking 1006.
  const ref = shareRef(order, order.shares);

  // The whole load is what delivery is priced on, so the page shows the band
  // it landed in and how it was shared out. "Why is my delivery ₦2,000?" has
  // to be answerable from the page itself.
  const allItems = fees.items + fees.otherItems;
  const band = bandFor(Math.max(allItems, 1), bands);
  const bandLabel = Number.isFinite(band.maxItems)
    ? `up to ${band.maxItems} items`
    : "a full load";

  const status =
    order.status === "delivered"
      ? "Delivered"
      : paid
        ? order.batch.stage === "ordering"
          ? "Paid and on the run"
          : STAGE_LABEL[order.batch.stage]
        : order.status === "refunded"
          ? "Refunded"
          : expired
            ? "Batch closed"
            : "Waiting on payment";

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-10">
      {justPlaced && <ClearCart />}
      {order.status !== "refunded" && order.batch.stage !== "handed_out" && <LiveOrder />}

      <header
        className={`rounded-3xl p-5 text-white ${
          paid
            ? "bg-gradient-to-br from-mint to-[#0b7c45]"
            : "bg-gradient-to-br from-brand to-brand-dark"
        }`}
      >
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/75">
          Order {ref} · {status}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold leading-tight sm:text-3xl">
          {naira(order.total)}
        </h1>
        <p className="mt-1 text-sm text-white/85">
          {order.customer_name} · {runLabel} · {order.batch.delivery_window_text}
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
          <span className="rounded-full bg-white/20 px-3 py-1.5">{order.hostel}</span>
          <span className="rounded-full bg-white/20 px-3 py-1.5">
            {expired
              ? "Closed"
              : `Closes ${clockLabel(order.batch.cut_off_at)}, ${runDateLabel(
                  order.batch.run_date
                )}`}
          </span>
          {paid && order.batch.stage !== "ordering" && (
            <span className="rounded-full bg-white/20 px-3 py-1.5">
              Updated {clockLabel(order.batch.stage_updated_at)}
            </span>
          )}
        </div>
      </header>

      {!paid && order.status !== "refunded" && expired && (
        <section className="card space-y-3 border-brand/30 bg-brand-tint">
          <div>
            <h2 className="font-bold">This run has gone. Do not pay it.</h2>
            <p className="mt-1 text-sm text-ink/75">
              Nothing was charged. Move it to another run and it is yours again.
            </p>
          </div>
          <MoveOrder
            orderId={order.id}
            total={order.total}
            runs={others.map((run) => ({
              id: run.id,
              label: `${runDateLabel(run.run_date)} · ${SLOT_LABEL[run.slot]}`,
              closes: `Closes ${clockLabel(run.cut_off_at)}, ${run.delivery_window_text}`,
            }))}
          />
        </section>
      )}

      {/* Paying comes first while it is unpaid, and drops away once it is not. */}
      {!paid && order.status !== "refunded" && !expired && (
        <section className="card space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-extrabold">Pay {naira(order.total)}</h2>
            <ExpiryNote cutOffISO={order.batch.cut_off_at} />
          </div>

          {order.payment_method === "card" ? (
            externalUrl(order.payment_link) ? (
              <a
                href={externalUrl(order.payment_link)!}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full"
              >
                Pay {naira(order.total)} by card
              </a>
            ) : (
              <CardPayment
                order={order}
                settings={settings}
                batchLabel={batchLabel}
                waiting
              />
            )
          ) : accounts.length > 0 ? (
            <>
              <PayTo accounts={accounts} narration={narration(order, order.shares)} />
              <p className="text-sm text-ink/75">
                Type {narration(order, order.shares)} in the narration. That is
                how this transfer is matched to your part of the order.
                Transfer only, no cash on delivery.
              </p>
            </>
          ) : (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Transfer details are being set up. Message us and we will send them
              to you.
            </p>
          )}

          {/* Before paying is exactly when somebody realises they want another
              night. Nothing has been charged, so it simply reprices. */}
          {canStillMove && (
            <MoveOrder
              orderId={order.id}
              total={order.total}
              collapsed
              openLabel="Want it on another run instead?"
              runs={others.map((run) => ({
                id: run.id,
                label: `${runDateLabel(run.run_date)} · ${SLOT_LABEL[run.slot]}`,
                closes: `Closes ${clockLabel(run.cut_off_at)}, ${run.delivery_window_text}`,
              }))}
            />
          )}

          {order.payment_method !== "card" && (
            <CardPayment order={order} settings={settings} batchLabel={batchLabel} />
          )}
          {!split && <ShareLink label="Send this to whoever is paying" />}
        </section>
      )}

      {split && (
        <SplitCollect
          orderId={order.id}
          closed={expired}
          shares={order.shares.map((share) => {
            const name = share.for_name ?? share.customer_name;
            const url = `${site}/o/${share.id}`;
            return {
              id: share.id,
              name,
              ref: shareRef(share, order.shares),
              total: share.total,
              paid: share.status !== "pending",
              url,
              whatsapp: whatsappLink(
                share.customer_phone,
                `Hi ${name}, here is your part of the Sudu order ` +
                  `${shareRef(share, order.shares)}: ${naira(share.total)}. ` +
                  `Pay here and you are on the run: ${url}`
              ),
            };
          })}
        />
      )}

      {paid && (
        <section className="card space-y-2">
          <h2 className="font-bold">Where your food is</h2>
          {order.status === "delivered" ? (
            <p className="text-sm text-ink/75">
              Delivered. Thank you, and see you on the next run.
            </p>
          ) : order.batch.stage === "ordering" ? (
            <p className="text-sm text-ink/75">
              {fillNote(settings.paid_note || PAID_NOTE_DEFAULT, {
                hostel: order.hostel,
                window: order.batch.delivery_window_text.toLowerCase(),
                ref,
                name: order.customer_name,
              })}
            </p>
          ) : (
            <StageTimeline
              stage={order.batch.stage}
              updatedAt={order.batch.stage_updated_at}
            />
          )}

          {canStillMove && (
            <MoveOrder
              orderId={order.id}
              total={order.total}
              paid
              collapsed
              openLabel="Want it on another night instead?"
              runs={others.map((run) => ({
                id: run.id,
                label: `${runDateLabel(run.run_date)} · ${SLOT_LABEL[run.slot]}`,
                closes: `Closes ${clockLabel(run.cut_off_at)}, ${run.delivery_window_text}`,
              }))}
            />
          )}
        </section>
      )}

      {/* One card for the whole order: who has what, where it goes, and what
          it costs. These used to be three cards repeating each other. */}
      <section className="card space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-bold">
            {drops.length > 1 ? "Who has what" : "Your order"}
          </h2>
          {drops.length > 1 && (
            <span className="text-sm text-muted">
              {order.group?.collect_mode === "each"
                ? "Delivered to each person"
                : `All delivered to ${order.group?.leader_name ?? order.customer_name}`}
            </span>
          )}
        </div>

        {drops.length > 1 ? (
          <ul className="space-y-3">
            {drops.map((drop) => (
              <li key={drop.key} className="rounded-2xl border border-black/10 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-bold">
                    {drop.name}
                    {split && (
                      <span className="ml-2 text-xs font-normal text-muted">
                        {shareRef(
                          order.shares.find((share) => share.id === drop.key) ?? order,
                          order.shares
                        )}
                        {drop.key === order.id && " · this link"}
                      </span>
                    )}
                  </h3>
                  <span className="text-right text-sm font-semibold">
                    {naira(drop.food + drop.delivery)}
                    <span className="block text-xs font-normal text-muted">
                      {naira(drop.food)} + {naira(drop.delivery)} delivery
                    </span>
                  </span>
                </div>

                <ul className="mt-1 space-y-0.5 text-sm text-ink/75">
                  {drop.lines.map((line) => (
                    <li key={line.id}>
                      {line.qty}× {line.name}
                      {line.choices.length > 0 && (
                        <span className="text-muted"> · {line.choices.join(", ")}</span>
                      )}
                      <span className="text-muted"> · {line.restaurant}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted">{drop.hostel || order.hostel}</span>
                  {drop.phone && (
                    <>
                      <a href={`tel:${drop.phone}`} className="font-semibold text-brand">
                        {formatPhone(drop.phone)}
                      </a>
                      {whatsappLink(drop.phone, `Hi ${drop.name}, your Sudu order is here.`) && (
                        <a
                          href={
                            whatsappLink(
                              drop.phone,
                              `Hi ${drop.name}, your Sudu order is here.`
                            )!
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-brand"
                        >
                          WhatsApp
                        </a>
                      )}
                    </>
                  )}
                  {drop.status && (
                    <span
                      className={`ml-auto rounded-full px-2.5 py-1 text-xs font-bold ${
                        drop.status === "pending"
                          ? "bg-brand-tint text-brand-dark"
                          : "bg-mint/10 text-mint"
                      }`}
                    >
                      {drop.status === "pending" ? "Unpaid" : drop.status}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="space-y-1 text-sm">
            {order.lines.map((line) => (
              <li key={line.id} className="flex justify-between gap-3">
                <span>
                  {line.qty}× {line.name}
                  {line.choices.length > 0 && (
                    <span className="text-muted"> · {line.choices.join(", ")}</span>
                  )}
                  <span className="text-muted"> · {line.restaurant}</span>
                </span>
                <span className="shrink-0 font-medium">
                  {naira(line.qty * line.unit_price_at_order)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {order.customer_note && (
          <p className="rounded-xl bg-shell px-3 py-2 text-sm">
            <span className="font-semibold">You asked: </span>
            {order.customer_note}
          </p>
        )}

        <dl className="space-y-1 border-t border-black/10 pt-3 text-sm">
          <Row label="Food" value={naira(order.subtotal_food)} />
          <Row
            label={
              fees.otherItems > 0
                ? `Delivery top-up (${allItems} items in this run)`
                : `Delivery (${fees.items} item${fees.items === 1 ? "" : "s"})`
            }
            value={naira(order.fee)}
          />
          {order.discount > 0 && (
            <Row
              label={order.coupon_code ? `Code ${order.coupon_code}` : "Discount"}
              value={`−${naira(order.discount)}`}
            />
          )}
          <Row label="Total" value={naira(order.total)} strong />
        </dl>

        {/* The whole ladder, for anyone wondering why four items cost more
            than three. */}
        <FeeBands
          itemCount={allItems}
          flashFee={order.batch.flash_fee}
          bands={bands}
        />

        {/* The arithmetic, in a line. Delivery is the thing people query. */}
        <p className="text-xs text-muted">
          {order.batch.flash_fee !== null && (
            <>
              Delivery is down tonight.{" "}
              {order.batch.flash_fee_reason || "Enjoy it."}{" "}
            </>
          )}
          {allItems} item{allItems === 1 ? "" : "s"} travel together, which is the{" "}
          {naira(band.fee)} band ({bandLabel}).
          {drops.length > 1 &&
            ` That is shared out by what each person ordered, not split down the middle.`}
          {fees.otherItems > 0 &&
            ` ${naira(fees.otherFee)} of it was charged on your earlier order, so this one carries the rest.`}
        </p>
      </section>

      {order.refund_owed > 0 && (
        <section className="card border-mint/30 bg-mint/5">
          <h2 className="font-bold">Refund owed: {naira(order.refund_owed)}</h2>
          <p className="mt-1 text-sm text-ink/75">
            Your group got smaller, so the delivery fee dropped a band. The
            difference comes back to you.
          </p>
        </section>
      )}

      {order.status === "refunded" && (
        <section className="card">
          <h2 className="font-bold">Refunded</h2>
          <p className="mt-1 text-sm text-ink/75">
            This order was refunded in full. Sorry about that.{" "}
            <Link href="/" className="font-semibold text-brand underline">
              Order into the next batch
            </Link>
            .
          </p>
        </section>
      )}

      {paid && (
        <section className="card space-y-2">
          <h2 className="font-bold">Want this again?</h2>
          <p className="text-sm text-muted">
            Back in your cart at today&apos;s prices, with your details already
            filled in. You pick the run at checkout.
          </p>
          <RepeatOrder lines={repeat.lines} blocked={repeat.blocked} />
        </section>
      )}

      <HelpUs
        settings={settings}
        order={order}
        orderRef={shareRef(order, order.shares)}
        batchLabel={batchLabel}
      />
    </div>
  );
}

type Drop = {
  key: string;
  name: string;
  phone: string;
  hostel: string;
  lines: OrderLine[];
  food: number;
  /** Their share of the delivery, by how many containers they put in. */
  delivery: number;
  status: string | null;
};

/**
 * Who gets what at the drop point. A split group is one order per person, so
 * the shares carry it; a one-payer group is a single order whose lines are
 * labelled, so the names and numbers come from the group's members.
 */
function dropsFor(order: FullOrder): Drop[] {
  if (order.shares.length > 1) {
    return order.shares.map((share) => {
      const name = share.for_name ?? share.customer_name;
      return {
        key: share.id,
        name,
        phone: share.customer_phone,
        hostel: share.hostel,
        lines: share.lines,
        food: foodOf(share.lines),
        // A split group is one order each, so the fee is already theirs.
        delivery: share.total - foodOf(share.lines),
        status: share.status,
      };
    });
  }

  if (!order.group) return [];

  const byName = new Map<string, OrderLine[]>();
  for (const line of order.lines) {
    const who = line.for_name?.trim() || order.customer_name;
    byName.set(who, [...(byName.get(who) ?? []), line]);
  }

  // One order, one payer: the delivery is shared out by container count so the
  // person who paid knows what to collect from everyone else.
  const entries = [...byName.entries()];
  const shares = splitFee(
    order.fee,
    entries.map(([, lines]) => lines.reduce((count, line) => count + line.qty, 0))
  );

  return entries.map(([name, lines], index) => {
    const member = order.members.find((m) => m.name === name);
    const isLeader = name === order.customer_name;
    return {
      key: name,
      name,
      phone: isLeader ? order.customer_phone : member?.phone ?? "",
      hostel: (isLeader ? order.hostel : member?.hostel) || order.hostel,
      lines,
      food: foodOf(lines),
      delivery: shares[index] ?? 0,
      status: null,
    };
  });
}

function foodOf(lines: OrderLine[]): number {
  return lines.reduce((sum, line) => sum + line.qty * line.unit_price_at_order, 0);
}

/** A way to reach a person, on every order, whatever state it is in. */
function HelpUs({
  settings,
  order,
  orderRef,
  batchLabel,
}: {
  settings: Awaited<ReturnType<typeof getSettings>>;
  order: { id: string; customer_name: string; order_no: number | null };
  /** How this order is referred to: #1001b for one part of a group. Not
   *  called ref: React keeps that name for itself, and a server component
   *  handing one to a child is an error with nobody's name on it. */
  orderRef: string;
  batchLabel: string;
}) {
  const link = whatsappLink(
    settings.whatsapp_number,
    `Hi, about my Sudu order ${orderRef} (${order.customer_name}, ${batchLabel}):`
  );
  if (!link) return null;

  return (
    <section className="card flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="font-bold">Need anything?</h2>
        <p className="text-sm text-muted">
          A change, a question, or something wrong with the order. A person
          answers.
        </p>
      </div>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-quiet px-4 py-2.5 text-sm"
      >
        Message us on WhatsApp
      </a>
    </section>
  );
}

/**
 * There is no card gateway. Card payers are sent to WhatsApp, handed a link by
 * hand, and their order is marked paid in admin once the money is seen.
 */
function CardPayment({
  order,
  settings,
  batchLabel,
  waiting = false,
}: {
  order: { id: string; customer_name: string; total: number };
  settings: Awaited<ReturnType<typeof getSettings>>;
  batchLabel: string;
  /** They already chose card and are waiting on the link. */
  waiting?: boolean;
}) {
  const link = whatsappLink(
    settings.whatsapp_number,
    `Hi, I want to pay by card for my Sudu Delivery order.\n\n` +
      `Name: ${order.customer_name}\n` +
      `Batch: ${batchLabel}\n` +
      `Total: ${naira(order.total)}\n` +
      `Order: ${order.id.slice(0, 8)}`
  );
  if (!link) return null;

  return (
    <div
      className={`rounded-2xl p-3 ${
        waiting ? "bg-brand-tint" : "border border-black/10"
      }`}
    >
      <h3 className="font-semibold">
        {waiting ? "We will send your card link on WhatsApp" : "Paying by card instead?"}
      </h3>
      <p className="mt-1 text-sm text-ink/75">
        {waiting
          ? "It comes to the number on this order. Message us if you would rather " +
            "have it now, or to say you have changed your mind and will transfer."
          : settings.card_note ||
            "Message us and we will send you a card link for this order. " +
              "It stays unpaid until the money lands."}
      </p>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-quiet mt-2 w-full"
      >
        {waiting ? "Message us about it" : "Message us on WhatsApp"}
      </a>
    </div>
  );
}

/** Delivery is priced by container count, so the line says what it counted. */
function feeLabel(fees: { items: number; otherItems: number }): string {
  const plural = (n: number) => `${n} item${n === 1 ? "" : "s"}`;
  return fees.otherItems > 0
    ? `Delivery top-up (${plural(fees.items + fees.otherItems)} in this run)`
    : `Delivery (${plural(fees.items)})`;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "font-semibold" : "text-ink/75"}`}>
      <dt>{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
