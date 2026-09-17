import Link from "next/link";
import PinForm from "@/components/PinForm";
import { currentCustomer } from "@/lib/customer-auth";
import { SLOT_LABEL } from "@/lib/config";
import { naira } from "@/lib/money";
import RepeatOrder from "@/components/RepeatOrder";
import { ordersForPhone, repeatLines } from "@/lib/orders";
import { STAGE_LABEL } from "@/lib/stages";
import { runDateLabel, weekdayLabel } from "@/lib/time";
import { forgetMe } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const phone = await currentCustomer();

  if (!phone) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">My orders</h1>
        <p className="text-ink/75">
          Your phone number and PIN bring back everything you have ordered. No account,
          no password.
        </p>
        <PinForm />
      </div>
    );
  }

  const orders = await ordersForPhone(phone);
  // Each order is rebuilt at today's prices so it can be repeated in one tap,
  // with anything sold out left out and named.
  const repeats = await Promise.all(
    orders.map(async (order) => {
      const lines = await repeatLines(order);
      const kept = new Set(lines.map((line) => line.itemId));
      return {
        lines,
        missing: [
          ...new Set(
            order.lines
              .filter((line) => !kept.has(line.menu_item_id))
              .map((line) => line.name)
          ),
        ],
      };
    })
  );

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">My orders</h1>
        <form action={forgetMe}>
          <button className="text-sm text-muted hover:underline">Not you?</button>
        </form>
      </div>

      {orders.length === 0 ? (
        <p className="text-ink/75">Nothing here yet.</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((order, index) => (
            <li key={order.id} className="card space-y-3">
              <Link href={`/o/${order.id}`} className="block">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">
                    {weekdayLabel(order.batch.run_date)} {SLOT_LABEL[order.batch.slot]}
                    {order.for_name && (
                      <span className="text-muted"> · {order.for_name}&apos;s share</span>
                    )}
                  </span>
                  <span className="font-semibold">{naira(order.total)}</span>
                </div>
                <p className="text-sm text-muted">
                  {runDateLabel(order.batch.run_date)} ·{" "}
                  {order.lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}
                </p>
                <p className="mt-1 text-sm">
                  <StatusLine order={order} />
                </p>
              </Link>
              <RepeatOrder
                lines={repeats[index].lines}
                missing={repeats[index].missing}
              />
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm text-muted">
        <Link href="/" className="font-semibold text-brand underline">
          Order something new
        </Link>
        , or tap &quot;Order this again&quot; on any order above.
      </p>
    </div>
  );
}

function StatusLine({
  order,
}: {
  order: Awaited<ReturnType<typeof ordersForPhone>>[number];
}) {
  if (order.status === "pending") {
    return <span className="text-brand">Not paid yet. Tap to pay.</span>;
  }
  if (order.status === "refunded") return <span className="text-muted">Refunded</span>;
  if (order.status === "delivered") return <span className="text-green-700">Delivered</span>;
  return <span className="text-green-700">Paid. {STAGE_LABEL[order.batch.stage]}</span>;
}
