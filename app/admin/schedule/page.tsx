import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import Figure from "@/components/admin/Figure";
import Panel from "@/components/admin/Panel";
import SaveButton from "@/components/SaveButton";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { openUntil } from "@/lib/batches";
import { runSchedule, WEEKDAYS } from "@/lib/schedule";
import { DELIVERY_WINDOWS, SLOT_LABEL } from "@/lib/config";
import { safeSettings } from "@/lib/settings";
import { allAreas } from "@/lib/areas-server";
import { areasOfRun } from "@/lib/areas";
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

/**
 * The pattern every week follows, and how far ahead it is open.
 *
 * The board draws the week as one card per day with a row inside it for each
 * run on that day, rather than one card per run: the question somebody comes
 * here with is "what happens on a Friday", and a flat list of eight runs
 * makes that a counting exercise. A run's own times, areas and the way to
 * remove it fold out of its row, because reading the week is the common job
 * and changing a cut-off is the rare one.
 */
export default async function SchedulePage() {
  const schedule = await runSchedule(true);
  const until = await openUntil();
  const months = nextMonths(4);
  const horizon = (await safeSettings()).order_horizon_days || 7;
  const areas = await allAreas();

  // The week, grouped the way it is read. Days with nothing on them are left
  // out rather than drawn empty: a card saying "Tuesday, no runs" is a card
  // asking to be read before it can be skipped.
  const week = WEEKDAYS.map((name, index) => ({
    name,
    index,
    runs: schedule.filter((run) => run.weekday === index),
  })).filter((day) => day.runs.length > 0);

  // Which day carries the week and which one barely does. Thinnest is worth
  // a figure of its own because it is the one anybody would consider
  // dropping, and it is not obvious from a list.
  const live = week.map((day) => day.runs.filter((run) => run.active).length);
  const most = live.length > 0 ? Math.max(...live) : 0;
  const least = live.length > 0 ? Math.min(...live) : 0;
  const busiest = live.length > 0 ? week[live.indexOf(most)] : null;
  const thinnest = most === least ? null : week[live.indexOf(least)];
  const perWeek = schedule.filter((run) => run.active).length;

  return (
    <div>
      <PageHeader
        title="Schedule"
        detail="The pattern every week follows. Runs are opened from it automatically, and the shop only shows the ones closing soon."
        backHref="/admin/runs"
        backLabel="All runs"
        actions={
          <>
            {/* Two different kinds of new, and the diary is where somebody
                stands when they want either: a day added to the pattern that
                repeats every week, or one car on a date that is not part of
                it. Both beside the way out to the runs themselves, because
                reaching a one off through the runs list was three taps from
                here. */}
            <a href="#add" className="btn-admin">
              Add a day
            </a>
            <Link href="/admin/runs?new=1" className="btn-admin">
              New run
            </Link>
            <Link href="/admin/runs" className="btn-admin">
              See the runs
            </Link>
          </>
        }
      />

      <div className="card mb-3.5 p-3.5 sm:p-4">
        <h2 className="text-[14.5px] font-bold">
          {until
            ? `Ordering is open through ${runDateLabel(until)}`
            : "No runs are open"}
        </h2>
        <p className="hint mt-1">
          {until
            ? `Customers see the runs closing in the next ${horizon} days. The rest are yours to plan.`
            : "Nobody can order anything. Set your week below and open a month."}
        </p>
      </div>

      <div className="mb-3.5 grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        <Figure
          label="Runs a week"
          value={String(perWeek)}
          tone={perWeek === 0 ? "brand" : "ink"}
          detail={
            perWeek === 0
              ? "Nothing opens by itself"
              : `Across ${week.length} ${week.length === 1 ? "day" : "days"}`
          }
        />
        <Figure
          label="Busiest"
          value={busiest ? busiest.name.slice(0, 3) : "—"}
          detail={busiest ? `${most} ${most === 1 ? "run" : "runs"} that day` : "No days set"}
        />
        <Figure
          label="Thinnest"
          value={thinnest ? thinnest.name.slice(0, 3) : "Even"}
          tone={thinnest ? "brand" : "ink"}
          detail={
            thinnest
              ? `${least} ${least === 1 ? "run" : "runs"}, worth a look at the fuel`
              : "Every day carries the same"
          }
        />
        <Figure
          label="Open ahead"
          value={`${horizon} days`}
          detail="How far forward the shop shows runs"
        />
      </div>

      {schedule.length === 0 && (
        <div className="soft mb-3.5 border-volt-line bg-brand-tint p-3.5">
          <p className="text-sm font-bold">Nothing is scheduled</p>
          <p className="hint mt-1">
            No run opens and nobody can order. Add the day you run below.
          </p>
        </div>
      )}

      <p className="ticket mb-2 text-muted">The week</p>

      <div className="space-y-2.5">
        {week.map((day) => (
          <div key={day.index} className="card p-3.5 pb-1 sm:px-5 sm:pt-5">
            <div className="flex items-center gap-2">
              <strong className="flex-1 text-[15px]">{day.name}</strong>
              <span className="hint">
                {day.runs.length} {day.runs.length === 1 ? "run" : "runs"}
              </span>
            </div>

            {day.runs.map((run) => (
              <details
                key={run.id}
                className="border-t-[1.5px] border-rule [&_summary::-webkit-details-marker]:hidden"
              >
                {/* The row the board draws: which run it is, when it closes,
                    when it lands. Everything you could change about it is
                    behind it rather than on it. */}
                <summary className="flex min-h-[48px] cursor-pointer list-none items-center gap-2.5 py-2.5">
                  {run.active ? (
                    <span className="tag bg-mint-tint text-mint">on</span>
                  ) : (
                    <span className="tag bg-wash text-ink">paused</span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold capitalize">
                      {SLOT_LABEL[run.slot]}
                    </span>
                    <span className="hint block">
                      Closes {run.cut_off} ·{" "}
                      {run.window_text.trim() || DELIVERY_WINDOWS[run.slot]}
                    </span>
                  </span>
                  <span className="text-[17px] text-muted">›</span>
                </summary>

                {/* Editable in place: a cut-off that moves half an hour is the
                    most likely change anyone makes here. */}
                <form action={saveScheduleRun} className="space-y-3 pb-3.5">
                  <input type="hidden" name="weekday" value={run.weekday} />
                  <input type="hidden" name="slot" value={run.slot} />
                  {/* A button carries one name and one value, so what Pause and
                      Save each need to know about the paused state lives here.
                      Without this, Pause worked and Resume did nothing. */}
                  <input type="hidden" name="active" value={String(run.active)} />
                  <input type="hidden" name="next_active" value={String(!run.active)} />

                  <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
                    <div>
                      <label className="label" htmlFor={`cut-${run.id}`}>
                        Closes
                      </label>
                      <input
                        id={`cut-${run.id}`}
                        name="cut_off"
                        type="time"
                        defaultValue={run.cut_off}
                        className="field field-admin"
                      />
                    </div>
                    {/* Two times on a clock, worded the same way a run's own
                        window is worded, rather than a sentence typed twice and
                        spelt two different ways. */}
                    <div>
                      <label className="label" htmlFor={`from-${run.id}`}>
                        These runs arrive between
                      </label>
                      <span className="flex items-center gap-2">
                        <input
                          id={`from-${run.id}`}
                          name="window_from"
                          type="time"
                          defaultValue={run.window_from}
                          className="field field-admin w-32"
                        />
                        <span className="text-sm text-muted">and</span>
                        <input
                          name="window_to"
                          type="time"
                          defaultValue={run.window_to}
                          aria-label="Latest arrival"
                          className="field field-admin w-32"
                        />
                      </span>
                      <p className="hint mt-1">
                        Customers are told:{" "}
                        <span className="font-semibold">
                          {run.window_text.trim() || DELIVERY_WINDOWS[run.slot]}
                        </span>
                        {run.window_text.trim() === "" && " (nothing set yet)"}
                      </p>
                    </div>
                  </div>

                  {/* Where these runs go. Said once here rather than ticked
                      on every run after it opens: runs open weeks ahead by
                      themselves, and a week that was missed is a restaurant
                      nobody can order from with no sign of why. */}
                  {areas.length > 0 && (
                    <div className="soft bg-shell p-3">
                      <input type="hidden" name="areas_set" value="1" />
                      <p className="label mb-0">Where these runs go</p>
                      <p className="hint mb-1.5">
                        They always pass Sangotedo. Tick anywhere else they go,
                        and those restaurants can be ordered onto them.
                      </p>
                      <span className="flex flex-wrap gap-x-4 gap-y-2">
                        {areas.map((one) => (
                          <label
                            key={one.id}
                            className="flex min-h-[44px] items-center gap-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              name="area"
                              value={one.id}
                              defaultChecked={areasOfRun(run.areas).includes(one.id)}
                              className="size-5"
                            />
                            {one.name}
                          </label>
                        ))}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <SaveButton look="btn-admin" className="shrink-0">
                      Save this run
                    </SaveButton>
                    <ActionButton
                      formAction={toggleScheduleRun}
                      name="schedule_id"
                      value={run.id}
                      className="btn-admin"
                      done={run.active ? "Paused ✓" : "Back on ✓"}
                    >
                      {run.active ? "Pause" : "Resume"}
                    </ActionButton>
                  </div>

                  <p className="hint">
                    Changing a time moves every run still to come that nobody
                    has ordered on. A run with orders on it keeps the time its
                    customers were told, and is editable on the run itself.
                  </p>
                </form>

                {/* Its own form, because removing goes by the day and the slot
                    rather than by the row id, and because a destructive button
                    sharing a form with Save is one mis-tap from a week with a
                    hole in it. */}
                <form action={deleteScheduleRun} className="flex items-center gap-2.5 border-t-[1.5px] border-rule py-3">
                  <input type="hidden" name="weekday" value={run.weekday} />
                  <input type="hidden" name="slot" value={run.slot} />
                  <p className="hint flex-1">
                    Removing is forever and takes this run&apos;s empty future
                    runs with it. Pausing keeps the times.
                  </p>
                  <ConfirmButton
                    tone="bad"
                    className="min-h-[44px] shrink-0"
                    confirm="Yes, remove it"
                  >
                    Remove
                  </ConfirmButton>
                </form>
              </details>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-3.5 grid items-start gap-[18px] xl:grid-cols-2">
        <Panel
          title="Add another day"
          detail="A day, the run on it, and when it closes. Everything else can be set after it is on the week."
          className="scroll-mt-4"
        >
          <form action={saveScheduleRun} id="add" className="mt-2 space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="weekday">Day</label>
                <select
                  id="weekday"
                  name="weekday"
                  className="field field-admin"
                  defaultValue="5"
                >
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
                  className="field field-admin"
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
                  className="field field-admin"
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="schedule-from">
                These runs arrive between
              </label>
              <span className="flex items-center gap-2">
                <input
                  id="schedule-from"
                  name="window_from"
                  type="time"
                  className="field field-admin w-32"
                />
                <span className="text-sm text-muted">and</span>
                <input
                  name="window_to"
                  type="time"
                  aria-label="Latest arrival"
                  className="field field-admin w-32"
                />
              </span>
              <p className="hint mt-1">
                Left empty, these runs say &quot;{DELIVERY_WINDOWS.afternoon}&quot;
                in the afternoon and &quot;{DELIVERY_WINDOWS.night}&quot; at night.
              </p>
            </div>

            {areas.length > 0 && (
              <div className="soft bg-shell p-3">
                <input type="hidden" name="areas_set" value="1" />
                <p className="label mb-0">Where these runs go</p>
                <p className="hint mb-1.5">
                  They always pass Sangotedo. Tick anywhere else they go.
                </p>
                <span className="flex flex-wrap gap-x-4 gap-y-2">
                  {areas.map((one) => (
                    <label
                      key={one.id}
                      className="flex min-h-[44px] items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        name="area"
                        value={one.id}
                        className="size-5"
                      />
                      {one.name}
                    </label>
                  ))}
                </span>
              </div>
            )}

            <SaveButton look="btn-admin">Add to the week</SaveButton>
          </form>
        </Panel>

        <Panel
          title="Open a month of runs"
          detail="The week above opens its runs on its own. This is for a week you have just changed."
        >
          <form action={generateRuns} className="mt-2 space-y-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="grow">
                <label className="label" htmlFor="month">Month</label>
                <select id="month" name="month" className="field field-admin">
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
              {/* The board's one red button on this screen: the single thing
                  that changes what customers can see, rather than what the
                  week says. */}
              <SaveButton look="btn-admin-go" className="shrink-0">
                Open that month
              </SaveButton>
            </div>
            <p className="hint leading-[1.5]">
              Opens every run your week calls for across that month. Runs already
              open are left exactly as they are, cancellations included, so this
              is safe to press twice. It also brings back any single run you
              deleted inside that month.
            </p>
          </form>
        </Panel>
      </div>
    </div>
  );
}
