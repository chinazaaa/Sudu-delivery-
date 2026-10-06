import Link from "next/link";
import { shortRef } from "@/lib/links";
import Empty from "@/components/Empty";
import PinForm from "@/components/PinForm";
import { currentCustomer } from "@/lib/customer-auth";
import { formatPhone } from "@/lib/phone";
import { safeSettings } from "@/lib/settings";
import { SLOT_LABEL } from "@/lib/config";
import { naira } from "@/lib/money";
import RepeatOrder from "@/components/RepeatOrder";
import { ordersForPhone, repeatLines } from "@/lib/orders";
import { STAGE_LABEL } from "@/lib/stages";
import { takesMoney } from "@/lib/batches";
import { dayWord } from "@/lib/time";
import { forgetMe } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const phone = await currentCustomer();
  const settings = await safeSettings();

  // Sent here from somewhere else, to come back to it. Everything that
  // needs a signed-in customer already passes this; it was being dropped
  // on the floor, which left people signed in and stranded on their own
  // order history wondering what they had clicked.
  const { next } = await searchParams;
  const back = (next ?? "").startsWith("/") ? next! : "";

  /*
   * Signed in already, and sent here to sign in.
   *
   * Bouncing straight back was the obvious thing and the wrong one: the
   * reason somebody taps "sign in with your PIN" is almost always that the
   * browser is signed in as somebody else, or as a number they joined with
   * by mistake. Sending them back to the page they just left reads as the
   * link being broken, and they tap it again. So it says who it thinks they
   * are and offers both doors.
   */
  if (phone && back) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">You are signed in</h1>
        <p className="text-ink/75">
          This phone is signed in as{" "}
          <span className="font-semibold">{formatPhone(phone)}</span>.
        </p>
        <div className="card space-y-3">
          <Link href={back} className="btn-primary block w-full text-center">
            Carry on as {formatPhone(phone)}
          </Link>
          <form action={forgetMe}>
            <input type="hidden" name="next" value={`/orders?next=${encodeURIComponent(back)}`} />
            <button className="btn-quiet w-full">
              Not you? Sign in with another number
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!phone) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">
          {back ? "Your number and PIN" : "My orders"}
        </h1>
        <p className="text-ink/75">
          {back
            ? "We already know this number, and your PIN is what proves it is yours. If you have never been sent one, ask below and it goes to your number."
            : "Your phone number and PIN bring back everything you have ordered. No account, no password."}
        </p>
        <PinForm
          whatsapp={settings.whatsapp_number}
          next={back || undefined}
          label={back ? "Carry on" : undefined}
        />
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

      {/* The tab bar carries the group now, and the header's own link to this
          is hidden on a phone, so ordering the same thing again lives here
          where the same things are listed. */}
      {orders.length > 0 && (
        <Link
          href="/reorder"
          className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-paper px-4 py-3"
        >
          <span>
            <span className="block font-bold">Order the same thing again</span>
            <span className="block text-sm text-muted">
              Rebuilt at today&apos;s prices, ready for the next run.
            </span>
          </span>
          <span className="shrink-0 text-sm font-extrabold text-brand">Open</span>
        </Link>
      )}

      {orders.length === 0 ? (
        <Empty icon="bag" title="No orders yet" href="/" action="Browse the menu">
          Everything you order shows up here, with where it has got to and a
          button to order the same thing again.
        </Empty>
      ) : (
        <ul className="space-y-3">
          {orders.map((order, index) => (
            <li key={order.id} className="card space-y-3">
              <Link href={`/o/${shortRef(order)}`} className="block">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">
                    {dayWord(order.batch.run_date)} · {SLOT_LABEL[order.batch.slot]}
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
                  href={`/o/${shortRef(order)}`}
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

/**
 * An order whose run has gone: nothing more can happen to it where it is.
 *
 * The same rule the order page uses, from one place, because this said "run
 * closed, move it to pay" about orders that page was happily taking money
 * for. Every group order landed in that gap, since a group closes on the cut
 * off and writes its orders just after it.
 */
function gone(order: Awaited<ReturnType<typeof ordersForPhone>>[number]): boolean {
  return order.status === "pending" && !takesMoney(order.batch);
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
