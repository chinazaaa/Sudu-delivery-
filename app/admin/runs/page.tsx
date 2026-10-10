import PageHeader from "@/components/admin/PageHeader";
import Link from "next/link";
import Diagnostic from "@/components/Diagnostic";
import Figure from "@/components/admin/Figure";
import Panel from "@/components/admin/Panel";
import { batchOverview } from "@/lib/admin";
import { openUntil } from "@/lib/batches";
import { sameDayTrips } from "@/lib/admin";
import { safeSettings } from "@/lib/settings";
import { diagnoseEmpty, keyKind } from "@/lib/health";
import { tendBatches, tidyEmptySameDay } from "@/lib/batches";
import {
  createBatch,
  deleteScheduleRun,
  generateRuns,
  saveScheduleRun,
  toggleScheduleRun,
} from "../actions";
import { runSchedule, WEEKDAYS } from "@/lib/schedule";
import { weekAround } from "@/lib/time";
import { placesOfRun } from "@/lib/run-places";
import { openRestaurants } from "@/lib/menu";
import SaveButton from "@/components/SaveButton";
import { SLOT_LABEL } from "@/lib/config";
import { naira } from "@/lib/money";
import { clockLabel, lagosToday, runDateLabel } from "@/lib/time";
import ActionButton from "@/components/admin/ActionButton";
import { STAGES, STAGE_LABEL, stageIndex } from "@/lib/stages";

export const dynamic = "force-dynamic";

/**
 * A row action, at a thumb's size on a phone.
 *
 * The design system draws these at thirty-four pixels for a mouse at a
 * desk. The six rules say nothing a thumb must hit goes under forty-four,
 * so the phone keeps the full tap area and only the desk gets the small
 * one.
 */
const ROW_ACTION = "btn-admin btn-admin-sm min-h-[44px] sm:min-h-[34px]";

/**
 * A same day car's window, without the day it was written with.
 *
 * The window is frozen when the order is placed, and "Today" was true that
 * afternoon and a lie by Thursday: the list showed a car from Tuesday
 * titled "Today". The date is printed in front of it instead, which is
 * still true next year.
 */
const timeOnly = (said: string): string => {
  const text = (said ?? "").trim();
  if (text === "") return "Same day car";
  return text.replace(/^(today|tomorrow)[,\s]+/i, "");
};

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
  // Ids are what a run stores. Names are what the list has to say.
  const counterNames = new Map(
    (await openRestaurants()).map((one) => [one.id, one.name] as const)
  );

  let problem: Awaited<ReturnType<typeof diagnoseEmpty>> | null = null;
  let batches: Awaited<ReturnType<typeof batchOverview>> = [];
  /** The same list before the week is cut out of it. The warning about the
   *  next run being further off than customers can see has to be able to
   *  see that run, and cutting the list to a week is exactly what hides
   *  it. */
  let everything: Awaited<ReturnType<typeof batchOverview>> = [];

  try {
    // Forced: whoever is on this page has just changed something and
    // is looking to see it.
    await tendBatches(true);
    // Starting a group makes its car immediately, so every abandoned group
    // left one behind, closed and empty and impossible to delete. They go
    // here, the moment nobody is in them.
    await tidyEmptySameDay();
    batches = await batchOverview(window);
    if (batches.length === 0) problem = await diagnoseEmpty();
    everything = batches;
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

  // "This week" has to mean a week.
  //
  // It went three days back and then forward for ever, so a tab called this
  // week was listing nineteen runs three weeks out, and the count and the
  // profit beside it were adding up a month. Runs are made weeks ahead on
  // purpose; this page is the one that asks what is happening now, and
  // "every run so far" is the other tab for a reason.
  // Monday to Sunday, the way the schedule is written and the way anybody
  // asking how the week went means it. A rolling seven days from today meant
  // that on a Saturday "this week" began on Saturday and ran into the middle
  // of the week after, which is not a week anybody keeps.
  const { monday, sunday } = weekAround();

  /**
   * Whether a run that has already gone still wants looking at.
   *
   * A finished run is history, and history has its own tab. One with a bag
   * nobody ticked off, or money nobody paid, is not history: it is a job,
   * and it has to stay in front of whoever can do it.
   */
  const unfinished = (batch: (typeof batches)[number]) =>
    batch.orderCount > 0 &&
    (batch.paidCount < batch.orderCount || batch.stage !== "handed_out");

  if (window === "recent") {
    batches = batches.filter(
      (batch) =>
        batch.run_date <= sunday && (batch.run_date >= monday || unfinished(batch))
    );
  }

  // Today leads, whatever time it is.
  //
  // The list ran oldest first, so a run being driven this afternoon sat
  // below everything already finished, under a heading reading "Still to
  // come". The run somebody is working is the reason this page is open, and
  // on a phone it was a scroll past the morning's history to reach it.
  //
  // Only today is lifted. Everything else keeps the order it had, because
  // the rest of the page is a record of a week and a record reads in the
  // order it happened.
  const todayIs = lagosToday();
  batches = [
    ...batches.filter((batch) => batch.run_date === todayIs),
    ...batches.filter((batch) => batch.run_date !== todayIs),
  ];

  /*
   * A day that has been and gone with nothing on it is not a run.
   *
   * It opened because the week said Tuesday, nobody ordered, and nobody
   * drove. Listing it puts a card on the page for a car that never existed,
   * and on a quiet week there are more of those than real ones.
   *
   * Only ones whose day has passed. Today's run and everything after it
   * stay on the page whether or not anybody has ordered yet: an empty
   * Friday is a Friday somebody can still order onto, and it is the card
   * you open to set its costs or move it along.
   */
  batches = batches.filter(
    (batch) => batch.orderCount > 0 || batch.run_date >= todayIs
  );

  const live = batches.filter((batch) => batch.status !== "cancelled");
  // The nearest run a customer could actually reach. Runs exist weeks out so
  // they can be planned, but only the ones closing inside the order horizon
  // are offered, and a horizon shorter than the gap to the next run hides
  // every run in the shop without saying so anywhere.
  const soonestRun = everything
    .filter((batch) => batch.status !== "cancelled")
    // How far ahead the shop is open is a question about runs. A parcel is
    // one person's trip and a car of its own is somebody's own order, and
    // neither says anything about whether the week is set up.
    .filter(
      (batch) =>
        batch.status === "open" &&
        batch.kind !== "same_day" &&
        batch.kind !== "parcel"
    )
    .map((batch) => batch.run_date)
    .sort()[0];
  const daysAway = soonestRun ? coverDays(soonestRun) : null;
  const hidden = daysAway !== null && daysAway > horizon;
  // A run somebody actually drove, which is a run with an order on it. The
  // rest either have not happened yet or opened and were never used, and
  // those two are not the same thing: a Friday nobody has ordered on at
  // Tuesday lunchtime is a Friday, not a wasted car.
  const ran = live.filter((batch) => batch.orderCount > 0).length;
  const gone = (batch: { cut_off_at: string }) =>
    new Date(batch.cut_off_at).getTime() < Date.now();
  const empty = live.filter((batch) => batch.orderCount === 0 && gone(batch)).length;
  const orders = live.reduce((total, batch) => total + batch.orderCount, 0);
  const paid = live.reduce((total, batch) => total + batch.paidCount, 0);
  const profit = live.reduce((total, batch) => total + batch.profit, 0);

  /**
   * The run somebody is in the middle of.
   *
   * The phone board gives it a card of its own at the top, on Ink, because
   * it is the reason the page is open: a run already being bought for is not
   * one row of a week's list. It was only being lifted to the head of that
   * list, which on a phone is a card the same shape as the four below it.
   *
   * Past ordering and not yet handed out, which is the window in which there
   * is something to go back into.
   */
  const happening =
    batches.find(
      (batch) =>
        batch.status !== "cancelled" &&
        batch.kind !== "parcel" &&
        batch.run_date === todayIs &&
        stageIndex(batch.stage) > stageIndex("ordering") &&
        batch.stage !== "handed_out"
    ) ?? null;
  /** How far through the stages it is, for the bar under the title. */
  const howFar = happening
    ? Math.round((stageIndex(happening.stage) / (STAGES.length - 1)) * 100)
    : 0;

  /*
   * One Tomato button per screen, on whatever is actually the thing to do
   * next.
   *
   * Four of them were orange at once: open a month, widen the horizon, make
   * a one-off run and create it. Two red buttons and neither reads as the
   * answer, so the colour goes to the most urgent one that is on the page
   * and everything else is an outline.
   */
  const needsMonth = !until || coverDays(until) < 14;
  // A run being driven comes first: whatever else the week needs, the thing
  // to do now is the thing somebody is standing in.
  const doNext = happening
    ? "run"
    : needsMonth
      ? "month"
      : hidden
        ? "horizon"
        : showForm
          ? "create"
          : "new";
  const go = (which: string) => (doNext === which ? "btn-admin-go" : "");

  return (
    <div>
      <PageHeader
        title="Runs"
        detail={
          window === "all"
            ? "Every run ever made, newest first."
            : "Monday to Sunday, and anything before it that is not finished."
        }
        actions={
          <>
            <Link href="/admin/schedule" className="btn-admin">
              Schedule
            </Link>
            <Link
              href={showForm ? "/admin/runs" : "/admin/runs?new=1#new"}
              className={`btn-admin ${go("new")}`}
            >
              {showForm ? "Close" : "One-off run"}
            </Link>
          </>
        }
      />

      {happening && (
        <section className="card mb-4 border-ink bg-ink text-paper">
          <p className="flex items-center gap-2">
            <span className="ticket shrink-0 rounded bg-brand px-2 py-0.5 text-paper">
              Happening now
            </span>
            <span className="ml-auto min-w-0 text-right text-[12.5px] text-rail-text">
              {STAGE_LABEL[happening.stage]}
            </span>
          </p>
          <h2 className="mt-2 font-display text-[27px] font-black uppercase leading-[1.05]">
            {happening.kind === "same_day"
              ? `${runDateLabel(happening.run_date)} · ${timeOnly(happening.delivery_window_text)}`
              : happening.kind === "skincare"
                ? `Skincare drop · ${runDateLabel(happening.run_date)}`
                : `${runDateLabel(happening.run_date)} · ${SLOT_LABEL[happening.slot]}`}
          </h2>
          <p className="mt-1 text-[13px] text-rail-text">
            {happening.paidCount} paid · <span className="font-mono">{naira(happening.gross)}</span>{" "}
            in · {happening.orderCount} order
            {happening.orderCount === 1 ? "" : "s"} on it
          </p>
          {/* Volt on Ink, which is the one place the palette allows it, and
              the bar it stands on is the rail's own grey rather than an
              opacity on the paper. */}
          <span
            aria-hidden
            className="mt-3 block h-[7px] overflow-hidden rounded-full bg-rail-line"
          >
            <span
              className="block h-full rounded-full bg-volt"
              style={{ width: `${howFar}%` }}
            />
          </span>
          <Link
            href={`/admin/batch/${happening.id}`}
            className={`btn-admin mt-3 min-h-[50px] w-full text-[15.5px] ${go("run")}`}
          >
            Back into the run →
          </Link>
        </section>
      )}

      {trips.length > 0 && (
        <Panel
          title="Still to buy for"
          detail="Same day cars nobody has been to the counter for yet. Ones within an hour and a half of each other are one trip, so this is what to buy in one go. They disappear from here once you set off."
          className="mb-4"
        >
          <ul>
            {trips.map((trip) => (
              <li
                key={trip.at}
                className="flex flex-wrap items-center justify-between gap-2 border-t-[1.5px] border-rule py-2.5"
              >
                <span className="min-w-0">
                  {/* The earliest, because that is the one you cannot be
                      late for. It used to read "X to Y", which looks like one
                      long delivery window rather than two separate cars. */}
                  <span className="font-bold">{trip.label}</span>
                  <span className="hint block">
                    {trip.times.length > 1 &&
                      `${trip.times.length} cars · `}
                    {trip.orders} {trip.orders === 1 ? "order" : "orders"} ·{" "}
                    {trip.items} item{trip.items === 1 ? "" : "s"} ·{" "}
                    {trip.paid} paid
                    {trip.unpaid > 0 && `, ${trip.unpaid} not yet`}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="font-display text-[22px] font-black leading-none sm:text-[26px]">
                    {naira(trip.gross)}
                  </span>
                  <Link
                    href={`/admin/trip/${encodeURIComponent(trip.at)}`}
                    className={ROW_ACTION}
                  >
                    Open the trip →
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* Wrapped, not scrolled sideways: the tap after a fling is
          spent stopping the fling, so a row somebody has to scroll is a
          row whose buttons sometimes do nothing. */}
      <div className="mb-3 flex flex-wrap gap-2">
        <Link
          href="/admin/runs"
          className={`pill-admin ${window === "recent" ? "pill-admin-on" : ""}`}
        >
          This week
        </Link>
        <Link
          href="/admin/runs?show=all"
          className={`pill-admin ${window === "all" ? "pill-admin-on" : ""}`}
        >
          Every run so far
        </Link>
      </div>

      {/* The thing that quietly kills a shop: ordering open, but nothing left
          to order into. */}
      <div
        className={`card mb-4 ${
          needsMonth ? "border-volt-line bg-brand-tint" : ""
        }`}
      >
        <h2 className="font-display text-[21px] font-black uppercase leading-none sm:text-[26px]">
          {until
            ? `Ordering is open through ${runDateLabel(until)}`
            : "No runs are open"}
        </h2>
        <p className="hint mt-1.5">
          {!until
            ? "Nobody can order anything until a month is opened."
            : coverDays(until) < 14
              ? `That is ${coverDays(until)} day${coverDays(until) === 1 ? "" : "s"} away. Open the next month before it runs out.`
              : `Customers see the runs closing in the next ${horizon} days; the rest are yours to plan.`}
        </p>
        {needsMonth && (
          <Link href="/admin/schedule" className={`btn-admin mt-3 ${go("month")}`}>
            Open a month
          </Link>
        )}
      </div>

      {/* A run that exists and a run somebody can order onto are two
          different things, and the gap between them is one number in
          settings. Worth saying out loud: from the shop floor everything
          looks open, while the checkout quietly offers nobody a run. */}
      {hidden && (
        <div className="card mb-4 border-volt-line bg-brand-tint">
          <h2 className="font-display text-[21px] font-black uppercase leading-none sm:text-[26px]">
            Nobody can order onto a run right now
          </h2>
          <p className="hint mt-1.5">
            The next run is {runDateLabel(soonestRun!)}, {daysAway} days away,
            and customers only see runs closing in the next {horizon}. Until
            that number is at least {daysAway}, the checkout offers a car of
            its own and the dearer price that goes with it.
          </p>
          <Link
            href="/admin/settings"
            className={`btn-admin mt-3 ${go("horizon")}`}
          >
            Change how far ahead people can order
          </Link>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:gap-3.5 xl:grid-cols-4">
        {/*
          Runs that happened, not runs that exist.

          A run with nothing on it is a car that never went: it opened
          because the week said Tuesday, nobody ordered, and nobody drove.
          Counting it said five when two had been done, which is a number
          that answers no question anybody has. The ones that opened and
          went unused are said underneath instead, where they read as what
          they are.
        */}
        <Figure
          label="Runs done"
          value={String(ran)}
          detail={
            empty === 0
              ? window === "all"
                ? "Every run so far"
                : "This week"
              : `${empty} closed with nothing on ${empty === 1 ? "it" : "them"}`
          }
        />
        {/* `sm:contents` rather than a wrapper from the tablet up, so each
            tile goes back to being the grid's own child and the row of four
            lines up as it always did. */}
        <div className="hidden sm:contents">
          <Figure label="Orders" value={String(orders)} detail="Across the runs below" />
          <Figure
            label="Paid"
            value={String(paid)}
            tone="mint"
            detail={
              orders - paid === 0 ? "Nothing outstanding" : `${orders - paid} unpaid`
            }
          />
        </div>
        {/* Only a profit in hand is coloured. A loss in mint reads as money
            made, which is the one thing it is not. */}
        <Figure
          label="Profit"
          value={naira(profit)}
          tone={profit >= 0 ? "mint" : "ink"}
          detail="Across the runs below"
        />
      </div>

      {/* Anchored, because the form is below the runs themselves and the
          button that opens it is in the header or on another page
          altogether. Without this, "New run" loaded a page that looked
          exactly as it did before, with the form it had just opened a
          screen and a half further down. */}
      {showForm && (
        <Panel
          id="new"
          title="A one-off run"
          detail="For a day that is not in your week: exam week, a match, a request. Creating one that already exists updates it."
          className="mb-4 scroll-mt-4"
        >
          <form action={createBatch} className="mt-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="run_date">Day</label>
                <input id="run_date" name="run_date" type="date" required className="field field-admin min-h-[44px] sm:min-h-[42px]" />
              </div>
              <div>
                <label className="label" htmlFor="cut_off_time">Orders close</label>
                <input
                  id="cut_off_time"
                  name="cut_off_time"
                  type="time"
                  defaultValue="12:00"
                  required
                  className="field field-admin min-h-[44px] sm:min-h-[42px]"
                />
              </div>
              <div>
                <label className="label" htmlFor="slot">Which batch</label>
                <select id="slot" name="slot" className="field field-admin min-h-[44px] sm:min-h-[42px]" defaultValue="afternoon">
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
                className="field field-admin min-h-[44px] sm:min-h-[42px]"
              />
            </div>
            <ActionButton
              className={`btn-admin w-full sm:w-auto ${go("create")}`}
              done="Run created ✓"
            >
              Create run
            </ActionButton>
            <p className="hint">
              Times are Lagos time. A day holds one afternoon run and one night
              run. Leave the wording blank to use the default from Settings.
            </p>
          </form>
        </Panel>
      )}

      <ul className="space-y-3">
        {batches.map((batch, index) => {
          // One line between what has happened and what is still coming,
          // and one above today where today has been lifted out of the
          // order. Both read off the row before rather than off the clock,
          // because today's run is no longer in time order with the rest.
          /*
           * Which of the three this row belongs to.
           *
           * Read off the date rather than off the clock: a run that closed
           * at half past eleven is still today's run at four in the
           * afternoon, and "still to come" has to mean another day or it
           * means nothing.
           *
           * The heading is drawn wherever the group changes, rather than by
           * naming the one row each heading sits above. That way a week
           * with no run today, or nothing in the past, or nothing ahead,
           * still labels what it does have instead of silently dropping a
           * heading and running two groups together.
           */
          const group = (one: { run_date: string }) =>
            one.run_date === todayIs ? "today" : one.run_date > todayIs ? "ahead" : "past";
          const mine = group(batch);
          const opens = index === 0 || group(batches[index - 1]) !== mine;
          const open = batch.status === "open";
          return (
            <li key={batch.id}>
              {opens && (
                <p
                  className={`ticket mb-2 ${index === 0 ? "" : "mt-4"} ${
                    mine === "today" ? "text-brand-dark" : "text-muted"
                  }`}
                >
                  {mine === "today" ? "Today" : mine === "ahead" ? "Still to come" : "Past"}
                </p>
              )}
              <Link
                href={
                  batch.parcelOrderId
                    ? `/admin/orders/${batch.parcelOrderId}`
                    : `/admin/batch/${batch.id}`
                }
                className="card flex items-center justify-between gap-2.5 p-3.5 transition hover:border-brand/40 hover:shadow-lift sm:gap-3 sm:p-4"
              >
                <div className="min-w-0">
                  {/* A same day car borrows a run's date and slot, so titled
                      like one it was indistinguishable from a run: "Friday ·
                      Afternoon" for something somebody asked to arrive at two
                      o'clock. It says what it is. */}
                  <p className="text-[17px] font-bold">
                    {batch.kind === "same_day"
                      ? `${runDateLabel(batch.run_date)} · ${timeOnly(batch.delivery_window_text)}`
                      : batch.kind === "skincare"
                        ? // A drop borrows a run's date and slot too, and
                          // titled like one it is the run, as far as anybody
                          // reading this list can tell.
                          `Skincare drop · ${runDateLabel(batch.run_date)}`
                        : batch.kind === "parcel"
                          ? batch.delivery_window_text || "Parcel"
                          : `${runDateLabel(batch.run_date)} · ${SLOT_LABEL[batch.slot]}`}
                  </p>
                  <p className="hint">
                    {batch.kind === "same_day"
                      ? `One car, asked for on ${runDateLabel(batch.run_date)}`
                      : batch.kind === "parcel"
                        ? batch.deliver_at
                          ? `Carrying it ${runDateLabel(batch.run_date)}`
                          : "Waiting on a date from you"
                        : `Closes ${clockLabel(batch.cut_off_at)} · ${batch.delivery_window_text}`}
                  </p>
                  <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {batch.status === "cancelled" && (
                      <span className="tag bg-wash text-ink">Not running</span>
                    )}
                    {batch.kind === "same_day" && (
                      <span className="tag bg-brand-tint text-brand-dark">Same day</span>
                    )}
                    {batch.kind === "skincare" && (
                      <span className="tag bg-brand-tint text-brand-dark">
                        Skincare, not food
                      </span>
                    )}
                    {batch.kind === "parcel" && (
                      <span className="tag bg-brand-tint text-brand-dark">
                        {batch.deliver_at ? "Parcel" : "Parcel · day not agreed"}
                      </span>
                    )}
                    {/* A run kept to one or two counters. Worth seeing from
                        the list: it is the thing that explains why an order
                        could not go on it. */}
                    {batch.kind === "run" && placesOfRun(batch.only_places ?? "").length > 0 && (
                      <span className="tag bg-brand-tint text-brand-dark">
                        {placesOfRun(batch.only_places ?? "")
                          .map((id) => counterNames.get(id) ?? "one counter")
                          .join(", ")}{" "}
                        only
                      </span>
                    )}
                    <span
                      className={`tag ${
                        open ? "bg-mint-tint text-mint" : "bg-wash text-ink"
                      }`}
                    >
                      {batch.status}
                    </span>
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <p className="ticket text-muted">Paid</p>
                  <p
                    className={`font-display text-[24px] font-black leading-none sm:text-[30px] ${
                      batch.paidCount === 0 ? "text-muted" : "text-mint"
                    }`}
                  >
                    {batch.paidCount}
                  </p>
                  <p className="hint mt-1">
                    {batch.orderCount} ordered
                    {batch.orderCount > batch.paidCount &&
                      ` · ${batch.orderCount - batch.paidCount} unpaid`}
                  </p>
                  {batch.orderCount === 0 && (
                    <p className="hint mt-1">Nothing ordered yet</p>
                  )}
                  {batch.paidCount > 0 && (
                    <p
                      className={`mt-1 font-mono text-[13px] font-bold ${
                        batch.profit >= 0 ? "text-mint" : "text-brand-dark"
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
