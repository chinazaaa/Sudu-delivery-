import Link from "next/link";
import AdminLive from "@/components/admin/AdminLive";
import Figure from "@/components/admin/Figure";
import OrderCard from "@/components/admin/OrderCard";
import { Bar, Picking, Tick } from "@/components/admin/BulkOrders";
import { orderFeed, statusCounts } from "@/lib/admin-data";
import { batchOverview } from "@/lib/admin";
import { getSettings } from "@/lib/settings";
import { payableAccounts } from "@/lib/banks";
import { siteUrl, toCard } from "@/lib/admin-templates";
import { SLOT_LABEL } from "@/lib/config";
import { runDateLabel } from "@/lib/time";
import { naira } from "@/lib/money";
import { templateFor, whatsappTo } from "@/lib/messages";
import {
  cancelOrder,
  markPaid,
  markDelivered,
  deleteOrder,
  refundOrder,
  savePaymentLink,
  saveOrderNote,
} from "../actions";
import type { OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const TABS: { value: string; label: string }[] = [
  { value: "pending", label: "Unpaid" },
  { value: "card", label: "Waiting on a card link" },
  { value: "paid", label: "Paid" },
  { value: "delivered", label: "Delivered" },
  { value: "refunded", label: "Refunded" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "Everything" },
];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    batch?: string;
    q?: string;
    promoter?: string;
    deleted?: string;
  }>;
}) {
  const query = await searchParams;
  const tab = TABS.some((item) => item.value === query.status)
    ? (query.status as string)
    : "pending";
  // Card payers are unpaid orders, narrowed by how they said they would pay.
  const status = (tab === "card" ? "pending" : tab) as OrderStatus | "all";

  const [orders, batches, settings, url, counts] = await Promise.all([
    orderFeed({
      status,
      batchId: query.batch ?? null,
      paymentMethod: tab === "card" ? "card" : null,
      search: query.q,
      promoter: query.promoter ?? null,
    }),
    batchOverview(),
    getSettings(),
    siteUrl(),
    statusCounts(),
  ]);
  // The account every payment message quotes: the first on the list.
  const bank = (await payableAccounts(settings))[0] ?? null;
  // The promoter's name, when the list has been narrowed to one. Read off the
  // orders themselves, so it costs nothing extra.
  const promoterName = query.promoter
    ? orders.find((order) => order.promoter?.code === query.promoter)?.promoter?.name ?? null
    : null;

  const unpaidTotal = orders
    .filter((order) => order.status === "pending")
    .reduce((total, order) => total + order.total, 0);
  // Paid, delivered and refunded all mean the money is settled one way or
  // another, so nothing in those views can be waiting on payment.
  const canBeUnpaid = tab === "pending" || tab === "card" || tab === "all";

  const link = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = {
      status: tab,
      batch: query.batch,
      q: query.q,
      promoter: query.promoter,
      ...next,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    return `/admin/orders?${params.toString()}`;
  };

  return (
    <div>
      <AdminLive />

      <header className="mb-[22px] flex flex-wrap items-start justify-between gap-3.5">
        <div className="min-w-0">
          <h1 className="font-display text-[46px] font-black uppercase leading-[0.95]">
            Orders
          </h1>
          <p className="mt-1.5 text-[14.5px] text-muted">
            Every order ever placed, whatever run it belongs to.
          </p>
        </div>
      </header>

      {/* Said here rather than on the order's own page, because that page is
          the one thing that no longer exists. */}
      {query.deleted && (
        <p className="card mb-4 border-mint/40 bg-mint/10 text-sm font-semibold text-mint">
          {query.deleted} is deleted. It is in the deletions log with who did
          it, and everything it held is written down there.
        </p>
      )}

      <div className="mb-4 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <Figure
          label="Showing"
          value={String(orders.length)}
          detail={TABS.find((one) => one.value === tab)?.label ?? ""}
        />
        <Figure
          label="Value"
          value={naira(orders.reduce((total, order) => total + order.total, 0))}
          detail="Food and delivery"
        />
        {/* Only where the view can hold an unpaid order. Filtered to paid it
            was a card reporting zero every time, which is not news. */}
        {canBeUnpaid && (
          <Figure
            label="Unpaid"
            value={naira(unpaidTotal)}
            tone={unpaidTotal > 0 ? "ink" : "mint"}
            detail={`${orders.filter((one) => one.status === "pending").length} in this view`}
          />
        )}
        <Figure
          label="Average order"
          value={naira(
            orders.length === 0
              ? 0
              : orders.reduce((total, order) => total + order.total, 0) / orders.length
          )}
          tone="mint"
          detail="Across what is showing"
        />
      </div>

      {/* Arrived here from a promoter. Say so plainly, and give one tap back
          out of it, so a short list is never mistaken for a quiet week. */}
      {query.promoter && (
        <p className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-brand-tint px-4 py-3 text-sm text-brand-dark">
          <span className="font-semibold">
            Only orders brought in by{" "}
            {promoterName ?? query.promoter}
          </span>
          <Link href={link({ promoter: "" })} className="chip border-black/10 bg-white">
            Show everyone
          </Link>
        </p>
      )}

      {/* Wrapped rather than scrolled sideways. Seven of these do not fit a
          phone, so reaching one meant a fling, and on iOS the tap after a
          fling is spent stopping it rather than following the link: the
          button "sometimes does not click". Two rows of chips cost a little
          height and nothing else. */}
      <div className="mb-3 flex flex-wrap gap-2">
        {TABS.map((item) => {
          // The tab's own count, so the three unpaid orders can be found
          // without opening tabs until one has rows in it. "Everything" is
          // the only one without, because a number there is just the total
          // said twice.
          const count =
            item.value === "all"
              ? null
              : item.value === "card"
                ? (counts.card ?? 0)
                : (counts[item.value] ?? 0);
          return (
            <Link
              key={item.value}
              href={link({ status: item.value })}
              className={`chip px-3.5 text-sm ${
                tab === item.value
                  ? "border-ink bg-ink text-shell"
                  : "border-ink bg-paper"
              }`}
            >
              {item.label}
              {count !== null && (
                <span className="font-mono opacity-60">{count}</span>
              )}
            </Link>
          );
        })}
      </div>

      <form className="mb-4 flex flex-wrap gap-2" action="/admin/orders">
        <input type="hidden" name="status" value={tab} />
        {query.promoter && (
          <input type="hidden" name="promoter" value={query.promoter} />
        )}
        <input
          name="q"
          defaultValue={query.q ?? ""}
          placeholder="Name, number or block"
          className="field grow py-2 text-sm sm:max-w-xs"
        />
        <select
          name="batch"
          defaultValue={query.batch ?? ""}
          className="field w-auto grow py-2 text-sm sm:max-w-xs"
        >
          <option value="">Every run</option>
          {batches.map((batch) => (
            <option key={batch.id} value={batch.id}>
              {runDateLabel(batch.run_date)} · {SLOT_LABEL[batch.slot]}
            </option>
          ))}
        </select>
        <button className="btn-quiet px-4 py-2 text-sm">Filter</button>
      </form>

      {orders.length === 0 ? (
        <p className="card text-sm text-muted">
          Nothing here yet. Orders appear the moment somebody checks out.
        </p>
      ) : (
        <Picking>
          {/* The runs an order could be moved onto, and the two messages
              that have to be opened one person at a time. */}
          <Bar
            runs={batches
              .filter((one) => one.status === "open")
              .map((one) => ({
                id: one.id,
                label: `${runDateLabel(one.run_date)} · ${SLOT_LABEL[one.slot]}`,
              }))}
            links={Object.fromEntries(
              orders.map((order) => [
                order.id,
                {
                  name: order.customer_name.split(" ")[0],
                  review: whatsappTo(
                    order.customer_phone,
                    templateFor({
                      kind: "review",
                      name: order.customer_name,
                      settings,
                      siteUrl: url,
                    })
                  ),
                  pin: whatsappTo(
                    order.customer_phone,
                    templateFor({
                      kind: "pin",
                      name: order.customer_name,
                      settings,
                      pin: order.pin ?? null,
                      siteUrl: url,
                    })
                  ),
                },
              ])
            )}
          />

          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="flex gap-3">
                <Tick id={order.id} total={order.total} name={order.customer_name} />
                <div className="min-w-0 flex-1">
                  <OrderCard
                    order={toCard(order, settings, url, bank)}
                    markPaid={markPaid}
                    markDelivered={markDelivered}
                    refund={refundOrder}
                    cancel={cancelOrder}
                    remove={deleteOrder}
                    savePaymentLink={savePaymentLink}
                    saveNote={saveOrderNote}
                  />
                </div>
              </div>
            ))}
          </div>
        </Picking>
      )}
    </div>
  );
}
