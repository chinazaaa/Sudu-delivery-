import Link from "next/link";
import Diagnostic from "@/components/Diagnostic";
import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import { batchOverview } from "@/lib/admin";
import { dashboard, orderFeed } from "@/lib/admin-data";
import { diagnoseEmpty, keyKind } from "@/lib/health";
import { ensureUpcomingBatches, closeExpiredBatches } from "@/lib/batches";
import { BATCH_MINIMUM, SLOT_LABEL } from "@/lib/config";
import { naira } from "@/lib/money";
import { clockLabel, runDateLabel } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  let problem: Awaited<ReturnType<typeof diagnoseEmpty>> | null = null;
  let batches: Awaited<ReturnType<typeof batchOverview>> = [];
  let stats: Awaited<ReturnType<typeof dashboard>> | null = null;
  let unpaid: Awaited<ReturnType<typeof orderFeed>> = [];

  try {
    await ensureUpcomingBatches();
    await closeExpiredBatches();
    [batches, stats, unpaid] = await Promise.all([
      batchOverview(),
      dashboard(),
      orderFeed({ status: "pending", limit: 6 }),
    ]);
    if (batches.length === 0) problem = await diagnoseEmpty();
  } catch (error) {
    problem =
      keyKind() === "public"
        ? await diagnoseEmpty()
        : {
            ok: false,
            title: "Could not reach the database",
            detail: error instanceof Error ? error.message : String(error),
          };
  }

  const open = batches.filter((batch) => batch.status === "open");
  const unpaidValue = unpaid.reduce((total, order) => total + order.total, 0);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        detail="The last four weeks, and what needs doing today."
        actions={
          <Link href="/admin/runs?new=1" className="btn-primary px-4 py-2.5 text-sm">
            New run
          </Link>
        }
      />

      {stats && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Paid orders" value={stats.paidOrders} hint="Last 28 days" />
            <Stat label="Money in" value={stats.gross} money hint="Paid orders" />
            <Stat label="Delivery fees" value={stats.fees} money hint="Your margin" />
            <Stat
              label="Profit"
              value={batches.reduce((total, batch) => total + batch.profit, 0)}
              money
              tone="good"
              hint="After food, commission, fuel and driver"
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section className="card">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-bold">Waiting on payment</h2>
                <Link
                  href="/admin/orders?status=pending"
                  className="text-sm font-semibold text-brand"
                >
                  All unpaid
                </Link>
              </div>
              <p className="text-sm text-muted">
                {naira(unpaidValue)} across {unpaid.length} order
                {unpaid.length === 1 ? "" : "s"} shown.
              </p>
              <ul className="mt-3 space-y-2">
                {unpaid.length === 0 && (
                  <li className="text-sm text-muted">
                    Nothing outstanding. Everyone has paid.
                  </li>
                )}
                {unpaid.map((order) => (
                  <li key={order.id} className="flex justify-between gap-3 text-sm">
                    <span className="truncate">
                      {order.for_name ?? order.customer_name}
                      <span className="text-muted"> · {order.batchLabel}</span>
                      {order.payment_method === "card" && (
                        <span className="text-brand"> · card</span>
                      )}
                    </span>
                    <span className="shrink-0 font-semibold">{naira(order.total)}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="card">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-bold">Open runs</h2>
                <Link href="/admin/runs" className="text-sm font-semibold text-brand">
                  All runs
                </Link>
              </div>
              <ul className="mt-3 space-y-2">
                {open.length === 0 && (
                  <li className="text-sm text-muted">
                    No run is open. Create one and the shop starts taking orders.
                  </li>
                )}
                {open.map((batch) => (
                  <li key={batch.id}>
                    <Link
                      href={`/admin/batch/${batch.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 text-sm hover:bg-black/[0.03]"
                    >
                      <span>
                        <span className="font-semibold">
                          {runDateLabel(batch.run_date)} · {SLOT_LABEL[batch.slot]}
                        </span>
                        <span className="block text-muted">
                          Closes {clockLabel(batch.cut_off_at)}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 font-bold ${
                          batch.paidCount < BATCH_MINIMUM ? "text-brand" : "text-mint"
                        }`}
                      >
                        {batch.paidCount}/{BATCH_MINIMUM}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section className="card">
              <h2 className="font-bold">What sells</h2>
              <ul className="mt-3 space-y-2">
                {stats.topItems.length === 0 && (
                  <li className="text-sm text-muted">Nothing paid for yet.</li>
                )}
                {stats.topItems.map((item) => (
                  <li key={`${item.name}|${item.restaurant}`} className="text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="truncate">
                        {item.name}
                        <span className="text-muted"> · {item.restaurant}</span>
                      </span>
                      <span className="shrink-0 font-semibold">{item.qty}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-black/5">
                      <div
                        className="h-1.5 rounded-full bg-brand"
                        style={{
                          width: `${Math.round(
                            (item.qty / stats.topItems[0].qty) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="card">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-bold">Profit per run</h2>
                <Link href="/admin/runs" className="text-sm font-semibold text-brand">
                  All runs
                </Link>
              </div>
              <ul className="mt-3 space-y-2">
                {batches.filter((batch) => batch.paidCount > 0).length === 0 && (
                  <li className="text-sm text-muted">Nothing paid for yet.</li>
                )}
                {batches
                  .filter((batch) => batch.paidCount > 0)
                  .map((batch) => (
                    <li key={batch.id}>
                      <Link
                        href={`/admin/batch/${batch.id}`}
                        className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 text-sm hover:bg-black/[0.03]"
                      >
                        <span>
                          {runDateLabel(batch.run_date)} · {SLOT_LABEL[batch.slot]}
                          <span className="block text-muted">
                            {batch.paidCount} paid · {naira(batch.gross)} in
                          </span>
                        </span>
                        <span
                          className={`shrink-0 font-bold ${
                            batch.profit >= 0 ? "text-mint" : "text-brand"
                          }`}
                        >
                          {naira(batch.profit)}
                        </span>
                      </Link>
                    </li>
                  ))}
              </ul>
              <p className="mt-2 text-xs text-muted">
                Put fuel and driver on a run&apos;s Profit tab and these become
                the real numbers.
              </p>
            </section>
          </div>
        </>
      )}

      {problem && !problem.ok && (
        <div className="mt-4">
          <Diagnostic title={problem.title} detail={problem.detail} />
        </div>
      )}
    </div>
  );
}
