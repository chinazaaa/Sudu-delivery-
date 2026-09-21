import Link from "next/link";
import Diagnostic from "@/components/Diagnostic";
import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import { batchOverview } from "@/lib/admin";
import { openUntil } from "@/lib/batches";
import { sameDayTrips } from "@/lib/admin";
import { safeSettings } from "@/lib/settings";
import { diagnoseEmpty, keyKind } from "@/lib/health";
import { ensureUpcomingBatches, closeExpiredBatches, tidyEmptySameDay } from "@/lib/batches";
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
import ActionButton from "@/components/admin/ActionButton";

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
    // Starting a group makes its car immediately, so every abandoned group
    // left one behind, closed and empty and impossible to delete. They go
    // here, the moment nobody is in them.
    await tidyEmptySameDay();
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

  // Same day cars asked for at the same time. Ten people wanting two o'clock
  // is ten batches and one trip, and the trip is the thing somebody drives.
  const trips = await sameDayTrips().catch(() => []);

  const live = batches.filter((batch) => batch.status !== "cancelled");
  // The nearest run a customer could actually reach. Runs exist weeks out so
  // they can be planned, but only the ones closing inside the order horizon
  // are offered, and a horizon shorter than the gap to the next run hides
  // every run in the shop without saying so anywhere.
  const soonestRun = live
    .filter((batch) => batch.status === "open" && batch.kind !== "same_day")
    .map((batch) => batch.run_date)
    .sort()[0];
  const daysAway = soonestRun ? coverDays(soonestRun) : null;
  const hidden = daysAway !== null && daysAway > horizon;
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

      {trips.length > 0 && (
        <section className="card mb-4 space-y-2">
          <div>
            <h2 className="font-bold">Same day, by the time asked for</h2>
            <p className="text-sm text-muted">
              Each of these is one person asking for a car, so each is its own
              run below. Times within five hours of each other are one walk to
              the counter, which is what these are.
            </p>
          </div>
          <ul className="divide-y divide-black/5">
            {trips.map((trip) => (
              <li key={trip.at} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="min-w-0">
                  <span className="font-bold">
                    {trip.times.length > 1
                      ? `${trip.times[0]} to ${trip.times[trip.times.length - 1]}`
                      : trip.label}
                  </span>
                  <span className="block text-xs text-muted">
                    {trip.orders} {trip.orders === 1 ? "order" : "orders"} ·{" "}
                    {trip.items} item{trip.items === 1 ? "" : "s"} ·{" "}
                    {trip.paid} paid
                    {trip.unpaid > 0 && `, ${trip.unpaid} not yet`}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="font-extrabold">{naira(trip.gross)}</span>
                  <Link
                    href={`/admin/trip/${encodeURIComponent(trip.at)}`}
                    className="text-sm font-bold text-brand"
                  >
                    Open the trip
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

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

      {/* A run that exists and a run somebody can order onto are two
          different things, and the gap between them is one number in
          settings. Worth saying out loud: from the shop floor everything
          looks open, while the checkout quietly offers nobody a run. */}
      {hidden && (
        <div className="card mb-4 border-amber-300 bg-amber-50">
          <h2 className="font-bold text-amber-900">
            Nobody can order onto a run right now
          </h2>
          <p className="mt-0.5 text-sm text-amber-900/80">
            The next run is {runDateLabel(soonestRun!)}, {daysAway} days away,
            and customers only see runs closing in the next {horizon}. Until
            that number is at least {daysAway}, the checkout offers a car of
            its own and the dearer price that goes with it.
          </p>
          <Link
            href="/admin/settings"
            className="btn-primary mt-3 px-4 py-2.5 text-sm"
          >
            Change how far ahead people can order
          </Link>
        </div>
      )}

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
            <ActionButton className="btn-primary" done="Run created ✓">
              Create run
            </ActionButton>
            <p className="text-xs text-muted">
              Times are Lagos time. A day holds one afternoon run and one night
              run. Leave the wording blank to use the default from Settings.
            </p>
          </form>
        </section>
      )}

      <ul className="space-y-3">
        {batches.map((batch, index) => {
          // One line between what has happened and what is still coming.
          const past = new Date(batch.cut_off_at).getTime() <= Date.now();
          const firstUpcoming =
            !past &&
            index > 0 &&
            new Date(batches[index - 1].cut_off_at).getTime() <= Date.now();
          const short = batch.paidCount < BATCH_MINIMUM;
          const open = batch.status === "open";
          return (
            <li key={batch.id}>
              {firstUpcoming && (
                <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-muted">
                  Still to come
                </p>
              )}
              <Link
                href={`/admin/batch/${batch.id}`}
                className="card flex items-center justify-between gap-3 transition hover:border-brand/40 hover:shadow-lift"
              >
                <div className="min-w-0">
                  {/* A same day car borrows a run's date and slot, so titled
                      like one it was indistinguishable from a run: "Friday ·
                      Afternoon" for something somebody asked to arrive at two
                      o'clock. It says what it is. */}
                  <p className="font-bold">
                    {batch.kind === "same_day"
                      ? batch.delivery_window_text || "Same day car"
                      : `${runDateLabel(batch.run_date)} · ${SLOT_LABEL[batch.slot]}`}
                  </p>
                  <p className="text-sm text-muted">
                    {batch.kind === "same_day"
                      ? `One car, asked for on ${runDateLabel(batch.run_date)}`
                      : `Closes ${clockLabel(batch.cut_off_at)} · ${batch.delivery_window_text}`}
                  </p>
                  <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {batch.status === "cancelled" && (
                      <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs font-bold text-muted">
                        Not running
                      </span>
                    )}
                    {batch.kind === "same_day" && (
                      <span className="rounded-full bg-brand-tint px-2.5 py-1 text-xs font-bold text-brand-dark">
                        Same day
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        open ? "bg-mint/10 text-mint" : "bg-black/5 text-muted"
                      }`}
                    >
                      {batch.status}
                    </span>
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
