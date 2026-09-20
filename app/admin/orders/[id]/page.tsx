import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import OrderCard from "@/components/admin/OrderCard";
import { orderFeed } from "@/lib/admin-data";
import { getOrder } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { payableAccounts } from "@/lib/banks";
import { siteUrl, toCard } from "@/lib/admin-templates";
import { naira, shareRef } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { whatsappTo } from "@/lib/messages";
import {
  markPaid,
  markDelivered,
  moveOrderToAnother,
  refundOrder,
  savePaymentLink,
  saveOrderNote,
} from "../../actions";
import { openBatches } from "@/lib/batches";
import { hoursByDay } from "@/lib/settings";
import { deliverySlots } from "@/lib/same-day";
import { toBatchView } from "@/lib/view";
import { dayWord } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AdminOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  /** What the last move said, good or bad. It travels in the address so the
   *  page can be a server page and still report what happened. */
  searchParams: Promise<{ moved?: string }>;
}) {
  const { id } = await params;
  const said = (await searchParams).moved ?? "";

  // Production hides why a server render failed and shows a React number
  // instead, which names nothing and cannot be searched for. Admin is behind a
  // password, so the page says what actually went wrong to the one person who
  // can do something about it.
  try {
    return await orderPage(id, said);
  } catch (error) {
    // notFound() and redirect() travel as errors and must not be caught.
    const digest = (error as { digest?: unknown }).digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_")) throw error;

    const detail = error instanceof Error ? error : new Error(String(error));
    return (
      <div className="card space-y-2 border-red-200 bg-red-50">
        <h1 className="font-extrabold text-red-800">This order would not open</h1>
        <p className="break-words text-sm text-red-900">{detail.message}</p>
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-white/70 p-3 text-xs text-red-900">
          {(detail.stack ?? "").split("\n").slice(0, 6).join("\n")}
        </pre>
        <Link href="/admin/orders" className="btn-quiet w-fit px-4 py-2 text-sm">
          Back to orders
        </Link>
      </div>
    );
  }
}

async function orderPage(id: string, said: string) {

  const [order, settings, url, runs] = await Promise.all([
    getOrder(id),
    getSettings(),
    siteUrl(),
    openBatches(),
  ]);

  // Where this one could go instead, soonest first: a run still taking
  // orders, or a window of its own, which makes its car when it is picked.
  const slots =
    settings.same_day_on === "on"
      ? deliverySlots(new Date(), await hoursByDay())
      : [];
  // The account every payment message quotes: the first on the list.
  const bank = (await payableAccounts(settings))[0] ?? null;
  if (!order) notFound();

  // The card wants the feed's shape, so this one order is read the same way.
  const card = (await orderFeed({ status: "all", search: order.customer_phone })).find(
    (row) => row.id === order.id
  );

  return (
    <div>
      <PageHeader
        // The same wording as the card below it and the transfer narration:
        // #1001a, not #1001 on one screen and #1001a on the next.
        title={`Order ${shareRef(order, order.shares.length > 0 ? order.shares : [order])}`}
        detail={`${order.customer_name} · ${formatPhone(order.customer_phone)} · ${order.hostel}`}
        backHref="/admin/orders"
        backLabel="All orders"
        actions={
          <Link
            href={`/admin/batch/${order.batch_id}`}
            className="btn-quiet px-4 py-2.5 text-sm"
          >
            Open its run
          </Link>
        }
      />

      <div
        className={`mb-4 grid grid-cols-2 gap-3 ${
          order.discount > 0 ? "sm:grid-cols-5" : "sm:grid-cols-4"
        }`}
      >
        <Stat label="Total" value={order.total} money />
        <Stat label="Food" value={order.subtotal_food} money />
        <Stat label="Delivery" value={order.fee} money />
        {/* Only when there is one, so an ordinary order is not four fifths
            zeroes. The code is the hint, because the amount alone does not say
            which offer it came from. */}
        {order.discount > 0 && (
          <Stat
            label="Discount"
            value={`−${naira(order.discount)}`}
            hint={order.coupon_code ?? "No code, taken off by hand"}
          />
        )}
        <Stat
          label="Status"
          value={order.status === "pending" ? "Unpaid" : order.status}
          tone={order.status === "pending" ? "warn" : "good"}
        />
      </div>

      {card && (
        <OrderCard
          order={toCard(card, settings, url, bank)}
          markPaid={markPaid}
          markDelivered={markDelivered}
          refund={refundOrder}
          savePaymentLink={savePaymentLink}
          saveNote={saveOrderNote}
        />
      )}

      {/* Somebody paid after the cut off, so the car they were on has gone
          shopping without them. Moving them is a decision about a person, and
          telling them is a message written by hand, so both live here rather
          than in a rule that runs at night. */}
      <section className="card mt-4 space-y-2">
        <h2 className="font-bold">Move it to another run</h2>
        <p className="text-sm text-muted">
          On {order.batch.delivery_window_text.toLowerCase()},{" "}
          {dayWord(order.batch.run_date)}. A paid order carries its money
          across: nothing is charged again and nothing is refunded.
        </p>
        {said !== "" && (
          <div className="space-y-2 rounded-xl bg-shell px-3 py-2">
            <p className="text-sm font-semibold">{said}</p>
            {/* Click to send, never sent for them. Somebody whose run was
                changed under them is owed a message from a person, and the
                wording here is only a head start on writing it. */}
            {said.startsWith("Moved") && (
              <a
                href={whatsappTo(
                  order.customer_phone,
                  `Hi ${order.customer_name}, your order ${shareRef(
                    order,
                    order.shares.length > 0 ? order.shares : [order]
                  )} could not make the run it was on, so I have moved it to the next one: ` +
                    `${order.batch.delivery_window_text.toLowerCase()}, ${dayWord(
                      order.batch.run_date
                    )}. There is nothing extra to pay.\n\nYour order: ${url}/o/${order.id}`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="chip border-black/10 bg-white text-brand"
              >
                Tell them on WhatsApp
              </a>
            )}
          </div>
        )}
        <form action={moveOrderToAnother} className="flex flex-wrap gap-2">
          <input type="hidden" name="order_id" value={order.id} />
          <select name="going" className="field grow" defaultValue="">
            <option value="" disabled>
              Where it goes now
            </option>
            {runs
              .map(toBatchView)
              .filter((one) => !one.closed && !one.full && one.id !== order.batch_id)
              .map((one) => (
                <option key={one.id} value={`run:${one.id}`}>
                  {one.deliveryWindow}, {one.label.split(" · ")[0]}
                </option>
              ))}
            {slots.length > 0 && (
              <optgroup label="A car of its own">
                {slots.map((slot) => (
                  <option key={slot.at} value={slot.at}>
                    {slot.label}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <button type="submit" className="btn-quiet px-4 py-2.5 text-sm">
            Move it
          </button>
        </form>
      </section>

      {order.shares.length > 1 && (
        <section className="card mt-4 space-y-2">
          <h2 className="font-bold">The rest of this group</h2>
          <ul className="space-y-2 text-sm">
            {order.shares.map((share) => (
              <li key={share.id} className="flex items-center justify-between gap-3">
                <span>
                  {share.for_name ?? share.customer_name}
                  <span className="text-muted"> · {formatPhone(share.customer_phone)}</span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="font-semibold">{naira(share.total)}</span>
                  {share.id === order.id ? (
                    <span className="text-xs text-muted">this one</span>
                  ) : (
                    <Link
                      href={`/admin/orders/${share.id}`}
                      className="text-xs font-semibold text-brand"
                    >
                      Open
                    </Link>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
