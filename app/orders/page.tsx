import Link from "next/link";
import Empty from "@/components/Empty";
import PinForm from "@/components/PinForm";
import { currentCustomer } from "@/lib/customer-auth";
import { safeSettings } from "@/lib/settings";
import { SLOT_LABEL } from "@/lib/config";
import { naira } from "@/lib/money";
import RepeatOrder from "@/components/RepeatOrder";
import { ordersForPhone, repeatLines } from "@/lib/orders";
import { STAGE_LABEL } from "@/lib/stages";
import { runDateLabel } from "@/lib/time";
import { forgetMe } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const phone = await currentCustomer();
  const settings = await safeSettings();

  if (!phone) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">My orders</h1>
        <p className="text-ink/75">
          Your phone number and PIN bring back everything you have ordered. No account,
          no password.
        </p>
        <PinForm whatsapp={settings.whatsapp_number} />
      </div>
    );
  }

  const orders = await ordersForPhone(phone);
  // Each order is rebuilt at today's prices so it can be repeated in one tap,
  // with anything sold out left out and named.
  const repeats = await Promise.all(orders.map((order) => repeatLines(order)));

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">My orders</h1>
        <form action={forgetMe}>
          <button className="text-sm text-muted hover:underline">Not you?</button>
        </form>
      </div>

      {orders.length === 0 ? (
        <Empty icon="bag" title="No orders yet" href="/" action="Browse the menu">
          Everything you order shows up here, with where it has got to and a
          button to order the same thing again.
        </Empty>
      ) : (
        <ul className="space-y-3">
          {orders.map((order, index) => (
            <li key={order.id} className="card space-y-3">
              <Link href={`/o/${order.id}`} className="block">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">
                    {runDateLabel(order.batch.run_date)} · {SLOT_LABEL[order.batch.slot]}
                    {order.for_name && (
                      <span className="text-muted"> · {order.for_name}&apos;s share</span>
                    )}
                  </span>
                  <span className="font-semibold">{naira(order.total)}</span>
                </div>
                <p className="text-sm text-muted">
                  {order.lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}
                </p>
                <p className="mt-1 text-sm">
                  <StatusLine order={order} />
                </p>
              </Link>
              {gone(order) ? (
                <Link
                  href={`/o/${order.id}`}
                  className="btn-quiet w-full py-2.5 text-sm"
                >
                  Move it to another run
                </Link>
              ) : (
                <RepeatOrder
                  lines={repeats[index].lines}
                  blocked={repeats[index].blocked}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {orders.length > 0 && (
        <p className="text-sm text-muted">
          <Link href="/" className="font-semibold text-brand underline">
            Order something new
          </Link>
          , or tap &quot;Order this again&quot; on any order above.
        </p>
      )}
    </div>
  );
}

/** An order whose run has closed: nothing more can happen to it where it is. */
function gone(order: Awaited<ReturnType<typeof ordersForPhone>>[number]): boolean {
  return (
    order.status === "pending" &&
    (order.batch.status !== "open" ||
      order.batch.stage !== "ordering" ||
      new Date(order.batch.cut_off_at).getTime() <= Date.now())
  );
}

function StatusLine({
  order,
}: {
  order: Awaited<ReturnType<typeof ordersForPhone>>[number];
}) {
  if (order.status === "pending") {
    // A run that has gone cannot be paid for, so saying "tap to pay" sends
    // somebody to a page that will refuse their money.
    return gone(order) ? (
      <span className="text-brand">Run closed. Move it to another run to pay.</span>
    ) : (
      <span className="text-brand">Not paid yet. Tap to pay.</span>
    );
  }
  if (order.status === "refunded") return <span className="text-muted">Refunded</span>;
  if (order.status === "delivered") return <span className="text-green-700">Delivered</span>;
  return <span className="text-green-700">Paid. {STAGE_LABEL[order.batch.stage]}</span>;
}
