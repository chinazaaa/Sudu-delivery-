import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import AdminLive from "@/components/admin/AdminLive";
import Stat from "@/components/admin/Stat";
import OrderCard from "@/components/admin/OrderCard";
import { orderFeed } from "@/lib/admin-data";
import { batchOverview } from "@/lib/admin";
import { getSettings } from "@/lib/settings";
import { payableAccounts } from "@/lib/banks";
import { siteUrl, toCard } from "@/lib/admin-templates";
import { SLOT_LABEL } from "@/lib/config";
import { runDateLabel } from "@/lib/time";
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
  }>;
}) {
  const query = await searchParams;
  const tab = TABS.some((item) => item.value === query.status)
    ? (query.status as string)
    : "pending";
  // Card payers are unpaid orders, narrowed by how they said they would pay.
  const status = (tab === "card" ? "pending" : tab) as OrderStatus | "all";

  const [orders, batches, settings, url] = await Promise.all([
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
      <PageHeader
        title="Orders"
        detail="Every order ever placed, whatever run it belongs to."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Showing" value={orders.length} />
        {/* Only where the view can hold an unpaid order. Filtered to paid, it
            was a card reporting zero every time, which is not news. */}
        {canBeUnpaid && (
          <Stat
            label="Money on the table"
            value={unpaidTotal}
            money
            tone={unpaidTotal > 0 ? "warn" : undefined}
            hint="Unpaid in this view"
          />
        )}
        <Stat
          label="Value"
          value={orders.reduce((total, order) => total + order.total, 0)}
          money
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

      <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
        {TABS.map((item) => (
          <Link
            key={item.value}
            href={link({ status: item.value })}
            className={`chip ${
              tab === item.value
                ? "border-ink bg-ink text-white"
                : "border-black/10 bg-white"
            }`}
          >
            {item.label}
          </Link>
        ))}
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
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={toCard(order, settings, url, bank)}
              markPaid={markPaid}
              markDelivered={markDelivered}
              refund={refundOrder}
              cancel={cancelOrder}
              remove={deleteOrder}
              savePaymentLink={savePaymentLink}
              saveNote={saveOrderNote}
            />
          ))}
        </div>
      )}
    </div>
  );
}
