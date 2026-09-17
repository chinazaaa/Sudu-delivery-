import Link from "next/link";
import { notFound } from "next/navigation";
import ClearCart from "@/components/ClearCart";
import ExpiryNote from "@/components/ExpiryNote";
import StageTimeline from "@/components/StageTimeline";
import ShareLink from "@/components/ShareLink";
import CopyText from "@/components/CopyText";
import { SLOT_LABEL } from "@/lib/config";
import { naira, orderRef } from "@/lib/money";
import { getOrder, type FullOrder, type OrderLine } from "@/lib/orders";
import { pinFor } from "@/lib/customer-auth";
import { formatPhone } from "@/lib/phone";
import { clockLabel, runDateLabel, weekdayLabel } from "@/lib/time";
import { getSettings, hasBankDetails, whatsappLink } from "@/lib/settings";

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
  // Only the person who just checked out sees their PIN, and only their own
  // browser gets emptied. A pay-by-link friend opening this sees neither.
  const justPlaced = (await searchParams).placed === "1";
  const pin = justPlaced ? await pinFor(order.customer_phone) : null;

  const batchLabel = `${weekdayLabel(order.batch.run_date)} ${SLOT_LABEL[order.batch.slot]}`;
  const expired = new Date(order.batch.cut_off_at).getTime() <= Date.now();
  const paid = order.status === "paid" || order.status === "delivered";
  const awaitingPayment = order.status === "pending";
  const drops = dropsFor(order);

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-10">
      {justPlaced && <ClearCart />}

      <header
        className={`rounded-3xl p-5 text-white ${
          paid
            ? "bg-gradient-to-br from-mint to-[#0b7c45]"
            : "bg-gradient-to-br from-brand to-brand-dark"
        }`}
      >
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/75">
          Order {orderRef(order)} ·{" "}
          {paid ? "Paid and on the run" : expired ? "Batch closed" : "Order saved"}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold leading-tight sm:text-3xl">
          {order.customer_name}&apos;s {batchLabel} order
        </h1>
        <p className="mt-1 text-sm text-white/85">
          {runDateLabel(order.batch.run_date)} · {order.batch.delivery_window_text}
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
          <span className="rounded-full bg-white/20 px-3 py-1.5">
            {naira(order.total)} total
          </span>
          <span className="rounded-full bg-white/20 px-3 py-1.5">{order.hostel}</span>
          <span className="rounded-full bg-white/20 px-3 py-1.5">
            {expired ? "Closed" : `Closes ${clockLabel(order.batch.cut_off_at)}`}
          </span>
        </div>
      </header>

      {pin && (
        <section className="card flex flex-wrap items-center justify-between gap-3 border-brand/20 bg-brand-tint">
          <div>
            <h2 className="font-bold">Your PIN is {pin}</h2>
            <p className="text-sm text-ink/75">
              Keep it. Your phone number and this PIN open every order you have
              ever placed, on any device.
            </p>
          </div>
          <div className="flex gap-2">
            <CopyText value={pin} label="Copy PIN" />
            <Link href="/orders" className="btn-quiet">
              My orders
            </Link>
          </div>
        </section>
      )}

      {paid && order.batch.stage !== "ordering" && (
        <section className="card space-y-2">
          <h2 className="font-bold">Where your food is</h2>
          <StageTimeline
            stage={order.batch.stage}
            updatedAt={order.batch.stage_updated_at}
          />
        </section>
      )}

      {/* One bag going to one person needs a line, not a section: the header
          already says whose order this is. */}
      {drops.length === 1 && drops[0].name !== order.customer_name && (
        <section className="card flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">Going to {drops[0].name}</h2>
            <p className="text-sm text-muted">
              {drops[0].hostel || order.hostel}
              {drops[0].phone ? ` · ${formatPhone(drops[0].phone)}` : ""}
            </p>
          </div>
          {drops[0].phone && (
            <div className="flex gap-2">
              <a href={`tel:${drops[0].phone}`} className="chip border-black/10 bg-white">
                Call
              </a>
              {whatsappLink(drops[0].phone, `Hi ${drops[0].name}, your Sudu order is here.`) && (
                <a
                  href={
                    whatsappLink(
                      drops[0].phone,
                      `Hi ${drops[0].name}, your Sudu order is here.`
                    )!
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chip border-black/10 bg-white"
                >
                  WhatsApp
                </a>
              )}
            </div>
          )}
        </section>
      )}

      {drops.length > 1 && (
        <section className="card space-y-3">
          <div>
            <h2 className="font-bold">Where it goes</h2>
            <p className="text-sm text-muted">
              {order.group?.collect_mode === "each"
                ? "Each bag is delivered to that person, at the block under their name."
                : `Everything is delivered to ${order.group?.leader_name ?? order.customer_name}, who hands the rest out.`}
            </p>
          </div>

          {drops.map((drop) => (
            <article
              key={drop.key}
              className="space-y-2 rounded-2xl border border-black/10 p-3"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-bold">{drop.name}</h3>
                <span className="text-sm font-semibold">{naira(drop.food)}</span>
              </div>

              <ul className="space-y-0.5 text-sm text-ink/75">
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

              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="chip border-black/10 bg-shell font-medium">
                  {drop.hostel || order.hostel}
                </span>
                {drop.phone ? (
                  <>
                    <a
                      href={`tel:${drop.phone}`}
                      className="chip border-black/10 bg-white hover:border-ink/30"
                    >
                      Call {formatPhone(drop.phone)}
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
                        className="chip border-black/10 bg-white hover:border-ink/30"
                      >
                        WhatsApp
                      </a>
                    )}
                  </>
                ) : (
                  <span className="text-muted">No number saved for this bag</span>
                )}
                {drop.status && (
                  <span
                    className={`chip border-transparent ${
                      drop.status === "pending"
                        ? "bg-brand-tint text-brand-dark"
                        : "bg-mint/10 text-mint"
                    }`}
                  >
                    {drop.status === "pending" ? "Unpaid" : drop.status}
                  </span>
                )}
                {drop.key === order.id && (
                  <span className="text-xs text-muted">This link</span>
                )}
              </div>
            </article>
          ))}

          {order.group?.mode === "split" && (
            <p className="text-xs text-muted">
              Send each person their own link. Anything still unpaid at the cut-off is
              dropped and the rest of the order still travels. If that makes the order
              smaller, the delivery fee drops with it and the difference comes back to
              you.
            </p>
          )}
        </section>
      )}

      <section className="card space-y-2">
        <h2 className="font-bold">
          {drops.length > 1 ? "Everything in this order" : "Items"}
        </h2>
        <ul className="space-y-1 text-sm">
          {order.lines.map((line) => (
            <li key={line.id} className="flex justify-between gap-3">
              <span>
                {line.qty}× {line.name}{" "}
                <span className="text-muted">({line.restaurant})</span>
                {(line.for_name || order.group) && (
                  <span className="text-muted">
                    {" "}· for {line.for_name ?? order.customer_name}
                  </span>
                )}
              </span>
              <span className="shrink-0 font-medium">
                {naira(line.qty * line.unit_price_at_order)}
              </span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1 border-t border-black/10 pt-2 text-sm">
          <Row label="Food" value={naira(order.subtotal_food)} />
          <Row label={feeLabel(order)} value={naira(order.fee)} />
          {order.discount > 0 && (
            <Row label="First-order discount" value={`−${naira(order.discount)}`} />
          )}
          <Row label="Total" value={naira(order.total)} strong />
        </dl>
      </section>

      {order.refund_owed > 0 && (
        <section className="card border-mint/30 bg-mint/5">
          <h2 className="font-bold">Refund owed: {naira(order.refund_owed)}</h2>
          <p className="mt-1 text-sm text-ink/75">
            Your group got smaller, so the delivery fee dropped a band. The difference
            comes back to you.
          </p>
        </section>
      )}

      {paid ? (
        <section className="card">
          <h2 className="font-bold text-mint">Paid. You are on the run.</h2>
          <p className="mt-1 text-sm text-ink/75">
            {settings.paid_note ||
              `We deliver to ${order.hostel}, ${order.batch.delivery_window_text.toLowerCase()}. ` +
                `You will be called when we are outside.`}
          </p>
        </section>
      ) : order.status === "refunded" ? (
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
      ) : expired ? (
        <section className="card">
          <h2 className="font-bold">This link has expired</h2>
          <p className="mt-1 text-sm text-ink/75">
            The {batchLabel} batch has left. Nothing was charged.{" "}
            <Link href="/" className="font-semibold text-brand underline">
              Order into the next batch
            </Link>
            . It takes one tap.
          </p>
        </section>
      ) : (
        <section className="card space-y-3">
          <h2 className="text-lg font-extrabold">
            Pay {naira(order.total)} to confirm
          </h2>
          <ExpiryNote cutOffISO={order.batch.cut_off_at} />

          {order.payment_method === "card" ? (
            <p className="rounded-xl bg-brand-tint px-3 py-2 text-sm font-semibold text-brand-dark">
              You chose to pay by card. Message us and we will send you a card link.
            </p>
          ) : hasBankDetails(settings) ? (
            <>
              <dl className="space-y-2 rounded-2xl bg-shell p-3 text-sm">
                <Row label="Bank" value={settings.bank_name} />
                <Row label="Account name" value={settings.bank_account_name || "Not set"} />
                <Row label="Account number" value={settings.bank_account_number} strong />
                <Row label="Narration" value={formatPhone(order.customer_phone)} />
              </dl>
              <CopyText
                value={settings.bank_account_number}
                label="Copy account number"
              />
              <p className="text-sm text-ink/75">
                Put your phone number in the transfer narration. That is how the payment
                is matched to this order. Transfer only, and no cash on delivery.
              </p>
            </>
          ) : (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Transfer details are being set up. Message us and we will send them to you.
            </p>
          )}

          <CardPayment order={order} settings={settings} batchLabel={batchLabel} />

          <ShareLink label="Send this to whoever is paying" />
          <p className="text-xs text-muted">
            Not paying yourself? Send the link. It shows the items and the total, and the
            order confirms once we see the money.
          </p>
        </section>
      )}

      {awaitingPayment && !expired && (
        <p className="text-center text-xs text-muted">
          Already paid? This page updates once the transfer is matched. Refresh it.
        </p>
      )}
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

  return [...byName.entries()].map(([name, lines]) => {
    const member = order.members.find((m) => m.name === name);
    const isLeader = name === order.customer_name;
    return {
      key: name,
      name,
      phone: isLeader ? order.customer_phone : member?.phone ?? "",
      hostel: (isLeader ? order.hostel : member?.hostel) || order.hostel,
      lines,
      food: foodOf(lines),
      status: null,
    };
  });
}

function foodOf(lines: OrderLine[]): number {
  return lines.reduce((sum, line) => sum + line.qty * line.unit_price_at_order, 0);
}

/**
 * There is no card gateway. Card payers are sent to WhatsApp, handed a link by
 * hand, and their order is marked paid in admin once the money is seen.
 */
function CardPayment({
  order,
  settings,
  batchLabel,
}: {
  order: { id: string; customer_name: string; total: number };
  settings: Awaited<ReturnType<typeof getSettings>>;
  batchLabel: string;
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
    <div className="rounded-2xl border border-black/10 p-3">
      <h3 className="font-semibold">Paying by card instead?</h3>
      <p className="mt-1 text-sm text-ink/75">{settings.card_note}</p>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-quiet mt-2 w-full"
      >
        Message us on WhatsApp
      </a>
    </div>
  );
}

/** Delivery is priced by container count, so the line says what it counted. */
function feeLabel(order: { lines: { qty: number }[]; for_name: string | null }): string {
  const items = order.lines.reduce((count, line) => count + line.qty, 0);
  return order.for_name
    ? `Delivery (your share of ${items} item${items === 1 ? "" : "s"})`
    : `Delivery (${items} item${items === 1 ? "" : "s"})`;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "font-semibold" : "text-ink/75"}`}>
      <dt>{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
