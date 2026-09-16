import { notFound } from "next/navigation";
import HandoutList from "@/components/HandoutList";
import { batchSheet } from "@/lib/admin";
import { SLOT_LABEL } from "@/lib/config";
import { naira } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { clockLabel, runDateLabel } from "@/lib/time";
import { markDelivered, markPaid, refundOrder, setBatchCapacity, setBatchStatus } from "../../actions";

export const dynamic = "force-dynamic";

export default async function BatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sheet = await batchSheet((await params).id);
  if (!sheet) notFound();

  const { batch, counter, handout, unpaid, summary } = sheet;
  const belowMinimum = summary.paidCount < summary.minimum;

  return (
    <div className="space-y-4">
      <section className="card">
        <h1 className="text-lg font-semibold">
          {runDateLabel(batch.run_date)} · {SLOT_LABEL[batch.slot]}
        </h1>
        <p className="text-sm text-ink/60">
          Cut-off {clockLabel(batch.cut_off_at)} · {batch.delivery_window_text} ·{" "}
          {batch.status}
        </p>
      </section>

      <section className="card space-y-2">
        <h2 className="font-semibold">Batch summary</h2>
        <dl className="space-y-1 text-sm">
          <Row
            label="Paid orders"
            value={`${summary.paidCount} / ${summary.minimum} minimum`}
            tone={belowMinimum ? "warn" : "good"}
          />
          <Row label="Unpaid (not travelling)" value={String(summary.unpaidCount)} />
          <Row label="Gross collected" value={naira(summary.gross)} />
          <Row label="Food cost to pay at counters" value={naira(summary.foodCost)} />
          <Row label="Promoter commission owed" value={naira(summary.commission)} />
          <Row label="Net before fuel and driver" value={naira(summary.net)} strong />
        </dl>
        {belowMinimum && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Below the {summary.minimum}-order minimum. Cancel and refund in full, or
            carry it — but a short batch loses money the next one has to cover.
          </p>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Counter sheet</h2>
        <p className="text-sm text-ink/60">
          Paid orders only. Read this out at the counter.
        </p>
        {counter.length === 0 ? (
          <p className="text-sm text-ink/60">Nothing paid for yet.</p>
        ) : (
          counter.map((group) => (
            <div key={group.restaurant} className="rounded-lg border border-black/10 p-3">
              <h3 className="font-semibold">{group.restaurant}</h3>
              <ul className="mt-1 space-y-1 text-lg leading-snug">
                {group.lines.map((line) => (
                  <li key={line.name}>
                    <span className="font-bold">{line.qty}×</span> {line.name}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-ink/70">
                Expected total here: {naira(group.expectedFoodTotal)}
              </p>
            </div>
          ))
        )}
      </section>

      <section className="card space-y-2">
        <h2 className="font-semibold">Handout list</h2>
        <HandoutList
          batchId={batch.id}
          entries={handout.map((order) => ({
            id: order.id,
            name: order.customer_name,
            hostel: order.hostel,
            phone: formatPhone(order.customer_phone),
            items: order.lines.map((l) => `${l.qty}× ${l.name}`),
          }))}
        />
        {handout.length > 0 && (
          <details className="text-sm text-ink/60">
            <summary className="cursor-pointer">Mark delivered / refund</summary>
            <ul className="mt-2 space-y-2">
              {handout.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-2">
                  <span>
                    {order.customer_name} · {order.status}
                  </span>
                  <span className="flex gap-2">
                    <form action={markDelivered}>
                      <input type="hidden" name="order_id" value={order.id} />
                      <button className="btn-quiet px-2 py-1 text-xs">Delivered</button>
                    </form>
                    <form action={refundOrder}>
                      <input type="hidden" name="order_id" value={order.id} />
                      <button className="btn-quiet px-2 py-1 text-xs">Refund</button>
                    </form>
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section className="card space-y-2">
        <h2 className="font-semibold">Unpaid — these do not travel</h2>
        {unpaid.length === 0 ? (
          <p className="text-sm text-ink/60">None. Everything is paid for.</p>
        ) : (
          <ul className="space-y-3">
            {unpaid.map((order) => (
              <li key={order.id} className="rounded-lg border border-black/10 p-3">
                <p className="font-medium">
                  {order.customer_name} · {naira(order.total)}
                </p>
                <p className="text-sm text-ink/60">
                  {formatPhone(order.customer_phone)} · {order.hostel}
                </p>
                <p className="text-sm">
                  {order.lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}
                </p>
                <form action={markPaid} className="mt-2 flex gap-2">
                  <input type="hidden" name="order_id" value={order.id} />
                  <input
                    name="payment_ref"
                    placeholder="Transfer ref (optional)"
                    className="field py-1 text-sm"
                  />
                  <button className="btn-primary shrink-0 px-3 py-1 text-sm">
                    Mark paid
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Batch controls</h2>
        <form action={setBatchCapacity} className="flex items-end gap-2">
          <input type="hidden" name="batch_id" value={batch.id} />
          <div className="grow">
            <label className="label" htmlFor="capacity">
              Capacity (blank = no cap)
            </label>
            <input
              id="capacity"
              name="capacity"
              inputMode="numeric"
              defaultValue={batch.capacity ?? ""}
              className="field"
            />
          </div>
          <button className="btn-quiet shrink-0">Save</button>
        </form>
        <div className="flex flex-wrap gap-2">
          {(["open", "closed", "delivered", "cancelled"] as const).map((status) => (
            <form action={setBatchStatus} key={status}>
              <input type="hidden" name="batch_id" value={batch.id} />
              <input type="hidden" name="status" value={status} />
              <button
                className="btn-quiet px-3 py-1 text-sm"
                disabled={batch.status === status}
              >
                {status}
              </button>
            </form>
          ))}
        </div>
        <p className="text-xs text-ink/50">
          Cancelling a batch does not refund anyone — refund each order above, same
          night, in full.
        </p>
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "warn" | "good";
}) {
  const colour =
    tone === "warn" ? "text-brand" : tone === "good" ? "text-green-700" : "";
  return (
    <div className={`flex justify-between gap-4 ${strong ? "font-semibold" : ""}`}>
      <dt className="text-ink/70">{label}</dt>
      <dd className={colour}>{value}</dd>
    </div>
  );
}
