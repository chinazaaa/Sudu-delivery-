import Link from "next/link";
import PinForm from "@/components/PinForm";
import { currentCustomer } from "@/lib/customer-auth";
import { SLOT_LABEL } from "@/lib/config";
import { naira } from "@/lib/money";
import { ordersForPhone } from "@/lib/orders";
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
        <p className="text-ink/70">
          Your phone number and PIN bring back everything you have ordered. No account,
          no password.
        </p>
        <PinForm />
      </div>
    );
  }

  const orders = await ordersForPhone(phone);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">My orders</h1>
        <form action={forgetMe}>
          <button className="text-sm text-ink/50 hover:underline">Not you?</button>
        </form>
      </div>

      {orders.length === 0 ? (
        <p className="text-ink/70">Nothing here yet.</p>
      ) : (
        <ul className="space-y-2">
          {orders.map((order) => (
            <li key={order.id}>
              <Link href={`/o/${order.id}`} className="card block hover:border-brand">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">
                    {weekdayLabel(order.batch.run_date)} {SLOT_LABEL[order.batch.slot]}
                    {order.for_name && (
                      <span className="text-ink/50"> · {order.for_name}&apos;s share</span>
                    )}
                  </span>
                  <span className="font-semibold">{naira(order.total)}</span>
                </div>
                <p className="text-sm text-ink/60">
                  {runDateLabel(order.batch.run_date)} ·{" "}
                  {order.lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}
                </p>
                <p className="mt-1 text-sm">
                  <StatusLine order={order} />
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm text-ink/60">
        <Link href="/" className="text-brand underline">
          Order something new
        </Link>{" "}
        or{" "}
        <Link href="/reorder" className="text-brand underline">
          repeat your last order
        </Link>
        .
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
  if (order.status === "refunded") return <span className="text-ink/60">Refunded</span>;
  if (order.status === "delivered") return <span className="text-green-700">Delivered</span>;
  return <span className="text-green-700">Paid. {STAGE_LABEL[order.batch.stage]}</span>;
}
