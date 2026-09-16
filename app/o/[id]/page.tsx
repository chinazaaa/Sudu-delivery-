import Link from "next/link";
import { notFound } from "next/navigation";
import ExpiryNote from "@/components/ExpiryNote";
import ShareLink from "@/components/ShareLink";
import { BANK, SLOT_LABEL } from "@/lib/config";
import { naira } from "@/lib/money";
import { getOrder } from "@/lib/orders";
import { formatPhone } from "@/lib/phone";
import { clockLabel, runDateLabel, weekdayLabel } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const order = await getOrder((await params).id);
  if (!order) notFound();

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
              </span>
              <span>{naira(line.qty * line.unit_price_at_order)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1 border-t border-black/10 pt-2 text-sm">
          <Row label="Food" value={naira(order.subtotal_food)} />
          <Row label="Delivery (all in)" value={naira(order.fee)} />
          {order.discount > 0 && (
            <Row label="First-order discount" value={`−${naira(order.discount)}`} />
          )}
          <Row label="Total" value={naira(order.total)} strong />
        </dl>
      </section>

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
          <dl className="space-y-1 rounded-lg bg-black/5 px-3 py-2 text-sm">
            <Row label="Bank" value={BANK.name || "—"} />
            <Row label="Account name" value={BANK.accountName || "—"} />
            <Row label="Account number" value={BANK.accountNumber || "—"} />
            <Row label="Use as narration" value={formatPhone(order.customer_phone)} />
          </dl>
          <p className="text-sm text-ink/70">
            Put the phone number in the transfer narration — that is how the payment is
            matched to this order. Transfer only; no cash at the drop point.
          </p>
          <ShareLink label="Send this to whoever is paying" />
          <p className="text-xs text-ink/50">
            Not paying yourself? Send the link — it shows the items and the total, and
            the order confirms the moment the transfer lands.
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

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "font-semibold" : "text-ink/70"}`}>
      <dt>{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
