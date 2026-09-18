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
import { naira, orderRef } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { markPaid, markDelivered, refundOrder, savePaymentLink, saveOrderNote } from "../../actions";

export const dynamic = "force-dynamic";

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Production hides why a server render failed and shows a React number
  // instead, which names nothing and cannot be searched for. Admin is behind a
  // password, so the page says what actually went wrong to the one person who
  // can do something about it.
  try {
    return await orderPage(id);
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

async function orderPage(id: string) {

  const [order, settings, url] = await Promise.all([
    getOrder(id),
    getSettings(),
    siteUrl(),
  ]);
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
        title={`Order ${orderRef(order)}`}
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

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total" value={order.total} money />
        <Stat label="Food" value={order.subtotal_food} money />
        <Stat label="Delivery" value={order.fee} money />
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
