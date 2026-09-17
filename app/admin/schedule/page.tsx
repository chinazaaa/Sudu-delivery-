import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import SaveButton from "@/components/SaveButton";
import ConfirmRemove from "@/components/admin/ConfirmRemove";
import { openUntil } from "@/lib/batches";
import { runSchedule, WEEKDAYS } from "@/lib/schedule";
import { SLOT_LABEL } from "@/lib/config";
import { safeSettings } from "@/lib/settings";
import { runDateLabel } from "@/lib/time";
import ActionButton from "@/components/admin/ActionButton";
import {
  deleteScheduleRun,
  generateRuns,
  saveScheduleRun,
  toggleScheduleRun,
} from "../actions";

export const dynamic = "force-dynamic";

/** The months worth offering to open: this one and the next few. */
function nextMonths(count: number): { value: string; label: string }[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
    const value = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat("en-NG", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
    return { value, label: i === 0 ? `${label} (the rest of it)` : label };
  });
}

export default async function SchedulePage() {
  const schedule = await runSchedule(true);
  const until = await openUntil();
  const months = nextMonths(4);
  const horizon = (await safeSettings()).order_horizon_days || 7;

  return (
    <div>
      <PageHeader
        title="Schedule"
        detail="The days you run, and how far ahead they are open."
        backHref="/admin/runs"
        backLabel="All runs"
        actions={
          <Link href="/admin/runs" className="btn-quiet px-4 py-2.5 text-sm">
            See the runs
          </Link>
        }
      />

      <div className="card mb-4">
        <h2 className="font-bold">
          {until
            ? `Ordering is open through ${runDateLabel(until)}`
            : "No runs are open"}
        </h2>
        <p className="mt-0.5 text-sm text-ink/75">
          {until
            ? `Customers see the runs closing in the next ${horizon} days. The rest are yours to plan.`
            : "Nobody can order anything. Set your week below and open a month."}
        </p>
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

        {schedule.length === 0 && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Nothing is scheduled, so no run is opened and nobody can order. Add
            the day you run below.
          </p>
        )}

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
                    <ActionButton
                      formAction={toggleScheduleRun}
                      name="schedule_id"
                      value={run.id}
                      className="chip border-black/10 bg-white py-1.5 text-xs"
                      done={run.active ? "Paused ✓" : "Back on ✓"}
                    >
                      {run.active ? "Pause" : "Resume"}
                    </ActionButton>
                    <ConfirmRemove id={run.id} />
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

        <form action={generateRuns} className="space-y-2 border-t border-black/5 pt-3">
          <p className="font-semibold">Open a month of runs</p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="grow">
              <label className="label" htmlFor="month">Month</label>
              <select id="month" name="month" className="field py-2 text-sm">
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
            <SaveButton className="shrink-0">Open that month</SaveButton>
          </div>
          <p className="text-xs text-muted">
            Opens every run your week calls for across that month. Runs already
            open are left exactly as they are, cancellations included, so this
            is safe to press twice.
          </p>
        </form>
      </section>

    </div>
  );
}
