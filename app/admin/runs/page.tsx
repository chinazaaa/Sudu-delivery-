import Link from "next/link";
import Diagnostic from "@/components/Diagnostic";
import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import { batchOverview } from "@/lib/admin";
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

export default async function RunsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; show?: string }>;
}) {
  const query = await searchParams;
  const showForm = query.new === "1";
  const schedule = await runSchedule(true);
  const window = query.show === "all" ? "all" : "recent";

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
          <Link
            href={showForm ? "/admin/runs" : "/admin/runs?new=1"}
            className="btn-primary px-4 py-2.5 text-sm"
          >
            {showForm ? "Close" : "New run"}
          </Link>
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

      <section className="card mb-4 space-y-3">
        <div>
          <h2 className="font-bold">Your week</h2>
          <p className="mt-0.5 text-sm text-muted">
            The days you run, each with its own cut-off and its own delivery
            time. Runs for these days are opened automatically; the button
            below opens them now, for a schedule you have just changed.
          </p>
        </div>

        <ul className="space-y-2">
          {schedule.map((run) => (
            <li
              key={run.id}
              className={`rounded-xl border p-3 ${
                run.active ? "border-black/10" : "border-black/5 bg-black/[0.02]"
              }`}
            >
              {/* Editable in place: a cut-off that moves half an hour is the
                  most likely change anyone makes here. */}
              <form action={saveScheduleRun} className="space-y-2">
                <input type="hidden" name="weekday" value={run.weekday} />
                <input type="hidden" name="slot" value={run.slot} />

                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className={run.active ? "font-bold" : "font-bold text-muted"}>
                    {WEEKDAYS[run.weekday]} {SLOT_LABEL[run.slot]}
                    {!run.active && (
                      <span className="ml-2 text-xs font-semibold">paused</span>
                    )}
                  </span>
                  <span className="flex gap-2">
                    <button
                      formAction={toggleScheduleRun}
                      name="schedule_id"
                      value={run.id}
                      className="chip border-black/10 bg-white py-1.5 text-xs"
                    >
                      {run.active ? "Pause" : "Resume"}
                    </button>
                    <button
                      formAction={deleteScheduleRun}
                      name="schedule_id"
                      value={run.id}
                      className="chip border-black/10 bg-white py-1.5 text-xs text-brand"
                    >
                      Remove
                    </button>
                  </span>
                </div>

                <div className="flex flex-wrap items-end gap-2">
                  <div className="w-32">
                    <label className="label" htmlFor={`cut-${run.id}`}>
                      Closes
                    </label>
                    <input
                      id={`cut-${run.id}`}
                      name="cut_off"
                      type="time"
                      defaultValue={run.cut_off}
                      className="field py-2 text-sm"
                    />
                  </div>
                  <div className="grow">
                    <label className="label" htmlFor={`window-${run.id}`}>
                      What customers are told
                    </label>
                    <input
                      id={`window-${run.id}`}
                      name="window_text"
                      defaultValue={run.window_text}
                      placeholder="On campus ~2:00pm"
                      className="field py-2 text-sm"
                    />
                  </div>
                  <SaveButton quiet className="shrink-0 px-4 py-2 text-sm">
                    Save
                  </SaveButton>
                </div>
              </form>
            </li>
          ))}
          {schedule.length === 0 && (
            <li className="text-sm text-muted">
              No days set, so no runs open by themselves.
            </li>
          )}
        </ul>

        <p className="text-xs text-muted">
          Changing a time here changes the runs that open from now on. A run
          already open keeps its own time, which is editable on the run itself.
        </p>

        <form
          action={saveScheduleRun}
          className="grid gap-2 border-t border-black/5 pt-3 sm:grid-cols-5"
        >
          <p className="font-semibold sm:col-span-5">Add another day</p>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="weekday">Day</label>
            <select id="weekday" name="weekday" className="field py-2 text-sm" defaultValue="5">
              {WEEKDAYS.map((day, index) => (
                <option key={day} value={index}>
                  {day}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="schedule-slot">Run</label>
            <select
              id="schedule-slot"
              name="slot"
              className="field py-2 text-sm"
              defaultValue="afternoon"
            >
              <option value="afternoon">Afternoon</option>
              <option value="night">Night</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="schedule-cutoff">Closes</label>
            <input
              id="schedule-cutoff"
              name="cut_off"
              type="time"
              defaultValue="11:30"
              className="field py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-5">
            <label className="label" htmlFor="schedule-window">
              What customers are told
            </label>
            <input
              id="schedule-window"
              name="window_text"
              placeholder="On campus ~2:00pm"
              className="field py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-5">
            <SaveButton quiet>Add to the week</SaveButton>
          </div>
        </form>

        <form action={generateRuns} className="border-t border-black/5 pt-3">
          <SaveButton>Open the runs for this schedule</SaveButton>
          <p className="mt-1 text-xs text-muted">
            Opens every run the schedule calls for, three weeks ahead. Days
            already open are left exactly as they are, cancellations included.
          </p>
        </form>
      </section>

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
