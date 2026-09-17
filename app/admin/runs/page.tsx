import Link from "next/link";
import Diagnostic from "@/components/Diagnostic";
import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import { batchOverview } from "@/lib/admin";
import { openUntil } from "@/lib/batches";
import { safeSettings } from "@/lib/settings";
import { diagnoseEmpty, keyKind } from "@/lib/health";
import { ensureUpcomingBatches, closeExpiredBatches } from "@/lib/batches";
import {
  createBatch,
  deleteScheduleRun,
  generateRuns,
  saveScheduleRun,
  toggleScheduleRun,
} from "../actions";
import { runSchedule, WEEKDAYS } from "@/lib/schedule";
import SaveButton from "@/components/SaveButton";
import { BATCH_MINIMUM, SLOT_LABEL } from "@/lib/config";
import { naira } from "@/lib/money";
import { clockLabel, runDateLabel } from "@/lib/time";

export const dynamic = "force-dynamic";

/** Days between today and the last day anything is open for. */
function coverDays(until: string | null): number {
  if (!until) return 0;
  return Math.round(
    (new Date(until + "T12:00:00Z").getTime() - Date.now()) / 86400000
  );
}

export default async function RunsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; show?: string }>;
}) {
  const query = await searchParams;
  const showForm = query.new === "1";
  const schedule = await runSchedule(true);
  // How far ahead the shop can actually take orders, and the months worth
  // offering to open next.
  const until = await openUntil();
  const window = query.show === "all" ? "all" : "recent";
  const horizon = (await safeSettings()).order_horizon_days || 7;

  let problem: Awaited<ReturnType<typeof diagnoseEmpty>> | null = null;
  let batches: Awaited<ReturnType<typeof batchOverview>> = [];

  try {
    await ensureUpcomingBatches();
    await closeExpiredBatches();
    batches = await batchOverview(window);
    if (batches.length === 0) problem = await diagnoseEmpty();
  } catch (error) {
    // A blocked write usually means the wrong key, so say that rather than
    // repeating a Postgres permission message at someone deploying a site.
    problem =
      keyKind() === "public"
        ? await diagnoseEmpty()
        : {
            ok: false,
            title: "Could not reach the database",
            detail: error instanceof Error ? error.message : String(error),
          };
  }

  const live = batches.filter((batch) => batch.status !== "cancelled");
  const orders = live.reduce((total, batch) => total + batch.orderCount, 0);
  const paid = live.reduce((total, batch) => total + batch.paidCount, 0);
  const profit = live.reduce((total, batch) => total + batch.profit, 0);

  return (
    <div>
      <PageHeader
        title="Runs"
        detail={
          window === "all"
            ? "Every run ever made, newest first."
            : "This week and the days just gone. Fridays open themselves."
        }
        actions={
          <>
            <Link href="/admin/schedule" className="btn-quiet px-4 py-2.5 text-sm">
              Schedule
            </Link>
            <Link
              href={showForm ? "/admin/runs" : "/admin/runs?new=1"}
              className="btn-primary px-4 py-2.5 text-sm"
            >
              {showForm ? "Close" : "One-off run"}
            </Link>
          </>
        }
      />

      <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
        <Link
          href="/admin/runs"
          className={`chip ${
            window === "recent" ? "border-ink bg-ink text-white" : "border-black/10 bg-white"
          }`}
        >
          This week
        </Link>
        <Link
          href="/admin/runs?show=all"
          className={`chip ${
            window === "all" ? "border-ink bg-ink text-white" : "border-black/10 bg-white"
          }`}
        >
          Every run so far
        </Link>
      </div>

      {/* The thing that quietly kills a shop: ordering open, but nothing left
          to order into. */}
      <div
        className={`card mb-4 ${
          coverDays(until) < 14 ? "border-brand/30 bg-brand-tint" : ""
        }`}
      >
        <h2 className="font-bold">
          {until
            ? `Ordering is open through ${runDateLabel(until)}`
            : "No runs are open"}
        </h2>
        <p className="mt-0.5 text-sm text-ink/75">
          {!until
            ? "Nobody can order anything until a month is opened."
            : coverDays(until) < 14
              ? `That is ${coverDays(until)} day${coverDays(until) === 1 ? "" : "s"} away. Open the next month before it runs out.`
              : `Customers see the runs closing in the next ${horizon} days; the rest are yours to plan.`}
        </p>
        {(!until || coverDays(until) < 14) && (
          <Link href="/admin/schedule" className="btn-primary mt-3 px-4 py-2.5 text-sm">
            Open a month
          </Link>
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Runs listed" value={live.length} />
        <Stat label="Orders" value={orders} />
        <Stat label="Paid" value={paid} tone="good" hint={`${orders - paid} unpaid`} />
        <Stat
          label="Profit"
          value={profit}
          money
          tone={profit >= 0 ? "good" : "warn"}
          hint="Across the runs below"
        />
      </div>

      {showForm && (
        <section className="card mb-4">
          <h2 className="font-bold">A one-off run</h2>
          <p className="mt-0.5 text-sm text-muted">
            For a day that is not in your week: exam week, a match, a request.
            Creating one that already exists updates it.
          </p>
          <form action={createBatch} className="mt-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="run_date">Day</label>
                <input id="run_date" name="run_date" type="date" required className="field" />
              </div>
              <div>
                <label className="label" htmlFor="cut_off_time">Orders close</label>
                <input
                  id="cut_off_time"
                  name="cut_off_time"
                  type="time"
                  defaultValue="12:00"
                  required
                  className="field"
                />
              </div>
              <div>
                <label className="label" htmlFor="slot">Which batch</label>
                <select id="slot" name="slot" className="field" defaultValue="afternoon">
                  <option value="afternoon">Afternoon</option>
                  <option value="night">Night</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="delivery_window_text">
                What customers are told
              </label>
              <input
                id="delivery_window_text"
                name="delivery_window_text"
                placeholder="On campus ~2:00pm"
                className="field"
              />
            </div>
            <button className="btn-primary">Create run</button>
            <p className="text-xs text-muted">
              Times are Lagos time. A day holds one afternoon run and one night
              run. Leave the wording blank to use the default from Settings.
            </p>
          </form>
        </section>
      )}

      <ul className="space-y-3">
        {batches.map((batch) => {
          const short = batch.paidCount < BATCH_MINIMUM;
          const open = batch.status === "open";
          return (
            <li key={batch.id}>
              <Link
                href={`/admin/batch/${batch.id}`}
                className="card flex items-center justify-between gap-3 transition hover:border-brand/40 hover:shadow-lift"
              >
                <div className="min-w-0">
                  <p className="font-bold">
                    {runDateLabel(batch.run_date)} · {SLOT_LABEL[batch.slot]}
                  </p>
                  <p className="text-sm text-muted">
                    Closes {clockLabel(batch.cut_off_at)} · {batch.delivery_window_text}
                  </p>
                  <span
                    className={`mt-1.5 inline-block rounded-full px-2.5 py-1 text-xs font-bold ${
                      open ? "bg-mint/10 text-mint" : "bg-black/5 text-muted"
                    }`}
                  >
                    {batch.status}
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`text-xl font-extrabold ${short ? "text-brand" : "text-mint"}`}
                  >
                    {batch.paidCount}/{BATCH_MINIMUM}
                  </p>
                  <p className="text-xs text-muted">
                    {batch.orderCount - batch.paidCount} unpaid
                  </p>
                  {batch.orderCount === 0 && (
                    <p className="mt-1 text-xs text-muted">Nothing ordered yet</p>
                  )}
                  {batch.paidCount > 0 && (
                    <p
                      className={`mt-1 text-sm font-bold ${
                        batch.profit >= 0 ? "text-mint" : "text-brand"
                      }`}
                    >
                      {naira(batch.profit)} profit
                    </p>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {problem && !problem.ok && (
        <div className="mt-4">
          <Diagnostic title={problem.title} detail={problem.detail} />
        </div>
      )}
    </div>
  );
}
