import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import Panel from "@/components/admin/Panel";
import SaveButton from "@/components/SaveButton";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { openUntil } from "@/lib/batches";
import {
  bookedInside,
  closures,
  isOn,
  rangeLabel,
  type Closure,
} from "@/lib/closures";
import { runSchedule, WEEKDAYS } from "@/lib/schedule";
import { DELIVERY_WINDOWS, RUN_HORIZON_DAYS, SLOT_LABEL } from "@/lib/config";
import { profitBetween, type RunLine } from "@/lib/profit";
import { naira } from "@/lib/money";
import { safeSettings } from "@/lib/settings";
import { allAreas } from "@/lib/areas-server";
import { areasOfRun } from "@/lib/areas";
import { lagosToday, runDateLabel } from "@/lib/time";
import ActionButton from "@/components/admin/ActionButton";
import {
  deleteClosure,
  deleteScheduleRun,
  generateRuns,
  saveClosure,
  saveScheduleRun,
  toggleScheduleRun,
} from "../actions";

export const dynamic = "force-dynamic";

/*
 * Reading a weekday's own money off the runs that have already gone.
 *
 * Ten weeks back finds six of any weekday even with a closure or two in the
 * way, three is the fewest that is an average rather than one bad night, and
 * six is what the card says it averaged.
 */
const WEEKS_BACK = 10;
const FEWEST = 3;
const MOST_BACK = 6;

function addDays(date: string, days: number): string {
  // Midday UTC, so adding days cannot slip across a midnight.
  const at = new Date(`${date}T12:00:00Z`);
  return new Date(at.getTime() + days * 86400000).toISOString().slice(0, 10);
}

/** Sunday is 0, which is how the schedule numbers its own weekdays. */
function weekdayOf(runDate: string): number {
  return new Date(`${runDate}T12:00:00Z`).getUTCDay();
}

type DayAverage = {
  weekday: number;
  /** How many of that weekday the average is actually over, because the
   *  card says the number rather than claiming six. */
  days: number;
  orders: number;
  /** Fuel, driver, transport and the commission earned on it. */
  costs: number;
  /** Negative is the whole point of looking. */
  profit: number;
};

/**
 * What one weekday averages, over its own last few occurrences.
 *
 * Averaged by date and not by run, because a weekday with an afternoon and a
 * night is one day that either pays for its car or does not: the car goes
 * out either way.
 */
function averageOf(rows: RunLine[], weekday: number): DayAverage | null {
  const mine = rows.filter((run) => weekdayOf(run.runDate) === weekday);
  // Newest first, which is the order profitBetween hands them back in.
  const dates = [...new Set(mine.map((run) => run.runDate))].slice(0, MOST_BACK);
  if (dates.length < FEWEST) return null;

  const on = mine.filter((run) => dates.includes(run.runDate));
  const per = (pick: (run: RunLine) => number) =>
    on.reduce((sum, run) => sum + pick(run), 0) / dates.length;

  return {
    weekday,
    days: dates.length,
    orders: per((run) => run.orders),
    costs: per((run) => run.costs),
    profit: per((run) => run.profit),
  };
}

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

/** A closure with however many of its runs already have orders on them. */
type Shut = Closure & { booked: number };

/**
 * The three questions a closure asks, in one place.
 *
 * The add form and every edit form ask exactly the same thing, and a closure
 * whose name box is called something different in one of them is a closure
 * that saves blank from one of them.
 */
function ClosureFields({ closure }: { closure: Shut | null }) {
  const at = closure?.id ?? "new";
  return (
    <>
      <div>
        <label className="label" htmlFor={`closure-name-${at}`}>
          What to call it
        </label>
        <input
          id={`closure-name-${at}`}
          name="name"
          defaultValue={closure?.name ?? ""}
          placeholder="Mid-semester break"
          maxLength={80}
          className="field field-admin"
        />
        <p className="hint mt-1">
          Customers read this, so it is worth saying what it is rather than
          just that nothing is going.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`closure-from-${at}`}>
            First day off
          </label>
          <input
            id={`closure-from-${at}`}
            name="starts_on"
            type="date"
            required
            defaultValue={closure?.starts_on ?? ""}
            className="field field-admin"
          />
        </div>
        <div>
          <label className="label" htmlFor={`closure-to-${at}`}>
            Last day off
          </label>
          <input
            id={`closure-to-${at}`}
            name="ends_on"
            type="date"
            defaultValue={closure?.ends_on ?? ""}
            className="field field-admin"
          />
          {/* Both ends are days off, which is how anybody says a date range
              out loud, and the second one empty is one day. */}
          <p className="hint mt-1">
            This day is off too. Left empty, it is the one day above.
          </p>
        </div>
      </div>

      <div>
        <label className="label" htmlFor={`closure-note-${at}`}>
          Note to yourself
        </label>
        <input
          id={`closure-note-${at}`}
          name="note"
          defaultValue={closure?.note ?? ""}
          maxLength={300}
          className="field field-admin"
        />
        <p className="hint mt-1">Yours only. Never shown to anybody.</p>
      </div>
    </>
  );
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

  // Days off, with what is already booked inside each of them: saving a
  // closure deletes the empty runs in its range and leaves the rest, so the
  // row has to be able to say that rather than implying the days are clear.
  const shut: Shut[] = await Promise.all(
    (await closures()).map(async (off) => ({
      ...off,
      booked: await bookedInside(off.starts_on, off.ends_on),
    }))
  );

  // The week, grouped the way it is read. Days with nothing on them are left
  // out rather than drawn empty: a card saying "Tuesday, no runs" is a card
  // asking to be read before it can be skipped.
  const week = WEEKDAYS.map((name, index) => ({
    name,
    index,
    runs: schedule.filter((run) => run.weekday === index),
  })).filter((day) => day.runs.length > 0);

  // Which day carries the week and which one barely does. Thinnest earns a
  // number of its own because it is the day anybody would think about
  // dropping, and it is not obvious from reading a list of runs.
  const live = week.map((day) => day.runs.filter((run) => run.active).length);
  const most = live.length > 0 ? Math.max(...live) : 0;
  const least = live.length > 0 ? Math.min(...live) : 0;
  const busiest = live.length > 0 ? week[live.indexOf(most)] : null;
  const thinnest = most === least ? null : week[live.indexOf(least)];
  const perWeek = schedule.filter((run) => run.active).length;

  /*
   * Whether a day of the week is costing more than it brings in.
   *
   * Only runs whose car has actually been typed in: `estimated` means
   * nothing has been entered for fuel or the driver, so the run reads as
   * pure profit, and averaging those in would hide exactly the day this is
   * looking for.
   */
  const today = lagosToday();
  // Caught rather than left to throw: the week is what this page is for, and
  // a card about one day of it is not worth taking the schedule down over.
  const money = await profitBetween(
    addDays(today, -(WEEKS_BACK * 7 - 1)),
    today
  ).catch(() => null);
  const settled = (money?.byRun ?? []).filter((run) => !run.estimated);

  // Only a day the week actually runs, only one that still has a run on it
  // to turn off, and only one that is genuinely losing money on average.
  // Worst first, and nothing at all otherwise: a card that turns up every
  // week to say everything is fine is a card nobody reads.
  const losing =
    week
      .filter((day) => day.runs.some((run) => run.active))
      .map((day) => averageOf(settled, day.index))
      .filter((one): one is DayAverage => one !== null && one.profit < 0)
      .sort((a, b) => a.profit - b.profit)[0] ?? null;
  const losingDay = losing
    ? (week.find((day) => day.index === losing.weekday) ?? null)
    : null;
  const losingRuns = losingDay ? losingDay.runs.filter((run) => run.active) : [];

  return (
    <div>
      <PageHeader
        title="Schedule"
        detail={`The pattern every week follows. Runs are opened from it automatically, ${RUN_HORIZON_DAYS} days ahead.`}
        actions={
          <>
            {/* The board puts one button on this line, and three of them on a
                phone is three forty-four pixel buttons standing over the
                first card. Two different kinds of new is the most this row
                can carry: a slot added to the pattern that repeats every
                week, or one car on a date that is not part of it. The way
                out to the runs themselves moved into the card below, where
                the sentence about what is open already is. */}
            <a href="#add" className="btn-admin btn-admin-sm">
              Add a slot
            </a>
            <Link href="/admin/runs?new=1" className="btn-admin btn-admin-sm">
              New run
            </Link>
          </>
        }
      />

      <div className="card mb-3.5 p-3.5 sm:p-4">
        {/* The board draws this card's first line as a row with room on the
            end of it, which is where the way out to the runs now lives: the
            sentence is about what is open, and the runs are what it is
            talking about. */}
        <div className="flex items-start gap-2.5">
          <div className="min-w-0 flex-1">
            <h2 className="text-[14.5px] font-bold">
              {until
                ? `Ordering is open to ${runDateLabel(until)}`
                : "No runs are open"}
            </h2>
            <p className="hint mt-1">
              {until
                ? `Customers see the runs closing in the next ${horizon} days. The rest are yours to plan.`
                : "Nobody can order anything. Set your week below and open a month."}
            </p>
          </div>
          <Link href="/admin/runs" className="btn-admin btn-admin-sm shrink-0">
            See the runs
          </Link>
        </div>

        {/* The three numbers sit in this card rather than in tiles of their
            own, because they are all answers to the sentence above them.
            There were four: how far ahead the shop is open was the fourth,
            and this card's first line already says it, with the date rather
            than a count of days. */}
        {week.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-x-7 gap-y-3 border-t-[1.5px] border-rule pt-3">
            <div>
              <p className="ticket text-muted">Runs a week</p>
              <p className="font-display text-[25px] font-black leading-none sm:text-[30px]">
                {perWeek}
              </p>
            </div>
            <div>
              <p className="ticket text-muted">Busiest</p>
              <p className="font-display text-[25px] font-black leading-none sm:text-[30px]">
                {busiest ? busiest.name.slice(0, 3) : "—"}
              </p>
            </div>
            <div>
              <p className="ticket text-muted">Thinnest</p>
              {/* In Tomato Deep when there is one, because the thinnest day
                  is the one anybody would think about dropping. */}
              <p
                className={`font-display text-[25px] font-black leading-none sm:text-[30px] ${
                  thinnest ? "text-brand-dark" : ""
                }`}
              >
                {thinnest ? thinnest.name.slice(0, 3) : "Even"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/*
        A day that is not paying for its own car.

        Only ever drawn with figures that have been read off runs that have
        gone, and only when the average is actually negative, so this is
        never a nudge to turn something off that is working. Turning it off
        is the same pause the run's own row carries, which is why it asks
        first and says what it leaves alone.
      */}
      {losing && losingDay && losingRuns.length > 0 && (
        <div className="soft mb-3.5 border-volt-line bg-brand-tint p-3.5">
          <p className="text-sm font-bold">{losingDay.name} loses money</p>
          <p className="hint mt-1">
            The last {losing.days} {losingDay.name}s averaged{" "}
            {losing.orders.toFixed(1)} {losing.orders === 1 ? "order" : "orders"}{" "}
            against {naira(Math.round(losing.costs))} of car and commission,
            which is {naira(Math.round(-losing.profit))} out of pocket each
            time.
          </p>
          <p className="hint mt-1.5">
            Turning it off stops new {losingDay.name} runs from opening.
            Anything already open keeps its orders and goes as planned, and
            the day can be switched back on from its row below.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {losingRuns.map((run) => (
              <form action={toggleScheduleRun} key={run.id}>
                <input type="hidden" name="schedule_id" value={run.id} />
                <input type="hidden" name="next_active" value="false" />
                {/* Pausing is per run, so a day with two runs on it gets a
                    button each rather than one button that quietly does half
                    the job. */}
                <ConfirmButton
                  tone="admin"
                  className="min-h-[44px]"
                  confirm={`Yes, pause ${losingDay.name} ${SLOT_LABEL[run.slot]}`}
                >
                  {losingRuns.length === 1
                    ? `Turn ${losingDay.name} off`
                    : `Turn off the ${SLOT_LABEL[run.slot]} run`}
                </ConfirmButton>
              </form>
            ))}
          </div>
        </div>
      )}

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
              <div
                key={run.id}
                className="flex items-start gap-2.5 border-t-[1.5px] border-rule"
              >
                {/*
                 * On or off, as the switch the board draws rather than a tag
                 * with a form folded away behind it: whether a run happens is
                 * the one thing anybody changes from this page, and it was
                 * two taps and a scroll down an edit form away.
                 *
                 * The same shape as the stock page's switch, and the same
                 * reasoning: a switch whose only state is a colour fails the
                 * fourth rule of the design system and fails in sunlight, so
                 * the state is said in words beside it. The board draws it
                 * bare; the rules win.
                 *
                 * Beside the fold rather than inside it, because a button in
                 * a summary toggles the summary as well as submitting, and
                 * pausing a run would have opened its edit form every time.
                 */}
                <form action={toggleScheduleRun} className="shrink-0 pt-2">
                  <input type="hidden" name="schedule_id" value={run.id} />
                  <input
                    type="hidden"
                    name="next_active"
                    value={String(!run.active)}
                  />
                  <ActionButton
                    busy="…"
                    done="Done ✓"
                    role="switch"
                    aria-checked={run.active}
                    aria-label={`${day.name} ${SLOT_LABEL[run.slot]} run`}
                    className="btn-admin btn-admin-sm gap-2 border-transparent bg-transparent px-0 hover:bg-transparent"
                  >
                    <span
                      aria-hidden
                      className={`relative block h-[27px] w-[46px] shrink-0 rounded-full transition-colors ${
                        run.active ? "bg-mint" : "bg-line"
                      }`}
                    >
                      <span
                        className={`absolute top-[3px] block size-[21px] rounded-full bg-paper transition-all ${
                          run.active ? "left-[22px]" : "left-[3px]"
                        }`}
                      />
                    </span>
                    <span className="text-[12px] font-bold">
                      {run.active ? "On" : "Paused"}
                    </span>
                  </ActionButton>
                </form>

                <details className="min-w-0 flex-1 [&_summary::-webkit-details-marker]:hidden">
                  {/* The row the board draws: which run it is, when it closes,
                      when it lands. Everything you could change about it is
                      behind it rather than on it. */}
                  <summary className="flex min-h-[48px] cursor-pointer list-none items-center gap-2.5 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold capitalize">
                        {SLOT_LABEL[run.slot]}
                      </span>
                      <span className="hint block">
                        Closes {run.cut_off} · delivers{" "}
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
                    {/* Saving a time must not resume a paused run, so the
                        state it is already in travels with the form. Pausing
                        is the switch on the row, which carries its own. */}
                    <input type="hidden" name="active" value={String(run.active)} />

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

                    {/* Only Save here now. Pausing is the switch on the row
                        above, where it can be read and changed without
                        opening anything. */}
                    <SaveButton look="btn-admin" className="shrink-0">
                      Save this run
                    </SaveButton>

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
              </div>
            ))}
          </div>
        ))}
      </div>

      {/*
        Days off, as the board draws them: one row per closure with its
        dates, and a row at the end for a new one.

        A closure lives here rather than on the runs page because it is a
        fact about the diary and not about any one run. The week above says
        what normally happens; this says when it does not.
      */}
      <p className="ticket mb-2 mt-3.5 text-muted">Days off</p>

      <div className="card p-3.5 pb-1 sm:px-5 sm:pt-5">
        {shut.length === 0 && (
          <p className="hint pb-3">
            Nothing is closed. Runs open from the week above, {RUN_HORIZON_DAYS}{" "}
            days ahead, including through a break.
          </p>
        )}

        {shut.map((off) => (
          <details
            key={off.id}
            className="border-t-[1.5px] border-rule [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex min-h-[48px] cursor-pointer list-none items-center gap-2.5 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  {off.name.trim() || "Closed"}
                </span>
                <span className="hint block">
                  {rangeLabel(off.starts_on, off.ends_on)} · no runs
                  {isOn(off) ? ", on now" : ""}
                  {off.booked > 0
                    ? ` · ${off.booked} ${off.booked === 1 ? "run has" : "runs have"} orders on them`
                    : ", site says so"}
                </span>
              </span>
              <span className="text-[17px] text-muted">›</span>
            </summary>

            <form action={saveClosure} className="space-y-3 pb-3.5">
              <input type="hidden" name="closure_id" value={off.id} />
              <ClosureFields closure={off} />
              <SaveButton look="btn-admin">Save this closure</SaveButton>
            </form>

            {/* A run with orders on it is nobody's to delete from here, so
                the page says what is standing rather than leaving it to be
                found on the day. */}
            {off.booked > 0 && (
              <p className="hint border-t-[1.5px] border-rule py-3">
                {off.booked === 1 ? "One run" : `${off.booked} runs`} in these
                days {off.booked === 1 ? "has" : "have"} orders on{" "}
                {off.booked === 1 ? "it" : "them"} and {off.booked === 1 ? "was" : "were"}{" "}
                left alone. Cancel or move{" "}
                {off.booked === 1 ? "it" : "them"} from the{" "}
                <Link href="/admin/runs" className="font-semibold underline">
                  runs page
                </Link>
                .
              </p>
            )}

            <form
              action={deleteClosure}
              className="flex items-center gap-2.5 border-t-[1.5px] border-rule py-3"
            >
              <input type="hidden" name="closure_id" value={off.id} />
              <p className="hint flex-1">
                Removing is forever. The days come back on their own, inside{" "}
                {RUN_HORIZON_DAYS} days, and further out by opening the month
                below.
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

        <details
          id="closure"
          className="scroll-mt-4 border-t-[1.5px] border-rule [&_summary::-webkit-details-marker]:hidden"
        >
          <summary className="flex min-h-[48px] cursor-pointer list-none items-center gap-2.5 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Add a closure</span>
              <span className="hint block">Holidays, exams, travel</span>
            </span>
            <span className="text-[19px] text-muted">+</span>
          </summary>

          <form action={saveClosure} className="space-y-3 pb-3.5">
            <ClosureFields closure={null} />
            <SaveButton look="btn-admin">Add these days off</SaveButton>
            <p className="hint">
              No run opens on these days and the shop says why on every page.
              Runs already open inside them are deleted if nothing has been
              ordered on them, and left alone if anything has.
            </p>
          </form>
        </details>
      </div>

      <div className="mt-3.5 grid items-start gap-[18px] xl:grid-cols-2">
        <Panel
          title="Add a slot"
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
              deleted inside that month. Days off are left off: a month is
              opened because the week changed, not because the break is
              cancelled.
            </p>
          </form>
        </Panel>
      </div>
    </div>
  );
}
