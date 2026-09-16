import Link from "next/link";
import { notFound } from "next/navigation";
import ExpiryNote from "@/components/ExpiryNote";
import ShareLink from "@/components/ShareLink";
import { SLOT_LABEL } from "@/lib/config";
import { naira } from "@/lib/money";
import { getOrder } from "@/lib/orders";
import { formatPhone } from "@/lib/phone";
import { clockLabel, runDateLabel, weekdayLabel } from "@/lib/time";
import { getSettings, hasBankDetails, whatsappLink } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const order = await getOrder((await params).id);
  if (!order) notFound();

  const settings = await getSettings();

  const batchLabel = `${weekdayLabel(order.batch.run_date)} ${SLOT_LABEL[order.batch.slot]}`;
  const expired = new Date(order.batch.cut_off_at).getTime() <= Date.now();
  const awaitingPayment = order.status === "pending";

  return (
    <div className="space-y-5">
      <section className="card space-y-1">
        <h1 className="text-xl font-bold">
          {order.customer_name}&apos;s order · {batchLabel}
        </h1>
        <p className="text-sm text-ink/70">
          {runDateLabel(order.batch.run_date)} · {order.batch.delivery_window_text} ·{" "}
          {order.hostel}
        </p>
        <p className="text-sm text-ink/70">
          Batch closes {clockLabel(order.batch.cut_off_at)}
        </p>
      </section>

      <section className="card space-y-2">
        <h2 className="font-semibold">Items</h2>
        <ul className="space-y-1 text-sm">
          {order.lines.map((line) => (
            <li key={line.id} className="flex justify-between">
              <span>
                {line.qty}× {line.name}{" "}
                <span className="text-ink/50">({line.restaurant})</span>
                {line.for_name && (
                  <span className="text-ink/50"> · for {line.for_name}</span>
                )}
              </span>
              <span>{naira(line.qty * line.unit_price_at_order)}</span>
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

      {order.group && order.shares.length > 1 && (
        <section className="card space-y-2">
          <h2 className="font-semibold">
            {order.group.mode === "split" ? "Everyone's share" : "Group order"}
          </h2>
          <ul className="space-y-1 text-sm">
            {order.shares.map((share) => (
              <li key={share.id} className="flex justify-between gap-3">
                <span>
                  {share.for_name ?? order.customer_name}
                  {share.id === order.id && <span className="text-ink/50"> · this link</span>}
                </span>
                <span
                  className={
                    share.status === "pending" ? "text-brand" : "text-green-700"
                  }
                >
                  {naira(share.total)} ·{" "}
                  {share.status === "pending" ? "unpaid" : share.status}
                </span>
              </li>
            ))}
          </ul>
          {order.group.mode === "split" && (
            <p className="text-xs text-ink/50">
              Send each person their own link. Anything still unpaid at the cut-off is
              dropped and the rest of the order still travels — and if that makes the
              order smaller, the delivery fee drops with it and the difference is
              refunded.
            </p>
          )}
        </section>
      )}

      {order.refund_owed > 0 && (
        <section className="card">
          <h2 className="font-semibold">Refund owed: {naira(order.refund_owed)}</h2>
          <p className="mt-1 text-sm text-ink/70">
            Your group got smaller, so the delivery fee dropped a band. The difference
            comes back to you.
          </p>
        </section>
      )}

      {order.status === "paid" || order.status === "delivered" ? (
        <section className="card">
          <h2 className="font-semibold text-green-700">Paid — you are on the run.</h2>
          <p className="mt-1 text-sm text-ink/70">
            Come to the drop point at {order.batch.delivery_window_text.toLowerCase()}.
            Names are called from the list. No reminders will be sent — paid is paid.
          </p>
        </section>
      ) : order.status === "refunded" ? (
        <section className="card">
          <h2 className="font-semibold">Refunded</h2>
          <p className="mt-1 text-sm text-ink/70">
            This order was refunded in full. Sorry about that —{" "}
            <Link href="/" className="text-brand underline">
              order into the next batch
            </Link>
            .
          </p>
        </section>
      ) : expired ? (
        <section className="card">
          <h2 className="font-semibold">This link has expired</h2>
          <p className="mt-1 text-sm text-ink/70">
            The {batchLabel} batch has left. Nothing was charged.{" "}
            <Link href="/" className="text-brand underline">
              Order into the next batch
            </Link>{" "}
            — it takes one tap.
          </p>
        </section>
      ) : (
        <section className="card space-y-3">
          <h2 className="font-semibold">Pay {naira(order.total)} to confirm</h2>
          <ExpiryNote cutOffISO={order.batch.cut_off_at} />
          {hasBankDetails(settings) ? (
            <>
              <dl className="space-y-1 rounded-lg bg-black/5 px-3 py-2 text-sm">
                <Row label="Bank" value={settings.bank_name} />
                <Row label="Account name" value={settings.bank_account_name || "—"} />
                <Row label="Account number" value={settings.bank_account_number} />
                <Row label="Use as narration" value={formatPhone(order.customer_phone)} />
              </dl>
              <p className="text-sm text-ink/70">
                Put the phone number in the transfer narration — that is how the payment
                is matched to this order. Transfer only; no cash at the drop point.
              </p>
            </>
          ) : (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Transfer details are being set up. Message us and we will send them to you.
            </p>
          )}

          <CardPayment order={order} settings={settings} batchLabel={batchLabel} />

          <ShareLink label="Send this to whoever is paying" />
          <p className="text-xs text-ink/50">
            Not paying yourself? Send the link — it shows the items and the total, and
            the order confirms once we see the money.
          </p>
        </section>
      )}

      {awaitingPayment && !expired && (
        <p className="text-center text-xs text-ink/50">
          Already paid? This page updates once the transfer is matched. Refresh it.
        </p>
      )}
    </div>
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
}: {
  order: { id: string; customer_name: string; total: number };
  settings: Awaited<ReturnType<typeof getSettings>>;
  batchLabel: string;
}) {
  const link = whatsappLink(
    settings.whatsapp_number,
    `Hi — I want to pay by card for my Sudu Delivery order.\n\n` +
      `Name: ${order.customer_name}\n` +
      `Batch: ${batchLabel}\n` +
      `Total: ${naira(order.total)}\n` +
      `Order: ${order.id.slice(0, 8)}`
  );
  if (!link) return null;

  return (
    <div className="rounded-lg border border-black/10 p-3">
      <h3 className="font-medium">Paying by card instead?</h3>
      <p className="mt-1 text-sm text-ink/70">{settings.card_note}</p>
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
    <div className={`flex justify-between gap-4 ${strong ? "font-semibold" : "text-ink/70"}`}>
      <dt>{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
