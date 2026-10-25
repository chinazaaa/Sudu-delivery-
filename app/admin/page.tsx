import PageHeader from "@/components/admin/PageHeader";
import { carLabel } from "@/lib/view";
import { runToWorkOn } from "@/lib/which-run";
import Link from "next/link";
import Diagnostic from "@/components/Diagnostic";
import AdminLive from "@/components/admin/AdminLive";
import Figure from "@/components/admin/Figure";
import Panel from "@/components/admin/Panel";
import { cartsInTime, needsDoing } from "@/lib/needs-doing";
import { batchOverview, promoterRows } from "@/lib/admin";
import { dashboard, orderFeed } from "@/lib/admin-data";
import { abandonedCarts } from "@/lib/carts";
import { safeSettings } from "@/lib/settings";
import { diagnoseEmpty, keyKind } from "@/lib/health";
import { newRequests } from "@/lib/requests";
import { plansWaiting } from "@/lib/plans";
import { parcelJobs } from "@/lib/parcel-jobs";
import { tendBatches } from "@/lib/batches";
import { SLOT_LABEL } from "@/lib/config";
import { naira } from "@/lib/money";
import {
  otherMoneySince,
  otherMoneyTotals,
  windowStart,
  WINDOW_DAYS,
} from "@/lib/other-money";
import { clockLabel, lagosToday, runDateLabel, weekdayLabel } from "@/lib/time";

export const dynamic = "force-dynamic";

/** Landed within the hour, which is what "while I was away" means in a shop. */
function isRecent(order: { created_at: string }): boolean {
  return Date.now() - new Date(order.created_at).getTime() < 3600000;
}

export default async function AdminHome() {
  let problem: Awaited<ReturnType<typeof diagnoseEmpty>> | null = null;
  let batches: Awaited<ReturnType<typeof batchOverview>> = [];
  let stats: Awaited<ReturnType<typeof dashboard>> | null = null;
  let unpaid: Awaited<ReturnType<typeof orderFeed>> = [];
  let today: Awaited<ReturnType<typeof orderFeed>> = [];
  let left: Awaited<ReturnType<typeof abandonedCarts>> = [];
  let parcelsToday: Awaited<ReturnType<typeof parcelJobs>> = [];

  try {
    /*
     * Three jobs in a row that open next week's runs, close the ones whose
     * cut-off has passed and settle the empty ones. It used to be forced,
     * which skipped the once-a-minute throttle, so every press of every
     * button in admin waited for the whole lot before a thing appeared on
     * screen. Nothing in it reflects what the person just did: it goes by
     * the clock, and a minute old is as good as a second old for "has the
     * cut-off passed".
     */
    await tendBatches();
    let promised: Awaited<ReturnType<typeof parcelJobs>> = [];
    [batches, stats, unpaid, today, left, promised] = await Promise.all([
      // Four weeks, the same stretch the money figures beside it cover.
      batchOverview("month"),
      dashboard(),
      orderFeed({ status: "pending", limit: 6 }),
      orderFeed({ status: "all", limit: 8 }),
      // Needs the settings row first, so it is chained rather than listed,
      // and the chain still runs alongside everything else here.
      safeSettings()
        .then((settings) => abandonedCarts(settings.abandon_minutes || 45))
        .catch(() => []),
      parcelJobs().catch(() => []),
    ]);
    // Only the ones promised for today, which is the whole reason this is on
    // the front page rather than on the parcels page alone.
    parcelsToday = promised.filter((one) => one.goesOn === lagosToday());

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
  // What is actually happening. A list of every run for the next three weeks
  // is a planning document, and this page is about today: the question in
  // the morning is whether a car is going, not what Sunday week looks like.
  // Midday UTC, so the day cannot slip either side of midnight.
  const tomorrow = new Date(new Date(`${lagosToday()}T12:00:00Z`).getTime() + 86400000)
    .toISOString()
    .slice(0, 10);
  /*
   * What is going today or tomorrow, whatever state it is in.
   *
   * This read only open runs, and open is the state a run is in before
   * anybody does anything to it: the moment today's closed, it fell out
   * of the card and did not come back until it was marked delivered. The
   * run being driven at that minute, the one row on this page worth
   * having, was the one row the page would not show.
   *
   * Cars of their own are here too. They are somebody's own trip rather
   * than a run anybody joins, but they are a car going out today and the
   * only place that said so was the runs page. Cancelled is not going.
   */
  /*
   * A run counts as done when somebody has pressed Settle on it, or when
   * some cost has been typed into it. Declared up here because the list of
   * what is going today reads it, and a const read above where it is
   * written throws rather than reading as nothing: the dashboard went to
   * the error page on exactly that.
   *
   * The button first, because it is the one that actually means "I have
   * finished the books on this": it refuses to go through until every bag
   * is ticked off and the counter prices are confirmed, so a run carrying
   * it has been looked at by a person. A cost on its own is the older test
   * and stays, for a run half-done where the fuel is in and the button has
   * not been pressed.
   */
  const done = (batch: (typeof batches)[number]) =>
    batch.settled_at !== null ||
    batch.fuel_cost +
      batch.driver_cost +
      (batch.transport_cost ?? 0) +
      batch.other_cost >
      0;

  const soon = batches.filter(
    (batch) =>
      (batch.run_date === lagosToday() || batch.run_date === tomorrow) &&
      batch.kind !== "parcel" &&
      batch.status !== "cancelled" &&
      // Something on it, or still somebody's to order onto. An empty run
      // whose closing time has gone is a car that never existed, and it
      // spent an evening on this card standing in for the one that did.
      (batch.orderCount > 0 ||
        (batch.status === "open" &&
          new Date(batch.cut_off_at).getTime() > Date.now())) &&
      // Tomorrow's that is somehow already finished is history. Today's
      // never is: a day whose driving is done is still the day being
      // asked about.
      (batch.run_date === lagosToday() ||
        !(batch.status === "delivered" && done(batch)))
  );
  // Where nothing is going either day, the next one that is, so the answer
  // is never just "no" with nowhere to go from it.
  const after = open
    .filter((batch) => batch.run_date > tomorrow)
    .sort((a, b) => a.run_date.localeCompare(b.run_date))[0];
  /*
   * Whether there is anything still to come in the next two days.
   *
   * Not the same as having nothing on the card. A Sunday whose only run
   * has been driven and settled has a row on it and nothing ahead of it,
   * and the week has no Monday run, so the card sat there showing one
   * finished Sunday and no sign of the Wednesday everybody is waiting
   * for. A card called Runs that answers only what already happened is
   * the diary, not the board.
   */
  const stillToCome = soon.some(
    (batch) => !(batch.status === "delivered" || done(batch))
  );

  // The run somebody is actually working today, for the button at the top.
  //
  // It was always reachable, under the stat tiles and the unpaid list, in a
  // card called "Today and tomorrow": a scroll on a phone, every time, for
  // the one page that gets opened most.
  //
  // Open is the wrong test for it. A run stops being open at its cut-off,
  // and the cut-off is the start of the work rather than the end: closed is
  // precisely the state a run is in while somebody is at the counter buying
  // it. Looking only at open runs sent the button past today's closed run to
  // tomorrow's, which is the one day it could not help with.
  //
  // So: today's while it is still going, then the next one that is still
  // to come, so the button goes somewhere useful on a quiet day too.
  // Delivered is done and cancelled is not going, and neither is work.
  //
  // A car of its own counts. It is somebody's own order rather than a run
  // anybody joins, but it is the car being driven today, and a day whose
  // only food is on a car sent the button to an empty scheduled run
  // standing beside it. What is being worked on is a question about where
  // the food is, not about what the batch is called.
  const drivable = batches
    .filter(
      (batch) =>
        batch.kind !== "parcel" &&
        batch.status !== "cancelled" &&
        batch.status !== "delivered" &&
        // Settled is the night being over in the shop's own words, and an
        // empty run settles itself the moment its closing time passes.
        // The button kept opening one of those.
        batch.settled_at === null
    )
    .sort((a, b) => a.run_date.localeCompare(b.run_date));
  // Two of them on one day is ordinary, and the first by date is whichever
  // the database happened to return: the button kept opening the empty
  // one, which is the one thing on the day nobody can work on. See
  // lib/which-run.ts.
  const working = runToWorkOn(drivable, lagosToday());
  const workingLabel =
    working === null
      ? ""
      : working.kind === "same_day"
        ? working.run_date === lagosToday()
          ? "Today's car"
          : "Tomorrow's car"
        : working.run_date === lagosToday()
          ? "Today's run"
          : working.run_date === tomorrow
            ? "Tomorrow's run"
            : `${runDateLabel(working.run_date)} run`;
  // Jobs with no run behind them: somebody paid for an errand nobody drove a
  // car for. Counted in the same window as the runs, because a profit that
  // leaves out a fortnight's errands is not the profit.
  /*
   * The four tiles at the foot of this page, asked for at once.
   *
   * These stood in a queue: the errands, then the custom-order requests,
   * then the standing orders, then what the promoters are owed, each
   * waiting on the one before it for no reason at all. Four trips of
   * latency on the page somebody opens twenty times a day, for four
   * questions that have nothing to do with each other.
   */
  const [aside, asked, standing, promoters] = await Promise.all([
    // Jobs with no run behind them: somebody paid for an errand nobody drove
    // a car for. Counted in the same window as the runs, because a profit
    // that leaves out a fortnight's errands is not the profit.
    otherMoneySince(windowStart()).catch(() => []),
    // Somebody asking for something we do not stock, waiting on an answer.
    // It arrives by email too, and an inbox is where things go to be missed.
    newRequests().catch(() => 0),
    // Standing orders to raise, and parents who asked for one and have not
    // heard back. The only things on this list worth money every month
    // rather than once, and the easiest to miss: a box that should have
    // landed on the 3rd and did not is a parent who assumes we forgot.
    plansWaiting().catch(() => ({ due: 0, asked: 0 })),
    // Commission earned and not handed over. Not the shop's money, and
    // somebody did the work weeks ago and is still waiting for it.
    promoterRows().catch(() => []),
  ]);
  const asideTotals = otherMoneyTotals(aside);
  const owing = promoters
    .filter((one) => one.owed > 0)
    .map((one) => ({ name: one.name || one.code, owed: one.owed, since: "" }));
  /*
   * Settled, and waiting.
   *
   * This tile used to sum every run in the window, open ones included. A run
   * that went out last night and has had nothing typed into it has takings
   * and no car to pay for yet, so it landed here at full value and then fell
   * by twenty thousand the afternoon somebody entered the fuel. Watching a
   * number you have been told is the profit drop every time you do the
   * bookkeeping teaches you not to trust it.
   *
   * So the headline is the part that is done, and what is waiting is said
   * beside it rather than folded into it. Nothing is hidden and nothing is
   * lost: a run joins the headline the moment its costs are in, which is the
   * same test and the same split the profit page makes.
   *
   * Errands and sales are settled the moment they are written down, because
   * there is no car coming for them.
   *
   * A run counts as done when somebody has pressed Settle on it, or when
   * some cost has been typed into it. The button first, because it is the
   * one that actually means "I have finished the books on this": it
   * refuses to go through until every bag is ticked off and the counter
   * prices are confirmed, so a run carrying it has been looked at by a
   * person. A cost on its own is the older test and stays, for a run
   * half-done where the fuel is in and the button has not been pressed.
   *
   * Costs alone could not say a run cost nothing. Not every trip has a
   * fare: a drop made on the way home, or one somebody walked across
   * campus, is finished and free, and the old test parked it in "waiting"
   * for ever and held its takings out of the headline. There is nothing to
   * wait for, and the only way to say so was to type a cost that was not
   * paid.
   */
  const waiting = batches.filter((batch) => batch.paidCount > 0 && !done(batch));
  const profit =
    batches
      .filter((batch) => batch.paidCount === 0 || done(batch))
      .reduce((total, batch) => total + batch.profit, 0) + asideTotals.made;
  // Never called profit: it is the figure that will fall.
  const waitingBefore = waiting.reduce((total, batch) => total + batch.profit, 0);
  const waitingSaid =
    waiting.length === 0
      ? ""
      : `${naira(waitingBefore)} on ${waiting.length} run${
          waiting.length === 1 ? "" : "s"
        } waiting on costs`;
  const unpaidValue = unpaid.reduce((total, order) => total + order.total, 0);

  // How long the run being worked has left, for the one job on the list that
  // is about a clock rather than about money.
  const closesIn =
    working === null
      ? 0
      : (new Date(working.cut_off_at).getTime() - Date.now()) / 60000;

  // Carts that could still make today's run: the ones worth a WhatsApp now
  // rather than an apology later. Worked out per cart, from each cart's own
  // last touch against the cut-off, rather than from the clock alone.
  // Against a run, never a car: a cart cannot join somebody else's car,
  // so chasing one to make it is chasing it to nothing.
  const joinable = runToWorkOn(
    drivable.filter((batch) => batch.kind !== "same_day"),
    lagosToday()
  );
  const inTime = cartsInTime(
    left,
    joinable ? { id: joinable.id, cutOffAt: joinable.cut_off_at } : null
  );

  const jobs = needsDoing({
    left: {
      value: left.reduce((total, cart) => total + cart.value, 0),
      count: left.length,
      stillInTime: inTime,
    },
    unpaid: {
      value: unpaidValue,
      count: unpaid.length,
      runLabel: workingLabel.toLowerCase(),
      closesAt: working ? clockLabel(working.cut_off_at) : "",
    },
    run: working
      ? {
          id: working.id,
          label: workingLabel,
          closesInMinutes: closesIn,
          kitchens: working.orderCount,
          paid: working.paidCount,
        }
      : null,
    // Replying is worth doing and nobody is out of pocket, so it sits at the
    // bottom of the list by design.
    reviews: 0,
    promoters: owing,
    parcels: parcelsToday.length,
    asked,
    plans: standing,
  });

  // The last few runs that actually went, for the bars. Newest on the right,
  // the way a week reads.
  /*
   * One bar for one evening, cars of their own counted.
   *
   * A car of its own used to be filtered out of this, on the reasoning that
   * the chart is about runs. It is about driving, and the biggest Saturday
   * the shop has had was a car: three orders and 52,809 kept. The chart
   * drew a quiet Saturday from the week before instead and said nothing
   * about the good one, which is the opposite of what a chart for deciding
   * which days are worth driving is for.
   *
   * Grouped by the date as well, because two batches on one night are one
   * drive. Otherwise a night with a run and a car on it is two bars both
   * labelled Sat, each showing half of what the evening made.
   *
   * Parcels stay out. A parcel is a courier job to one door, not a trip
   * round the counters, and averaging one in answers a different question.
   */
  const byNight = new Map<string, number>();
  for (const batch of batches) {
    if (batch.kind === "parcel" || batch.paidCount === 0) continue;
    byNight.set(batch.run_date, (byNight.get(batch.run_date) ?? 0) + batch.profit);
  }
  const ran = [...byNight.entries()]
    .map(([runDate, profit]) => ({ id: runDate, run_date: runDate, profit }))
    .sort((a, b) => a.run_date.localeCompare(b.run_date))
    .slice(-5);
  const best = Math.max(1, ...ran.map((one) => one.profit));
  const topped = Math.max(1, ...(stats?.topItems ?? []).map((one) => one.qty));
  /*
   * The last run that actually went, which the board draws under today's and
   * tomorrow's as a settled row. Without it the panel only ever showed cars
   * that have not left yet, so a morning after a good Friday said nothing
   * about Friday.
   */
  /*
   * The last thing that actually went out.
   *
   * Cars of their own were left out of this, on the reasoning that the
   * row is about runs. It is about the evening: a Saturday whose only
   * driving was a car disappeared off this card the moment the date
   * rolled over, and the car had earned the day. A parcel is still its
   * own trip on its own agreed day and is not what "last night" means.
   *
   * Latest day first, and within a day whichever carried most, so an
   * empty run settled beside a full car does not stand in for it.
   */
  const went =
    batches
      .filter(
        (batch) => batch.status === "delivered" && batch.kind !== "parcel"
      )
      .sort(
        (a, b) =>
          a.run_date.localeCompare(b.run_date) || a.orderCount - b.orderCount
      )
      .at(-1) ?? null;
  const dot = {
    red: "bg-brand-dark",
    amber: "bg-amber",
    ink: "bg-ink",
    volt: "bg-volt",
  } as const;

  // The weekday, which is the phone board's heading: somebody opening this in
  // the morning knows what day it is in their hand, not what the page is
  // called. The date under it drops the weekday the heading already says.
  const weekday = weekdayLabel(lagosToday());
  const dated = runDateLabel(lagosToday()).split(", ").at(-1) ?? "";
  // "4 things need doing", "1 thing needs doing", or a morning with nothing
  // in it, which is worth saying rather than leaving blank.
  const needSaid =
    jobs.length === 0
      ? "nothing needs doing"
      : jobs.length === 1
        ? "1 thing needs doing"
        : `${jobs.length} things need doing`;

  // The list's rows, drawn once and used by both of the panels below. On a
  // phone the board gives a row a title and a chevron: the detail sentence
  // and the button are the desk's, and the whole row is the link instead.
  const rows =
    jobs.length === 0 ? (
      <p className="border-t-[1.5px] border-rule pt-3.5 text-[14.5px] text-muted">
        Nothing is waiting. Every cart has been paid for, every order is on a run, and
        nobody is owed an answer.
      </p>
    ) : (
      jobs.map((job) => (
        <div
          key={job.kind}
          className="flex items-center gap-2.5 border-t-[1.5px] border-rule px-1 py-[11px] sm:gap-3 sm:py-3"
        >
          <span aria-hidden className={`size-2 shrink-0 rounded-full sm:size-2.5 ${dot[job.tone]}`} />
          <Link href={job.action.href} className="min-w-0 flex-1 sm:pointer-events-none">
            <span className="block text-sm font-bold sm:text-[15px]">{job.title}</span>
            <span className="hint hidden sm:block">{job.detail}</span>
          </Link>
          {/* The thumb's whole row is the link on a phone, so the button is
              the desk's and the chevron says the row goes somewhere. */}
          <span aria-hidden className="shrink-0 text-[17px] text-muted sm:hidden">
            ›
          </span>
          <Link
            href={job.action.href}
            className="btn-admin btn-admin-sm hidden shrink-0 sm:inline-flex"
          >
            {job.action.label}
          </Link>
        </div>
      ))
    );

  return (
    <div>
      <AdminLive />

      <PageHeader
        /* The weekday on a phone, which is what the board heads this page
           with: somebody opening it in the morning knows what day it is in
           their hand, not what the page is called. */
        title={
          <>
            <span className="sm:hidden">{weekday}</span>
            <span className="hidden sm:inline">Dashboard</span>
          </>
        }
        detail={
          <>
            {/* The date without the weekday the heading already says, and
                how much is waiting, which is the phone board's line. */}
            <span className="sm:hidden">
              {dated} · {needSaid}
            </span>
            <span className="hidden sm:inline">
              {runDateLabel(lagosToday())} · the last {WINDOW_DAYS} days, and what needs doing
              today.
            </span>
          </>
        }
        actions={
          <>
            {/* The board's two sizes: an outline button for the second
                thing, and the one tomato button on the screen for the run
                being driven. Neither is in the phone's header, where the
                board puts the red one under the two urgent tiles instead,
                so both are the desk's. */}
            <Link href="/admin/runs?new=1#new" className="btn-admin hidden sm:inline-flex">
              New run
            </Link>
            {working && (
              <Link
                href={`/admin/batch/${working.id}`}
                className="btn-admin-go hidden sm:inline-flex"
              >
                Open {workingLabel.toLowerCase()} →
              </Link>
            )}
          </>
        }
      />

      {/* What the board puts between the phone's heading and its one red
          button: the two things costing money right now. Nothing here is
          header content, so it is its own phone-only box rather than
          something PageHeader has to carry.

          The tiles are hand-rolled on the card primitive rather than built
          from Figure, because what makes them urgent is the ground and the
          border and Figure carries neither. Each is drawn only when there
          is something behind it: a tile reporting nought left behind is a
          tile in the way. */}
      <div className="mb-3 sm:hidden">
        {(left.length > 0 || owing.length > 0) && (
          <div className="mb-[11px] grid grid-cols-2 gap-[9px]">
            {/* Both of these go somewhere, because both of them are a job.

                They read as the same fact as the line in Needs doing
                underneath, in bigger type and with the money in it, and
                that line opens the page that deals with it. A tile that
                says you owe somebody five hundred naira and then does
                nothing when it is pressed is a tile that has to be pressed
                twice to be believed. Same addresses as the lines below, so
                the two cannot drift apart. */}
            {left.length > 0 && (
              <Link
                href="/admin/carts"
                className="card border-volt-line bg-brand-tint px-[13px] py-[11px] transition hover:border-ink"
              >
                <p className="ticket text-muted">Left behind</p>
                <p className="font-display text-[27px] font-black leading-none">
                  {naira(left.reduce((total, cart) => total + cart.value, 0))}
                </p>
                <p className="hint">
                  {left.length} cart{left.length === 1 ? "" : "s"}
                  {inTime > 0 ? ` · ${inTime} still live` : ""}
                </p>
              </Link>
            )}
            {owing.length > 0 && (
              <Link
                href="/admin/promoters?owed=1#owed"
                className="card border-brand-dark px-[13px] py-[11px] transition hover:border-ink"
              >
                <p className="ticket text-brand-dark">You owe promoters</p>
                <p className="font-display text-[27px] font-black leading-none text-brand-dark">
                  {naira(owing.reduce((total, one) => total + one.owed, 0))}
                </p>
                <p className="hint">
                  {owing.slice(0, 3).map((one) => one.name).join(", ")}
                </p>
              </Link>
            )}
          </div>
        )}

        {working && (
          /* The board gives the phone one full width tomato button at
             fifty-four pixels, under the two tiles, because it is the
             thumb's first stop in the morning.

             Two things going on one evening is one drive, so the button
             opens the day rather than one of them: going to the market is
             going to the market, and which door an order came through is
             a fact about what it paid, not about the driving. One thing
             going and the day sheet would be a second door to the same
             food, so it opens that one directly. */
          <Link
            href={`/admin/batch/${working.id}`}
            className="btn-admin-go min-h-[54px] w-full text-base"
          >
            Open {workingLabel.toLowerCase()} →
          </Link>
        )}
      </div>

      {problem && !problem.ok && (
        <Diagnostic title={problem.title} detail={problem.detail} />
      )}

      {stats && (
        /* The desk's four. The phone board has no row of four here at all:
           it carries the two urgent tiles above the red button and Money in
           and Profit below the list, so these are hidden rather than shrunk.
           Four across from lg, which is the width the boards describe. */
        <div className="hidden sm:mb-[18px] sm:grid sm:grid-cols-2 sm:gap-3.5 lg:grid-cols-4">
          <Figure
            label="Paid orders"
            value={String(stats.paidOrders)}
            detail={`Last ${WINDOW_DAYS} days`}
          />
          <Figure label="Money in" value={naira(stats.gross)} detail="Across paid orders" />
          <Figure
            label="Delivery fees"
            value={naira(stats.fees)}
            detail={
              stats.codesCost > 0
                ? `Your margin, after ${naira(stats.codesCost)} of codes`
                : "Your margin on the cars"
            }
          />
          <Figure
            label="Profit"
            value={naira(profit)}
            tone="mint"
            detail={
              waitingSaid !== ""
                ? `Runs settled. Plus ${waitingSaid}`
                : "After food, commission and run costs"
            }
          />
        </div>
      )}

      <div className="grid items-start gap-3 sm:gap-[18px] lg:grid-cols-[1.35fr_1fr]">
        <Panel
          /* One panel, two headings: the phone board heads it "Needs doing"
             with the bare number beside it, and the desk board spells out
             "today" and gives every row its sentence and its button. */
          title={
            <>
              Needs doing<span className="hidden sm:inline"> today</span>
            </>
          }
          aside={
            jobs.length > 0 ? (
              <span className="tag bg-brand-wash text-brand-dark">
                {jobs.length}
                <span className="hidden sm:inline">
                  {" "}
                  thing{jobs.length === 1 ? "" : "s"}
                </span>
              </span>
            ) : (
              <span className="tag bg-mint-tint text-mint">All clear</span>
            )
          }
        >
          {/* The lead sentence is the desk's. On a phone the board goes
              straight from the heading into the rows, so this is a child
              rather than the panel's `detail`: hidden, `detail` would still
              leave the gap its own margins make. */}
          <p className="hint mb-1.5 mt-1 hidden sm:block">
            Everything here costs you money if it is left. Clearing the list is the whole
            job.
          </p>
          {rows}
        </Panel>

        {/* The board puts these two under the list on a phone and in the row
            of four on a desk, so here they are the phone's pair. */}
        {stats && (
          <div className="grid grid-cols-2 gap-[9px] sm:hidden">
            <Figure
              label="Money in"
              value={naira(stats.gross)}
              detail={`${WINDOW_DAYS} days`}
            />
            <Figure
              label="Profit"
              value={naira(profit)}
              tone="mint"
              detail={waitingSaid !== "" ? `Settled. ${waitingSaid}` : `${WINDOW_DAYS} days`}
            />
          </div>
        )}

        <Panel
          title="Runs"
          aside={
            <Link href="/admin/runs" className="text-[13.5px] font-semibold text-brand-dark">
              All runs
            </Link>
          }
        >
          {soon.length === 0 && !after && (
            /* Still said when the settled row below is the only one there
               is: a run that has been delivered is not a car going out. */
            <p className="border-t-[1.5px] border-rule pt-3 text-[14.5px] text-muted">
              Nothing is going today or tomorrow.
            </p>
          )}
          {/* What is still to go, and then the last one that went. The row
              says which it is rather than claiming every run is open, which
              is what it used to do: the tag was hardcoded, so a settled run
              could not have been drawn here even if one had been passed. */}
          {[
            ...soon,
            ...(after && !stillToCome ? [after] : []),
            ...(went ? [went] : []),
          ]
            /*
             * Once each.
             *
             * Today's run stays in the first list after it has been
             * driven, because a day whose driving is done is still the
             * day being asked about, and the same run is also the last
             * one that went. So the evening a run is marked delivered it
             * was drawn twice, the same date, the same takings, the same
             * profit, one above the other, which reads as two cars
             * having gone out.
             */
            .filter(
              (batch, index, all) =>
                all.findIndex((one) => one.id === batch.id) === index
            )
            /*
             * What is still to come, soonest first, and then what has
             * been, most recent first.
             *
             * It was in cut-off order, which put this afternoon's
             * finished car above tomorrow's open run: a list read to
             * find out what is next, led by something that is not.
             */
            .sort((a, b) => {
              const aDone = a.status === "delivered" || done(a);
              const bDone = b.status === "delivered" || done(b);
              if (aDone !== bDone) return aDone ? 1 : -1;
              return aDone
                ? b.run_date.localeCompare(a.run_date)
                : a.cut_off_at.localeCompare(b.cut_off_at);
            })
            .map((batch) => (
            <Link
              key={batch.id}
              href={`/admin/batch/${batch.id}`}
              className="flex items-center gap-3 border-t-[1.5px] border-rule py-3"
            >
              <span className="min-w-0 flex-1">
                {/* A car of its own says the time it was asked for, which
                    is the whole of what makes it its own car. "Afternoon"
                    is a run's word and tells nobody when this one leaves. */}
                <span className="block font-bold">
                  {batch.kind === "same_day"
                    ? carLabel(batch)
                    : `${runDateLabel(batch.run_date)} · ${SLOT_LABEL[batch.slot]}`}
                </span>
                <span className="hint block">
                  {batch.status === "open"
                    ? `Closes ${clockLabel(batch.cut_off_at)}`
                    : `Done · ${naira(batch.gross)} in`}
                </span>
              </span>
              <span className="text-right">
                <span className="block font-mono text-sm font-semibold">
                  {batch.status === "open" ? `${batch.paidCount} paid` : naira(batch.profit)}
                </span>
                {/* "settled" was every status that was not open, so a run
                    that went out last night with nothing typed into it read
                    as settled and showed a profit that was going to fall.
                    Pressing Settle, or the costs being in, is what settles
                    a run. */}
                {batch.status === "open" ? (
                  <span className="tag bg-mint-tint text-mint">open</span>
                ) : done(batch) ? (
                  <span className="tag bg-wash text-ink">settled</span>
                ) : (
                  <span className="tag bg-brand-wash text-brand-dark">costs due</span>
                )}
              </span>
            </Link>
            ))}
        </Panel>

        <Panel
          title="What sells"
          detail={`Last ${WINDOW_DAYS} days. Use it to decide which kitchens go on a run.`}
        >
          {(stats?.topItems ?? []).length === 0 && (
            <p className="pt-2 text-[14.5px] text-muted">Nothing has sold yet this month.</p>
          )}
          {(stats?.topItems ?? []).slice(0, 5).map((one) => (
            <div key={`${one.name}|${one.restaurant}`} className="py-2.5">
              <div className="flex justify-between gap-2.5 text-sm">
                <span className="min-w-0 truncate">
                  <strong>{one.name}</strong>{" "}
                  <span className="text-muted">· {one.restaurant}</span>
                </span>
                <span className="font-mono shrink-0">{one.qty}</span>
              </div>
              <div className="mt-1.5 h-[7px] rounded-full bg-rule">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${Math.round((one.qty / topped) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </Panel>

        <div className="flex flex-col gap-3 sm:gap-[18px]">
          <Panel title="Profit per run">
            {ran.length === 0 ? (
              <p className="pt-2 text-[14.5px] text-muted">
                No run has been paid for yet, so there is nothing to compare.
              </p>
            ) : (
              <>
                <div className="flex h-[120px] items-end gap-2.5 pb-1 pt-2.5">
                  {ran.map((batch) => (
                    <div key={batch.id} className="flex flex-1 flex-col items-center gap-1.5">
                      <div
                        className="w-full rounded-t-md border-2 border-ink bg-brand"
                        style={{
                          height: `${Math.max(6, Math.round((batch.profit / best) * 86))}px`,
                        }}
                        title={naira(batch.profit)}
                      />
                      <span className="font-mono text-[10.5px] text-muted">
                        {runDateLabel(batch.run_date).slice(0, 3)}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="hint border-t-[1.5px] border-rule pt-2">
                  Best of these: <strong>{naira(best)}</strong>. Fuller cars, same cost.
                </p>
              </>
            )}
          </Panel>

          {/* Only once there is some.

              The errand book holds money that never came through a run, and
              on most days there is none of it: every custom order anybody
              asks for now goes out as an ordinary order on a car. A tile
              reading "0 entries, ₦0" is a row on the one screen that is
              supposed to be what needs doing, telling somebody about a
              thing that is not happening.

              Nothing is lost by it going. The way in is on the profit page,
              under "Money with no run behind it", which is where somebody
              adding a cost with no car behind it is already standing. */}
          {aside.length > 0 && (
            <Link
              href="/admin/money"
              className="soft flex items-center gap-3 border-volt-line bg-brand-tint px-4 py-3.5"
            >
              <span className="flex-1">
                <strong className="text-[14.5px]">Other money</strong>
                <span className="hint block">
                  {aside.length} entr{aside.length === 1 ? "y" : "ies"} in the last{" "}
                  {WINDOW_DAYS} days,{" "}
                  {naira(asideTotals.made)}
                </span>
              </span>
              <span className="btn-admin btn-admin-sm">Add one</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
