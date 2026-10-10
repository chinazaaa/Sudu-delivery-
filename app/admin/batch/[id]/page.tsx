import PageHeader from "@/components/admin/PageHeader";
import SaveButton from "@/components/SaveButton";
import type { Batch } from "@/lib/types";
import { deliverySlots } from "@/lib/same-day";
import { hoursByDay } from "@/lib/settings";
import {
  moveSameDayCar,
  raiseMenuPrice,
  reopenRun,
  setCounterSpend,
  settleRun,
} from "@/app/admin/actions";
import ShortGroups from "@/components/admin/ShortGroups";
import SettleRun from "@/components/admin/SettleRun";
import SheetBody from "@/components/admin/SheetBody";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import HandoutList from "@/components/HandoutList";
import Figure from "@/components/admin/Figure";
import Panel from "@/components/admin/Panel";
import SheetShape from "@/components/admin/SheetShape";
import Checklist from "@/components/admin/Checklist";
import ConfirmButton from "@/components/admin/ConfirmButton";
import ActionButton from "@/components/admin/ActionButton";
import StagePicker from "@/components/admin/StagePicker";
import SendSheet from "@/components/admin/SendSheet";
import { payableAccounts } from "@/lib/banks";
import { allAreas } from "@/lib/areas-server";
import { areasOfRun } from "@/lib/areas";
import { placesOfRun } from "@/lib/run-places";
import { openRestaurants } from "@/lib/menu";
import { batchSheet, notPriced, stillOpen, typicalCosts, shortfalls } from "@/lib/admin";
import { SLOT_LABEL } from "@/lib/config";
import { runSchedule, WEEKDAYS } from "@/lib/schedule";
import Link from "next/link";
import { naira, orderRef, refsIn } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { clockLabel, lagosToday, runDateLabel } from "@/lib/time";
import { profitBetween } from "@/lib/profit";
import { bandTable, parseBands } from "@/lib/fees";
import { narration, template, whatsappTo } from "@/lib/messages";
import { getSettings } from "@/lib/settings";
import { sheetAsText } from "@/lib/sheet-text";
import {
  STAGES,
  STAGE_ACTION,
  STAGE_LABEL,
  stageIndex,
  type BatchStage,
} from "@/lib/stages";
import {
  markDelivered,
  markPaid,
  refundOrder,
  setBatchCapacity,
  setBatchStage,
  setBagDelivered,
  setBatchStatus,
  setFlashFee,
  setRunCosts,
  updateRun,
  deleteRun,
  moveStop,
} from "../../actions";
import Reorder from "@/components/admin/Reorder";

export const dynamic = "force-dynamic";

/**
 * The height a row action stands at.
 *
 * The design system draws these at thirty-four pixels, which is right for a
 * mouse at a desk. The six rules say nothing a thumb must hit goes under
 * forty-four, and this sheet is worked through at a counter with one hand,
 * so the phone keeps the full tap area and only the desk gets the small
 * one.
 */
const THUMB = "min-h-[44px] sm:min-h-[34px]";

/*
 * How thin is thin, for the day of the week a run is on.
 *
 * The same shape of calculation the schedule page makes for a day that is
 * losing money: ten weeks back finds six of any weekday even with a closure
 * or two in the way, and three is the fewest that is an average rather than
 * one bad night. Copied rather than invented so the two cards cannot
 * disagree about what a Sunday normally does.
 */
const WEEKS_BACK = 10;
const FEWEST = 3;
const MOST_BACK = 6;

function addDays(date: string, days: number): string {
  // Midday UTC, so adding days cannot slip across a midnight.
  const at = new Date(`${date}T12:00:00Z`);
  return new Date(at.getTime() + days * 86400000).toISOString().slice(0, 10);
}

function weekdayOf(runDate: string): number {
  return new Date(`${runDate}T12:00:00Z`).getUTCDay();
}

/**
 * What this run's weekday usually brings in, when this one is under it.
 *
 * Null unless there is a real average to quote and this run is genuinely
 * below it: a card that turns up every week to say everything is fine is a
 * card nobody reads, and a figure nobody can stand behind is worse than no
 * card at all.
 */
async function thinForItsDay(
  batch: Batch,
  paid: number
): Promise<{ days: number; orders: number; weekday: string } | null> {
  const today = lagosToday();
  const money = await profitBetween(addDays(today, -(WEEKS_BACK * 7 - 1)), today);
  const weekday = weekdayOf(batch.run_date);
  // Runs only, and never this run itself: a run cannot be thin against its
  // own takings.
  const mine = money.byRun.filter(
    (run) =>
      run.kind === "run" &&
      run.runDate !== batch.run_date &&
      weekdayOf(run.runDate) === weekday
  );
  const dates = [...new Set(mine.map((run) => run.runDate))]
    .sort()
    .reverse()
    .slice(0, MOST_BACK);
  if (dates.length < FEWEST) return null;

  const on = mine.filter((run) => dates.includes(run.runDate));
  const average = on.reduce((sum, run) => sum + run.orders, 0) / dates.length;
  const usual = Math.round(average);
  if (usual <= 0 || paid >= usual) return null;
  return { days: dates.length, orders: usual, weekday: WEEKDAYS[weekday] };
}

/**
 * The run in four parts, which is what the phone board draws.
 *
 * Six cells of stage is a desk's worth of detail: at three hundred and
 * ninety pixels it came to six tall boxes above the only thing the screen
 * is for. Four phases fit across one bar, and every one of the six stages
 * has a home in them, so the bar never names a step the run cannot be in.
 * Driving belongs to the handout rather than to the buying: the food is
 * bought, and the road is the first leg of giving it out.
 */
const PHASES: { label: string; parcel: string; stages: BatchStage[] }[] = [
  { label: "Ordering", parcel: "Not paid", stages: ["ordering"] },
  { label: "Buying", parcel: "Collecting", stages: ["closed", "at_counter"] },
  {
    label: "Handout",
    parcel: "Handing over",
    stages: ["on_the_road", "at_drop", "handed_out"],
  },
  // Settled is not a stage but a date: the books are closed or they are not.
  { label: "Settled", parcel: "Settled", stages: [] },
];

/** The whole row action, for the buttons and links that are not a component. */
const ROW_ACTION = `btn-admin btn-admin-sm ${THUMB}`;

export default async function BatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  /** Which counter is being read, one-based. The sheet is one counter at a
   *  time on a phone, and the counter is in the address so it can be sent
   *  to somebody and so the back button walks the stops. */
  searchParams: Promise<{ stop?: string }>;
}) {
  const sheet = await batchSheet((await params).id);
  if (!sheet) notFound();
  const query = await searchParams;

  const { batch, counter, handout, unpaid, summary, refunds, groupsShort, pins, callsThem } =
    sheet;
  const areas = await allAreas();
  // For the run that is one counter's run. Read here rather than typed, so
  // a restaurant added this morning is tickable this afternoon.
  const counters = await openRestaurants();

  // One wording for a share, here and in the message the customer gets:
  // #1001a and #1001b, never #1001 on this screen and #1001a on theirs.
  const refs = refsIn([...handout.flatMap((bag) => bag.orders), ...unpaid]);
  const refFor = (order: { id: string; order_no: number | null }) =>
    refs.get(order.id) ?? orderRef(order);
  // A run nobody has ordered into is still just a plan: it can be moved to
  // another day, or dropped altogether.
  const empty = summary.paidCount + summary.unpaidCount === 0;
  // A run the schedule still calls for cannot actually be deleted: opening
  // admin would make it again the moment it went. It is marked not running
  // instead, which is what stops it coming back. The panel below has to say
  // that, because a Delete button that leaves the run on the page reading
  // "cancelled" looks broken.
  const scheduleWeekday = new Date(`${batch.run_date}T12:00:00Z`).getUTCDay();
  const onSchedule =
    batch.kind !== "same_day" &&
    (await runSchedule(true)).some(
      (entry) =>
        entry.active &&
        entry.slot === batch.slot &&
        entry.weekday === scheduleWeekday
    );
  // Past the counter, the shopping is done and the list is history. Past the
  // handout, so is the run.
  const shopped = stageIndex(batch.stage) >= stageIndex("on_the_road");
  const finished = batch.stage === "handed_out";
  // A run used to be judged against an eight order minimum. It is not the
  // measure any more: one urgent same day order covers its own car. What
  // matters is whether this run is actually losing money.
  const losingMoney = summary.costs > 0 && summary.profit < 0;

  // Before a run is driven nobody has entered its fuel or driver, so profit
  // reads high at exactly the moment the decision to drive is made. What past
  // runs actually cost is a far better guess than nothing.
  const usual = summary.costs === 0 ? await typicalCosts() : null;
  // Windows a car could be moved into, when it is a car and nothing has been
  // bought for it yet.
  const windows =
    batch.kind === "same_day" && batch.stage === "ordering"
      ? await deliverySlots(new Date(), await hoursByDay())
      : [];
  // Shared deliveries where somebody has not paid, and what that leaves the
  // car short by.
  const short = await shortfalls(batch.id);
  // What is still to be handed over at the counters, at menu prices: every
  // line nobody has typed a real figure against yet. The private ticks beside
  // a stop are in one browser's storage, so they cannot be counted here, and
  // a figure that said "still to spend" while meaning "everything" would be
  // worse than no figure at all.
  const unpriced = counter.flatMap((group) =>
    group.lines
      .filter((line) => line.paid === null)
      .map((line) => ({ restaurant: group.restaurant, line }))
  );
  const stillToSpend = unpriced.reduce(
    (total, one) => total + one.line.qty * one.line.unitPrice,
    0
  );
  const stillAt = [...new Set(unpriced.map((one) => one.restaurant))];
  const likely = usual === null ? null : summary.profit - usual;

  // Which counter is being read. One counter at a time is the phone's shape,
  // and the counter is in the address so the sheet for one stop can be sent
  // to whoever is driving to it.
  const asked = Number(query.stop);
  const stopShown =
    Number.isInteger(asked) && asked >= 1 && asked <= counter.length
      ? asked
      : null;

  /**
   * A stop with a real figure against every one of its lines.
   *
   * The private ticks live in one browser's storage and cannot be read here,
   * so this is the only thing the page can honestly call done: the money has
   * been handed over and said.
   */
  const paidFor = (group: (typeof counter)[number]) =>
    group.lines.length > 0 && group.lines.every((line) => line.paid !== null);
  const doneStops = counter.filter(paidFor).length;

  /**
   * Which orders to collect at each counter.
   *
   * The counter list is one line per item on purpose, because a total is
   * what gets read out at the till. Who the food is for is the other half of
   * the same question, asked while the bags are coming over the counter, and
   * an order's lines carry the restaurant they came from. An order standing
   * at two counters is listed under both, which is right: it is collected at
   * both.
   */
  const ordersAt = new Map<
    string,
    { id: string; ref: string; who: string; hostel: string; items: string; amount: number }[]
  >();
  for (const bag of handout) {
    for (const order of bag.orders) {
      const byPlace = new Map<string, typeof order.lines>();
      for (const line of order.lines) {
        byPlace.set(line.restaurant, [...(byPlace.get(line.restaurant) ?? []), line]);
      }
      for (const [place, lines] of byPlace) {
        ordersAt.set(place, [
          ...(ordersAt.get(place) ?? []),
          {
            id: order.id,
            ref: refFor(order),
            who: order.for_name ?? order.customer_name,
            hostel: order.hostel,
            items: lines
              .map((line) => `${line.name}${line.qty > 1 ? ` ×${line.qty}` : ""}`)
              .join(", "),
            amount: lines.reduce(
              (total, line) => total + line.qty * line.unit_price_at_order,
              0
            ),
          },
        ]);
      }
    }
  }

  // Whether this run is thin for the day of the week it is on, and only
  // while there is still time to do something about it.
  const thin =
    batch.kind === "run" && batch.stage === "ordering"
      ? await thinForItsDay(batch, summary.paidCount).catch(() => null)
      : null;

  const settings = await getSettings();
  // The account the payment message quotes: the first on the list.
  const bank = (await payableAccounts(settings))[0] ?? null;
  const bands = parseBands(settings.fee_bands);
  // Links inside the messages have to be absolute, so they are built from the
  // request rather than from another environment variable to keep in sync.
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "";
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  const siteUrl = host ? `${proto}://${host}` : "";
  // A skincare drop borrows a run's date and slot, so titled like one it was
  // indistinguishable from the Saturday run: the areas ticked on it were
  // ticked on the wrong car, and the food run they were meant for carried on
  // going nowhere. It says what it is.
  const batchLabel =
    batch.kind === "skincare"
      ? `Skincare drop · ${runDateLabel(batch.run_date)}`
      : batch.kind === "parcel"
        ? // Reachable once two parcels share a day and a route: one drive, so
          // one trip, and this is the sheet for it.
          `Parcels · ${runDateLabel(batch.run_date)}`
        : `${runDateLabel(batch.run_date)} ${SLOT_LABEL[batch.slot]}`;

  // The wording is whatever the admin has written in settings, so one edit
  // changes the message everywhere it is offered.
  const messageFor = (order: (typeof unpaid)[number]) =>
    whatsappTo(
      order.customer_phone,
      template({
        kind: order.status === "pending" ? "payment" : "confirmed",
        order: { ...order, callsThem: callsThem[order.customer_phone] ?? "" },
        settings,
        pin: pins[order.customer_phone] ?? null,
        siteUrl,
        batchLabel,
        deliveryWindow: batch.delivery_window_text,
        bank,
      })
    );

  return (
    <div className={stopShown === null ? "" : "pb-[82px] lg:pb-0"}>
      <PageHeader
        backHref="/admin/runs"
        backLabel="All runs"
        title={batchLabel}
        detail={
          <>
            Closes {clockLabel(batch.cut_off_at)} · {batch.delivery_window_text} ·{" "}
            {STAGE_LABEL[batch.stage]}
          </>
        }
        actions={
          /* A closed run is a record. Moving its stage or sending its counter
             sheet to WhatsApp are things to do to a run that is still
             happening, and leaving them there is what made a finished run go
             on looking like work. */
          !batch.settled_at ? (
            <>
              <StagePicker
                batchId={batch.id}
                stage={batch.stage}
                action={setBatchStage}
                // Two parcels sharing a day land here, and "At the counter,
                // food being cooked" over two bags is a kitchen nobody is
                // standing in.
                parcel={batch.kind === "parcel"}
                // Standing at a counter on a phone, the next thing is to
                // finish the counter, and the bar at the bottom says so.
                // Two Tomatoes and neither of them reads as the answer.
                primary={stopShown === null}
              />
              <SendSheet
                batchId={batch.id}
                open={batch.status === "open" && batch.stage === "ordering"}
                closeRun={setBatchStage}
                href={whatsappTo(
                  settings.whatsapp_number || "0",
                  sheetAsText(sheet, batchLabel)
                )}
              />
            </>
          ) : null
        }
      />

      {/*
        Where the run has got to, read rather than set: the picker in the
        header is what moves it.

        Four parts, which is what both boards draw, and every one of the six
        real stages has a home in one of them, so the bar never names a step
        the run cannot be in. Driving belongs to the handout rather than to
        the buying: the food is bought by then, and the road is the first leg
        of giving it out. A phone gets the names alone, because four names
        and four numerals and four state lines across three hundred and
        ninety pixels is a wall; the desk gets the board's numeral and the
        line under it saying where each part stands.
      */}
      <ol
        aria-label="Where this run has got to"
        className="card mb-3.5 flex gap-0 overflow-hidden border-ink bg-ink p-0 sm:mb-[18px]"
      >
        {PHASES.map((phase, index) => {
          const settled = batch.settled_at !== null;
          // Settled is the end of it, so once the books are closed that is
          // the part the run is in whatever stage the food reached.
          const here = settled
            ? phase.stages.length === 0
            : phase.stages.includes(batch.stage);
          const past = settled
            ? phase.stages.length > 0
            : phase.stages.length > 0 &&
              stageIndex(phase.stages[phase.stages.length - 1]) <
                stageIndex(batch.stage);
          const said = here
            ? settled && phase.stages.length === 0
              ? `closed ${runDateLabel(batch.settled_at!.slice(0, 10))}`
              : "you are here"
            : index === 0
              ? `${past ? "closed" : "closes"} ${clockLabel(batch.cut_off_at)}`
              : past
                ? "done"
                : phase.stages.length === 0
                  ? "—"
                  : "not started";
          return (
            // On Ink, so the hairline between cells and the dim text of a
            // part you are not in are both the page's own paper let through,
            // rather than two greys with no name in the palette.
            <li
              key={phase.label}
              aria-current={here ? "step" : undefined}
              className={`flex-1 border-r border-paper/10 px-1 py-2 text-center lg:flex lg:items-center lg:gap-2.5 lg:px-4 lg:py-3 lg:text-left ${
                here
                  ? "bg-brand text-paper"
                  : past
                    ? "text-paper/70"
                    : "text-paper/45"
              }`}
            >
              <span
                className={`hidden size-[22px] shrink-0 place-items-center rounded-full font-mono text-xs lg:grid ${
                  here ? "bg-paper text-brand" : "bg-paper/15"
                }`}
              >
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[11.5px] font-bold lg:text-[14.5px]">
                  {batch.kind === "parcel" ? phase.parcel : phase.label}
                </span>
                <span className="hidden text-xs opacity-85 lg:block">{said}</span>
              </span>
            </li>
          );
        })}
      </ol>

      {batch.settled_at ? (
        <section className="card mb-4 border-mint bg-mint-tint">
          <h2 className="font-display text-[19px] font-black uppercase leading-none text-mint sm:text-[24px]">
            Closed on {runDateLabel(batch.settled_at.slice(0, 10))}
          </h2>
          <p className="mt-1.5 text-[13.5px] text-ink/80">
            {summary.paidCount} order{summary.paidCount === 1 ? "" : "s"},{" "}
            {naira(summary.gross)} in, {naira(summary.foodCost)} to the counters
            and {naira(summary.costs)} of costs. {naira(summary.profit)} left.
          </p>
          <form action={reopenRun} className="mt-3">
            <input type="hidden" name="batch_id" value={batch.id} />
            <ConfirmButton tone="admin" className={THUMB} confirm="Yes, open it again">
              Something was wrong, open it again
            </ConfirmButton>
          </form>
        </section>
      ) : (
        stageIndex(batch.stage) >= stageIndex("on_the_road") && (
          <div className="mb-4">
            <SettleRun
              open={stillOpen(sheet)}
              unpriced={notPriced(sheet)}
              untouched={
                summary.reconciled.lines === 0 && summary.reconciled.of > 0
              }
              action={settleRun}
              batchId={batch.id}
              // Nothing is left to move the run on to, so closing the books
              // is the thing to do next and carries the one Tomato button.
              primary={finished}
            />
          </div>
        )
      )}

      {/* The board's four, in its order: how many are coming, what the
          counters want, what is still to hand over, and what is left. Money
          collected is the line under the count rather than a tile of its own,
          because the count and the money are one question. */}
      {/* Two on a phone and the board's four from a tablet up.
          Still to spend and what is in are the two the phone board keeps,
          because at a counter the question is what is left to pay and
          whether the money for it is in hand. The other two are a desk's
          question, and both are a tab of their own on a phone: the count is
          under Unpaid and the profit is under Profit.

          `sm:contents` rather than a wrapper from the tablet up, so the tile
          goes back to being the grid's own child and the row of four lines
          up as it always did. */}
      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:gap-3.5 xl:grid-cols-4">
        <div className="hidden sm:contents">
          <Figure
            label="Paid orders"
            value={`${summary.paidCount}`}
            detail={`${naira(summary.gross)} collected${
              summary.unpaidCount > 0 ? ` · ${summary.unpaidCount} unpaid` : ""
            }`}
          />
          <Figure
            label="Pay at counters"
            value={naira(summary.foodCost)}
            detail={`${counter.length} stop${counter.length === 1 ? "" : "s"}${
              counter.length > 0 ? ` · ${doneStops} done` : ""
            }`}
          />
        </div>
        <Figure
          label="Still to spend"
          value={naira(stillToSpend)}
          detail={
            stillAt.length === 0
              ? "Every line on this run has a real figure against it"
              : stillAt.length > 2
                ? `${stillAt.slice(0, 2).join(", ")} and ${stillAt.length - 2} more`
                : stillAt.join(" and ")
          }
        />
        {/* The phone board's second tile: what is actually in, in mint,
            beside what is still to go out. On a desk it is the line under
            Paid orders instead, where the count and the money are one
            question. */}
        <div className="grid sm:hidden">
          <Figure
            label="Collected"
            value={naira(summary.gross)}
            tone="mint"
            detail={`${summary.paidCount} paid order${
              summary.paidCount === 1 ? "" : "s"
            }${summary.unpaidCount > 0 ? ` · ${summary.unpaidCount} unpaid` : ""}`}
          />
        </div>
        {/* Only a profit in hand is coloured. A loss in mint reads as money
            made, which is the one thing it is not. */}
        <div className="hidden sm:contents">
          <Figure
            label={finished ? "Profit" : "Profit if it ends here"}
            value={naira(summary.profit)}
            tone={summary.profit >= 0 ? "mint" : "ink"}
            detail={
              summary.costs > 0
                ? `After ${naira(summary.costs)} ${spentOn(batch)}`
                : "Fuel, transport and driver not entered yet"
            }
          />
        </div>
      </div>

      {/* A plain verdict while the run can still be called off. The numbers
          above are all there, but at cut off what is wanted is the answer, not
          the arithmetic. */}
      {batch.stage !== "handed_out" && likely !== null && (
        <p
          className={`soft mb-4 px-4 py-3 text-[14px] ${
            likely >= 0
              ? "border-mint bg-mint-tint text-mint"
              : "border-volt-line bg-brand-tint text-ink"
          }`}
        >
          <span className="font-bold">
            {likely >= 0
              ? `Worth driving: about ${naira(likely)} left over.`
              : `This run loses about ${naira(Math.abs(likely))}.`}
          </span>{" "}
          {naira(summary.gross)} paid in, {naira(summary.foodCost)} to the counters,
          and roughly {naira(usual!)} of fuel, transport and driver going by the
          last few runs.
          Put this run&apos;s real costs in under Profit and this becomes exact.
        </p>
      )}

      {/* Thin for the day it is on, while there is still time to say so in
          the group. Only against a real average of that weekday's own last
          few runs, and only while the run is still taking orders: after the
          cut-off this is a fact nobody can act on. */}
      {thin && (
        <div className="soft mb-4 border-volt-line bg-brand-tint px-4 py-3">
          <p className="text-[14px]">
            <span className="font-bold">This run is thin.</span>{" "}
            {naira(summary.gross)} in on {summary.paidCount} order
            {summary.paidCount === 1 ? "" : "s"}. The last {thin.days}{" "}
            {thin.weekday}s averaged {thin.orders}.
          </p>
          {settings.whatsapp_group_link ? (
            <a
              href={settings.whatsapp_group_link}
              target="_blank"
              rel="noopener noreferrer"
              className={`${ROW_ACTION} mt-2.5`}
            >
              Post it to the group
            </a>
          ) : (
            <Link href="/admin/settings" className={`${ROW_ACTION} mt-2.5`}>
              Add your group link
            </Link>
          )}
        </div>
      )}

      {short.length > 0 && (
        <Panel
          title="Shared deliveries waiting on money"
          detail="Everybody in one pays an even share of a single fee. When some of them never pay, their food does not travel, but the fee for what is left does not fall as fast as the heads do. Nobody can be asked for more after the fact, so this is a judgement: chase them, carry it, or refund the ones who paid."
          className="mb-4 space-y-3"
        >
          {short.map((one) => (
            <div key={one.groupId} className="soft p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-bold">{one.leader}&apos;s delivery</span>
                <span className="text-sm text-muted">
                  {one.paidPeople} of {one.people} paid
                </span>
              </div>
              {one.short > 0 ? (
                <p className="mt-1 text-sm">
                  You hold <span className="font-semibold">{naira(one.collected)}</span>{" "}
                  of delivery. What still travels is worth{" "}
                  <span className="font-semibold">{naira(one.needed)}</span>, so it is{" "}
                  <span className="font-bold text-brand">{naira(one.short)} short</span>.
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted">
                  The money in still covers what travels. Nothing to do but chase.
                </p>
              )}
              <ul className="mt-2 space-y-1 text-sm">
                {one.unpaid.map((who) => (
                  <li key={who.id} className="flex items-center justify-between gap-3">
                    <span>
                      {who.name}
                      <span className="text-muted"> · owes {naira(who.owed)}</span>
                    </span>
                    <span className="flex shrink-0 gap-2">
                      <a
                        href={`tel:${who.phone}`}
                        className={ROW_ACTION}
                      >
                        Call
                      </a>
                      <Link
                        href={`/admin/orders/${who.id}`}
                        className={ROW_ACTION}
                      >
                        Open →
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Panel>
      )}

      {losingMoney && (
        <p className="soft mb-4 border-volt-line bg-brand-tint px-4 py-3 text-[14px]">
          This run is {naira(Math.abs(summary.profit))} down after costs. Cancel
          and refund in full, or carry it and make it back on the next one.
        </p>
      )}

      <SheetBody settled={batch.settled_at !== null}>
      <SheetShape
        sections={[
          {
            id: "counter",
            label: "At the counter",
            badge: String(counter.length),
            content: (
              <>
                {shopped && (
                  <p className="soft border-mint bg-mint-tint px-4 py-3 text-[14px] font-semibold text-mint">
                    {finished
                      ? "This run is finished. The list is here for the record, and what you actually paid still goes in below."
                      : "The food is bought and on the road. The list is here for the record, and what you actually paid still goes in below."}
                  </p>
                )}

                {counter.length > 1 && !shopped && stopShown === null && (
                  <p className="soft px-4 py-3 text-[14px] text-muted">
                    Put the stops in the order you are driving them. Which one
                    is nearest depends on where you set off from and which
                    branch you are using, so it is yours to say rather than
                    ours to guess.
                  </p>
                )}

                {counter.length > 0 && (
                  <div
                    className={`flex flex-wrap items-baseline justify-between gap-2.5 ${
                      stopShown === null ? "" : "hidden lg:flex"
                    }`}
                  >
                    <h2 className="font-display text-[22px] font-black uppercase leading-none sm:text-[28px]">
                      Stop by stop
                    </h2>
                    <span className="hint">
                      {doneStops} of {counter.length} paid for · tap a stop
                      when you have paid for it. Ticks are yours alone.
                    </span>
                  </div>
                )}

                {/*
                  The phone's run screen: one card per stop, and the counter
                  itself is a screen you open.

                  A counter sheet is read over a counter with somebody
                  waiting, and all three stops on one phone screen is three
                  times the page and none of it at arm's length. The desk has
                  the width for the lot, so from the rail up this list goes
                  and the stops themselves are all open below.
                */}
                {counter.length > 1 && stopShown === null && (
                  <ul className="space-y-2.5 lg:hidden">
                    {counter.map((group, index) => {
                      const done = shopped || paidFor(group);
                      const here = ordersAt.get(group.restaurant) ?? [];
                      return (
                        <li key={`stop-${group.restaurant}`}>
                          <Link
                            href={`/admin/batch/${batch.id}?stop=${index + 1}`}
                            className={`card flex items-center gap-2.5 p-3.5 ${
                              done ? "opacity-60" : ""
                            }`}
                          >
                            <span
                              aria-hidden
                              className={`tick size-8 rounded-full text-base font-black ${
                                done ? "tick-done" : ""
                              }`}
                            >
                              {done ? "✓" : ""}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[15.5px] font-bold">
                                  {group.restaurant}
                                </span>
                                {done && (
                                  <span className="tag bg-mint-tint text-mint">
                                    paid for
                                  </span>
                                )}
                              </span>
                              <span className="hint block">
                                {here.length > 0 &&
                                  `${here.length} order${here.length === 1 ? "" : "s"} · `}
                                {group.lines.length} line
                                {group.lines.length === 1 ? "" : "s"}
                              </span>
                            </span>
                            <span className="font-display text-[25px] font-black leading-none">
                              {naira(group.expectedFoodTotal)}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* One Tomato per screen, and on this page it is already
                    spent: the picker in the header carries "move the run
                    on". So the way into the first counter is an outline,
                    full width where the board draws it. */}
                {counter.length > 1 && stopShown === null && (
                  <Link
                    href={`/admin/batch/${batch.id}?stop=${
                      (counter.findIndex((group) => !paidFor(group)) + 1) || 1
                    }`}
                    className="btn-admin min-h-[52px] w-full text-[16px] lg:hidden"
                  >
                    Open the counter sheet →
                  </Link>
                )}

                {counter.map((group, index) => (
                  <section
                    key={group.restaurant}
                    className={`card p-3.5 sm:p-5 ${
                      // One counter at a time on a phone. Every stop is here
                      // either way, so nothing is built twice: the others are
                      // a tap away, and from the rail up they are all open.
                      counter.length <= 1 || stopShown === index + 1
                        ? ""
                        : "hidden lg:block"
                    }`}
                  >
                    {counter.length > 1 && stopShown === index + 1 && (
                      <Link
                        href={`/admin/batch/${batch.id}`}
                        className="mb-1.5 block text-[12.5px] font-semibold text-muted lg:hidden"
                      >
                        ← All {counter.length} stops ·{" "}
                        {naira(summary.foodCost)} to pay
                      </Link>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="min-w-0">
                        <span className="ticket block text-muted">
                          Stop {index + 1} of {counter.length}
                        </span>
                        <span className="block font-display text-[28px] font-black uppercase leading-[0.95] lg:font-sans lg:text-[19px] lg:font-bold lg:normal-case">
                          {group.restaurant}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-1.5">
                          {(shopped || paidFor(group)) && (
                            <span className="tag bg-mint-tint text-mint">paid for</span>
                          )}
                          <span className="hint">
                            {(ordersAt.get(group.restaurant) ?? []).length} order
                            {(ordersAt.get(group.restaurant) ?? []).length === 1
                              ? ""
                              : "s"}{" "}
                            to collect
                          </span>
                        </span>
                      </h3>
                      {/* The phone board puts what this counter wants on an
                          Ink card of its own, because it is the one figure
                          you read at arm's length with a till waiting. On a
                          desk it is the right-hand corner of the row. */}
                      <span className="card w-full border-ink bg-ink px-3.5 py-3 text-paper lg:hidden">
                        <span className="ticket block text-paper/60">
                          Pay at this counter
                        </span>
                        <span className="block font-display text-[40px] font-black leading-none">
                          {naira(group.expectedFoodTotal)}
                        </span>
                        <span className="mt-0.5 block text-[12.5px] text-paper/80">
                          Carrying {naira(summary.foodCost)} in total today
                        </span>
                      </span>
                      <span className="hidden shrink-0 text-right lg:block">
                        <span className="ticket block text-muted">Pay here</span>
                        <span className="font-display text-[30px] font-black leading-none">
                          {naira(group.expectedFoodTotal)}
                        </span>
                      </span>
                      {/* Only worth arranging when there is more than one,
                          and not once the food is bought: the route is a
                          plan, and a plan after the fact is clutter. */}
                      {counter.length > 1 && !shopped && (
                        <Reorder
                          action={moveStop}
                          field="restaurant"
                          id={group.restaurant}
                          first={index === 0}
                          last={index === counter.length - 1}
                          label={group.restaurant}
                          extra={{
                            batch_id: batch.id,
                            // The order on screen, so the arrow moves what
                            // the eye is looking at even before anybody has
                            // arranged this run.
                            stops: counter.map((one) => one.restaurant).join("\n"),
                          }}
                        />
                      )}
                    </div>
                    <div className="mt-2">
                      <Checklist
                        id={`counter-${batch.id}-${group.restaurant}`}
                        label="bought"
                        done={shopped}
                        items={group.lines.map((line) => ({
                          key: `${line.name}|${line.choices.join("|")}`,
                          lead: `${line.qty}×`,
                          text: line.name,
                          // The each-price, said as the menu, because it is
                          // the figure to argue with at the counter when the
                          // till asks for something else.
                          detail: [
                            line.choices.join(", "),
                            `menu ${naira(line.unitPrice)} ea`,
                          ]
                            .filter((part) => part !== "")
                            .join(" · "),
                        }))}
                      />
                    </div>

                    {/*
                      Who the food at this counter is for.

                      Read while the bags are coming over: the totals above
                      are what gets said to the till, and this is how they
                      split back out. Read only on purpose. The ticks are the
                      item lines above, and a second list of boxes for the
                      same purchase is the same list kept twice, where the
                      one that matters is whichever nobody updated.
                    */}
                    {(ordersAt.get(group.restaurant) ?? []).length > 0 && (
                      <div className="mt-3 border-t-[1.5px] border-ink pt-2">
                        <p className="ticket text-muted">Orders to collect here</p>
                        <ul>
                          {(ordersAt.get(group.restaurant) ?? []).map((order) => (
                            <li
                              key={`${group.restaurant}-${order.id}`}
                              className="flex items-center gap-2.5 border-t-[1.5px] border-rule py-2.5"
                            >
                              <span className="min-w-0 flex-1">
                                <Link
                                  href={`/admin/orders/${order.id}`}
                                  className="block text-[14.5px] font-semibold hover:text-brand"
                                >
                                  {order.ref} {order.who} · {order.hostel}
                                </Link>
                                <span className="hint block">{order.items}</span>
                              </span>
                              <span className="shrink-0 font-mono text-sm font-semibold">
                                {naira(order.amount)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* What is left after this one, on the phone's counter
                        screen. On a desk the next stop is the next card down,
                        so there is nothing to say. */}
                    {counter.length > 1 && stopShown === index + 1 && (
                      <div className="mt-3 border-t-[1.5px] border-ink pt-2 lg:hidden">
                        <p className="ticket text-muted">Still to go</p>
                        <ul>
                          {counter
                            .map((one, at) => ({ one, at }))
                            .filter(({ at }) => at !== index)
                            .map(({ one, at }) => {
                              const done = shopped || paidFor(one);
                              return (
                                <li key={`togo-${one.restaurant}`}>
                                  <Link
                                    href={`/admin/batch/${batch.id}?stop=${at + 1}`}
                                    className={`flex items-center gap-2.5 border-t-[1.5px] border-rule py-2.5 ${
                                      done ? "opacity-60" : ""
                                    }`}
                                  >
                                    <span
                                      aria-hidden
                                      className={`tick size-[26px] text-[13px] font-black ${
                                        done ? "tick-done" : ""
                                      }`}
                                    >
                                      {done ? "✓" : ""}
                                    </span>
                                    <span className="min-w-0 flex-1 text-[14px] font-bold">
                                      {one.restaurant}
                                      {done && (
                                        <span className="tag ml-1.5 bg-mint-tint text-mint">
                                          paid for
                                        </span>
                                      )}
                                    </span>
                                    <span className="shrink-0 font-mono text-[13.5px] font-semibold">
                                      {naira(one.expectedFoodTotal)}
                                    </span>
                                  </Link>
                                </li>
                              );
                            })}
                        </ul>
                      </div>
                    )}
                  </section>
                ))}
                <Panel
                  title="What you pay, stop by stop"
                  detail="Paid orders only. This is the money that leaves your hand at each restaurant. Tick things off as you buy them; the ticks are yours alone and change nothing."
                  className={stopShown === null ? "" : "hidden lg:block"}
                >
                  <ul className="mt-2 text-[14.5px]">
                    {counter.map((group) => (
                      <li
                        key={group.restaurant}
                        className="flex justify-between gap-3 border-t-[1.5px] border-rule py-2"
                      >
                        <span>{group.restaurant}</span>
                        <span className="font-mono font-semibold">
                          {naira(group.expectedFoodTotal)}
                        </span>
                      </li>
                    ))}
                    {counter.length === 0 && (
                      <li className="border-t-[1.5px] border-rule py-2 text-muted">
                        Nothing paid for yet.
                      </li>
                    )}
                    <li className="flex items-center justify-between gap-3 border-t-[1.5px] border-ink pt-2.5">
                      <span className="ticket text-muted">
                        {counter.length} stop{counter.length === 1 ? "" : "s"}
                      </span>
                      <span className="font-display text-[25px] font-black leading-none sm:text-[34px]">
                        {naira(summary.foodCost)}
                      </span>
                    </li>
                  </ul>
                </Panel>

                {counter.length > 0 && (
                  <details className="card p-3.5 sm:p-5">
                    <summary className="cursor-pointer font-display text-[22px] font-black uppercase leading-none text-brand">
                      What it actually cost
                    </summary>
                    <p className="mt-1.5 text-[12.5px] text-muted">
                      Only the ones that were different. Most of a run is
                      exactly the menu price, so nothing is listed until you
                      say otherwise.
                    </p>
                    <div className="mt-3 space-y-3">
                    {/* The books for the run, once anything has been typed:
                        what the menu said against what the counters took, so
                        the end of the day is one line rather than a scroll
                        back through every item. */}
                    {summary.reconciled.lines > 0 && (
                      <div className="soft bg-shell p-3">
                        <p className="text-sm">
                          <span className="font-bold">
                            {summary.reconciled.lines} of {summary.reconciled.of}
                          </span>{" "}
                          {summary.reconciled.lines === 1 ? "line" : "lines"} put
                          in. The menu said{" "}
                          <span className="font-bold">{naira(summary.reconciled.menu)}</span>{" "}
                          for them and you handed over{" "}
                          <span className="font-bold">{naira(summary.reconciled.paid)}</span>
                          {summary.reconciled.recovered > 0 && (
                            <>
                              , with {naira(summary.reconciled.recovered)} back from
                              customers
                            </>
                          )}
                          .
                        </p>
                        {(() => {
                          const out =
                            summary.reconciled.paid -
                            summary.reconciled.recovered -
                            summary.reconciled.menu;
                          return (
                            <p
                              className={`mt-1 text-sm font-bold ${
                                out <= 0 ? "text-mint" : "text-brand"
                              }`}
                            >
                              {out === 0
                                ? "Level with the menu so far."
                                : out < 0
                                  ? `${naira(Math.abs(out))} better than the menu, straight onto the profit.`
                                  : `${naira(out)} worse than the menu, straight off the profit.`}
                            </p>
                          );
                        })()}
                        <p className="mt-1 text-xs text-muted">
                          Everything not listed here stays at the menu price, so
                          this is honest even half done. The run&apos;s profit
                          above already counts it.
                        </p>
                      </div>
                    )}

                    {/* What has already been said, so it can be corrected or
                        put back without hunting for it. */}
                    {counter.flatMap((group) =>
                      group.lines
                        .filter((line) => line.paid !== null)
                        .map((line) => (
                          <form
                            key={`fixed-${line.key}`}
                            action={setCounterSpend}
                            className="soft flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                          >
                            <input type="hidden" name="batch_id" value={batch.id} />
                            <input type="hidden" name="line_key" value={line.key} />
                            <span className="min-w-0 text-sm">
                              <span className="font-semibold">
                                {line.qty}× {line.name}
                              </span>
                              <span className="block text-xs text-muted">
                                {group.restaurant} · menu says{" "}
                                {naira(line.qty * line.unitPrice)}
                              </span>
                            </span>
                            <span className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
                              <input
                                name="paid"
                                inputMode="numeric"
                                defaultValue={line.paid ?? ""}
                                aria-label={`What you paid for ${line.name}`}
                                className="field field-admin w-24 min-h-[44px] text-sm sm:min-h-[42px]"
                              />
                              {/* Only where the gap is big enough to have been
                                  worth asking about. Nobody chases two hundred
                                  naira, and offering the box invites a figure
                                  that was never collected. */}
                              {(line.paid ?? 0) > line.qty * line.unitPrice && (
                                <input
                                  name="recovered"
                                  inputMode="numeric"
                                  defaultValue={line.recovered || ""}
                                  placeholder="they paid back"
                                  aria-label={`What the customer gave back for ${line.name}`}
                                  className="field field-admin w-32 min-h-[44px] text-sm sm:min-h-[42px]"
                                />
                              )}
                              {(line.paid ?? 0) <= line.qty * line.unitPrice && (
                                <input type="hidden" name="recovered" value={line.recovered || ""} />
                              )}
                              {line.paid !== line.qty * line.unitPrice && (
                                <span
                                  className={`text-xs font-bold ${
                                    (line.paid ?? 0) < line.qty * line.unitPrice
                                      ? "text-mint"
                                      : "text-brand-dark"
                                  }`}
                                >
                                  {(line.paid ?? 0) < line.qty * line.unitPrice ? "+" : "−"}
                                  {naira(
                                    Math.abs(
                                      line.qty * line.unitPrice -
                                        ((line.paid ?? 0) - line.recovered)
                                    )
                                  )}
                                </span>
                              )}
                              <SaveButton look={ROW_ACTION}>
                                Save
                              </SaveButton>
                            </span>
                          </form>
                        ))
                    )}

                    {/* Paid more than the menu says, on something whose price
                        has probably just gone up. Offered rather than done:
                        the figure came from a phone at a counter, and a
                        slipped digit must not raise a price nobody meant to
                        raise. Nothing is offered when it came in under,
                        because that is usually a promo and following it down
                        would cut the shop's price on one afternoon. */}
                    {counter.flatMap((group) =>
                      group.lines
                        .filter(
                          (line) =>
                            line.paid !== null && line.paid > line.qty * line.menuPrice
                        )
                        .map((line) => {
                          const upBy = Math.ceil(
                            ((line.paid ?? 0) - line.qty * line.menuPrice) / line.qty
                          );
                          return (
                            <form
                              key={`raise-${line.key}`}
                              action={raiseMenuPrice}
                              className="soft flex flex-wrap items-center justify-between gap-2 border-volt-line bg-brand-tint px-3 py-2"
                            >
                              <input type="hidden" name="item_id" value={line.itemId} />
                              <input type="hidden" name="by" value={upBy} />
                              <span className="min-w-0 text-sm text-ink/80">
                                <span className="font-semibold">{line.name}</span> cost{" "}
                                {naira(upBy)} more each than the menu says
                                {line.menuPrice !== line.unitPrice
                                  ? ` now (${naira(line.menuPrice)})`
                                  : ""}
                                . Put the menu up to{" "}
                                {naira(line.menuPrice + upBy)}?
                              </span>
                              <SaveButton look={ROW_ACTION}>
                                Put it up
                              </SaveButton>
                            </form>
                          );
                        })
                    )}

                    {/* One at a time, because one is what usually changed, and
                        only the ones still at the menu price: a line already
                        priced is edited in its own row above, so offering it
                        here again was offering to do what was done. */}
                    {counter.some((group) => group.lines.some((line) => line.paid === null)) && (
                    <form
                      action={setCounterSpend}
                      className="flex flex-col gap-2 border-t-[1.5px] border-rule pt-3 sm:flex-row sm:flex-wrap sm:items-end"
                    >
                      <input type="hidden" name="batch_id" value={batch.id} />
                      <div className="min-w-0 sm:flex-1">
                        <label className="label" htmlFor="line_key">
                          Which one was different?
                        </label>
                        <select id="line_key" name="line_key" className="field field-admin min-h-[44px] sm:min-h-[42px]">
                          {counter
                            .map((group) => ({
                              ...group,
                              lines: group.lines.filter((line) => line.paid === null),
                            }))
                            .filter((group) => group.lines.length > 0)
                            .map((group) => (
                            <optgroup key={group.restaurant} label={group.restaurant}>
                              {group.lines.map((line) => (
                                <option key={line.key} value={line.key}>
                                  {line.qty}× {line.name}
                                  {line.choices.length > 0 && ` (${line.choices.join(", ")})`}
                                  {" · menu "}
                                  {naira(line.qty * line.unitPrice)}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label" htmlFor="paid">
                          What you paid
                        </label>
                        <input
                          id="paid"
                          name="paid"
                          inputMode="numeric"
                          placeholder="0"
                          className="field field-admin w-full min-h-[44px] sm:min-h-[42px] sm:w-32"
                        />
                        <input type="hidden" name="recovered" value="" />
                      </div>
                      <SaveButton look={ROW_ACTION} className="w-full sm:w-auto">
                        Add
                      </SaveButton>
                    </form>
                    )}

                    <p className="text-xs text-muted">
                      This only moves the profit on this run. Nothing a customer
                      sees changes, and nobody is charged anything different.
                      Clearing a figure puts that line back to the menu price.
                    </p>
                    </div>
                  </details>
                )}

                {/* The board's phone bar: the one thing this screen is for,
                    where the thumb already is. Inside the counter's own tab,
                    so picking another tab takes the bar with it. */}
                {stopShown !== null && (
                  <div className="phone-bar">
                    <Link
                      href={
                        stopShown < counter.length
                          ? `/admin/batch/${batch.id}?stop=${stopShown + 1}`
                          : `/admin/batch/${batch.id}`
                      }
                      className="btn-admin btn-admin-go min-h-[52px] w-full text-[16px]"
                    >
                      {stopShown < counter.length
                        ? "Counter done · next stop →"
                        : "Last counter · back to the stops →"}
                    </Link>
                  </div>
                )}

                {batch.kind === "same_day" && batch.stage === "ordering" && (
                  <Panel
                    title="Move this car"
                    detail="Ring them, ask whether another window suits, and put it here. A car moved into a window somebody else already asked for becomes one trip with theirs, which is one walk to the counter instead of two. Nobody is told by this: the agreement happened on the phone."
                    className="space-y-3"
                  >
                    <form
                      action={moveSameDayCar}
                      className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
                    >
                      <input type="hidden" name="batch_id" value={batch.id} />
                      <div className="min-w-0 sm:flex-1">
                        <label className="label" htmlFor="deliver_at">
                          Which window instead?
                        </label>
                        <select id="deliver_at" name="deliver_at" className="field field-admin min-h-[44px] sm:min-h-[42px]">
                          {windows.map((slot) => (
                            <option key={slot.at} value={slot.at}>
                              {slot.label}
                              {slot.at === batch.deliver_at && " · where it is now"}
                            </option>
                          ))}
                        </select>
                      </div>
                      <SaveButton look={ROW_ACTION} className="w-full sm:w-auto">
                        Move it
                      </SaveButton>
                    </form>
                    {windows.length === 0 && (
                      <p className="text-sm text-muted">
                        Nothing else can be reached today.
                      </p>
                    )}
                  </Panel>
                )}

              </>
            ),
          },
          {
            id: "handout",
            label: "Handout",
            badge: String(handout.length),
            column: "rail",
            content: (
              <>
                <Panel
                  title="One bag per name"
                  detail={`Anything added later in the week is already merged in. Mark each one delivered as you hand it over: that is the tick, and the customer sees it on their own page. Setting the run itself to "Delivered, every bag" at the top does all of them at once.`}
                  className="space-y-2"
                >
                  {handout.length > 0 && finished && (
                    <p className="soft border-mint bg-mint-tint px-4 py-3 text-[14px] font-semibold text-mint">
                      Every bag on this run is marked delivered.
                    </p>
                  )}
                  {handout.length > 0 && !finished && (
                    <form action={setBagDelivered} className="pb-1">
                      <input
                        type="hidden"
                        name="order_ids"
                        value={handout.flatMap((bag) => bag.orders.map((o) => o.id)).join(",")}
                      />
                      <input type="hidden" name="delivered" value="true" />
                      <ConfirmButton
                        tone="admin"
                        className={THUMB}
                        confirm={`Yes, all ${handout.length} handed over`}
                      >
                        Mark every bag delivered
                      </ConfirmButton>
                    </form>
                  )}
                  <HandoutList
                    setDelivered={setBagDelivered}
                    refund={refundOrder}
                    entries={handout.map((bag) => ({
                      id: bag.key,
                      name: bag.name,
                      hostel: bag.hostel,
                      phone: formatPhone(bag.phone),
                      orders: bag.orders.map((order) => ({
                        id: order.id,
                        ref: refFor(order),
                        status: order.status,
                        total: naira(order.total),
                        message: messageFor(order),
                      })),
                      // A bag one person carries for a group still needs each
                      // item labelled, or they cannot hand them out.
                      // The restaurant is part of the item: a Margherita could
                      // have come from Domino's or Panarottis, and at the gate
                      // that is the only thing that tells the bags apart.
                      items: bag.lines.map(
                        (l) =>
                          `${l.qty}× ${l.name}` +
                          (l.choices.length > 0 ? ` (${l.choices.join(", ")})` : "") +
                          ` · ${l.restaurant}` +
                          (l.for_name && l.for_name !== bag.name
                            ? ` · for ${l.for_name}`
                            : "")
                      ),
                    }))}
                  />
                </Panel>

              </>
            ),
          },
          {
            id: "unpaid",
            label: "Unpaid",
            badge: String(unpaid.length),
            column: "rail",
            content: (
              <Panel
                title="These do not travel"
                detail="Chase them before the cut-off, or they simply drop out."
                className="space-y-3"
              >
                {unpaid.length === 0 ? (
                  <p className="text-sm text-muted">None. Everything is paid for.</p>
                ) : (
                  <ul className="space-y-3">
                    {unpaid.map((order) => (
                      <li key={order.id} className="soft p-3">
                        <p className="font-semibold">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="text-muted hover:text-brand"
                          >
                            {refFor(order)}
                          </Link>{" "}
                          {order.for_name ?? order.customer_name} · {naira(order.total)}
                          {/* A label saying what this order is, so it is the
                              tinted tag the board draws rather than a filled
                              pill that reads as something to press. */}
                          <span
                            className={`tag ml-2 ${
                              order.payment_method === "card"
                                ? "bg-brand-wash text-brand-dark"
                                : "bg-wash text-ink"
                            }`}
                          >
                            {order.payment_method === "card"
                              ? "wants a card link"
                              : "paying by transfer"}
                          </span>
                          {order.for_name && order.group_id && (
                            <span className="font-normal text-muted">
                              {" "}· one part of {order.customer_name}&apos;s group
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-muted">
                          {formatPhone(order.customer_phone)} · {order.hostel} ·
                          narration {narration(order)}
                        </p>
                        <p className="mt-1 text-sm">
                          {order.lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className={ROW_ACTION}
                          >
                            View order →
                          </Link>
                          <a
                            href={messageFor(order)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={ROW_ACTION}
                          >
                            Send payment details on WhatsApp
                          </a>
                        </div>
                        <form
                          action={markPaid}
                          className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center"
                        >
                          <input type="hidden" name="order_id" value={order.id} />
                          <input
                            name="payment_ref"
                            placeholder={`Transfer ref (they should send ${narration(order)})`}
                            className="field field-admin min-h-[44px] text-sm sm:min-h-[42px]"
                          />
                          <ConfirmButton
                            tone="admin"
                            className={`${THUMB} shrink-0`}
                            confirm={`Yes, ${naira(order.total)} received`}
                          >
                            Mark paid
                          </ConfirmButton>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            ),
          },
          {
            id: "money",
            label: "Profit",
            column: "rail",
            content: (
              <>
                <Panel title="Profit on this run" className="space-y-2">
                  <dl className="mt-2 space-y-1 text-[14.5px]">
                    <Row label="Collected from customers" value={naira(summary.gross)} />
                    {counter.map((group) => (
                      <Row
                        key={group.restaurant}
                        label={`Pay at ${group.restaurant}`}
                        value={`−${naira(group.expectedFoodTotal)}`}
                      />
                    ))}
                    {/* One line per promoter, named. "Promoter commission
                        owed, ₦500" with nobody against it is not something
                        anybody can check, and for a while it was charging
                        every run for orders nobody had introduced. */}
                    {summary.commissionBy.length === 0 ? (
                      <Row label="Promoter commission owed" value="—" />
                    ) : (
                      summary.commissionBy.map((one) => (
                        <Row
                          key={one.code}
                          label={`${one.name} · ${one.orders} ${
                            one.orders === 1 ? "order" : "orders"
                          }`}
                          value={`−${naira(one.amount)}`}
                        />
                      ))
                    )}
                    {summary.reconciled.lines === 0 &&
                      batch.food_spend > 0 &&
                      batch.food_spend < summary.menuCost && (
                        <Row
                          label="Bought under the menu price"
                          value={`+${naira(summary.menuCost - batch.food_spend)}`}
                        />
                      )}
                    {summary.reconciled.lines > 0 && summary.foodCost !== summary.menuCost && (
                      <Row
                        label={
                          summary.foodCost < summary.menuCost
                            ? "Bought under the menu price"
                            : "Cost over the menu price"
                        }
                        value={`${summary.foodCost < summary.menuCost ? "+" : "−"}${naira(
                          Math.abs(summary.menuCost - summary.foodCost)
                        )}`}
                      />
                    )}
                    {batch.fuel_cost > 0 && (
                      <Row label="Fuel" value={`−${naira(batch.fuel_cost)}`} />
                    )}
                    {batch.transport_cost > 0 && (
                      <Row label="Transport" value={`−${naira(batch.transport_cost)}`} />
                    )}
                    {batch.driver_cost > 0 && (
                      <Row label="Driver" value={`−${naira(batch.driver_cost)}`} />
                    )}
                    {batch.other_cost > 0 && (
                      <Row
                        label={batch.cost_note || "Anything else"}
                        value={`−${naira(batch.other_cost)}`}
                      />
                    )}
                  </dl>
                  <p
                    className={`border-t-[1.5px] border-ink pt-3 font-display text-[40px] font-black leading-[1.05] ${
                      summary.profit >= 0 ? "text-mint" : "text-brand"
                    }`}
                  >
                    {naira(summary.profit)}
                  </p>
                  <p className="text-[12.5px] text-muted">
                    {summary.costs === 0
                      ? "Fuel and driver are not in this yet. Put them in below and this becomes the real number."
                      : `After ${naira(summary.costs)} of fuel, driver and anything else.`}
                  </p>
                </Panel>

                <Panel
                  title="What this run cost you"
                  detail="Fill these in on the night. They come straight off the profit above, and off this run in the dashboard. What the food cost is not here: it is priced at the counter, item by item, under At the counter."
                  className="space-y-3"
                >

                  {/* A run reconciled the old way, with one figure for the
                      whole shop. It still counts, and this is the way out of
                      it and onto the counter prices. */}
                  {batch.food_spend > 0 && summary.reconciled.lines === 0 && (
                    <form
                      action={setRunCosts}
                      className="soft flex flex-wrap items-center justify-between gap-2 bg-shell px-3 py-2"
                    >
                      <input type="hidden" name="batch_id" value={batch.id} />
                      <input type="hidden" name="fuel_cost" value={batch.fuel_cost || ""} />
                      <input type="hidden" name="driver_cost" value={batch.driver_cost || ""} />
                      <input
                        type="hidden"
                        name="transport_cost"
                        value={batch.transport_cost || ""}
                      />
                      <input type="hidden" name="other_cost" value={batch.other_cost || ""} />
                      <input type="hidden" name="cost_note" value={batch.cost_note || ""} />
                      <input type="hidden" name="food_spend" value="" />
                      <span className="text-sm">
                        The food on this run was put in as one figure,{" "}
                        <span className="font-bold">{naira(batch.food_spend)}</span>
                        {" "}for the whole shop.
                      </span>
                      <ConfirmButton
                        tone="bad"
                        className={THUMB}
                        confirm="Yes, back to menu prices"
                      >
                        Clear it
                      </ConfirmButton>
                    </form>
                  )}
                  <form action={setRunCosts} className="space-y-3">
                    <input type="hidden" name="batch_id" value={batch.id} />
                    {/* Three across on a tablet, one in the rail: from the
                        rail up this panel is a column beside the stops, and
                        three money boxes in a rail is three boxes nobody can
                        read the labels of. */}
                    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                      <div>
                        <label className="label" htmlFor="fuel_cost">Fuel</label>
                        <input
                          id="fuel_cost"
                          name="fuel_cost"
                          inputMode="numeric"
                          defaultValue={batch.fuel_cost || ""}
                          placeholder="0"
                          className="field"
                        />
                      </div>
                      <div>
                        <label className="label" htmlFor="transport_cost">
                          Transport
                        </label>
                        <input
                          id="transport_cost"
                          name="transport_cost"
                          inputMode="numeric"
                          defaultValue={batch.transport_cost || ""}
                          placeholder="0"
                          className="field"
                        />
                        <p className="mt-1 text-xs text-muted">
                          Keke, bike, a car for the bags.
                        </p>
                      </div>
                      <div>
                        <label className="label" htmlFor="driver_cost">Driver</label>
                        <input
                          id="driver_cost"
                          name="driver_cost"
                          inputMode="numeric"
                          defaultValue={batch.driver_cost || ""}
                          placeholder="0"
                          className="field"
                        />
                      </div>
                      <div>
                        <label className="label" htmlFor="other_cost">Anything else</label>
                        <input
                          id="other_cost"
                          name="other_cost"
                          inputMode="numeric"
                          defaultValue={batch.other_cost || ""}
                          placeholder="0"
                          className="field"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label" htmlFor="cost_note">
                        What that other money went on
                      </label>
                      <input
                        id="cost_note"
                        name="cost_note"
                        defaultValue={batch.cost_note}
                        placeholder="Bags, gate fee, airtime"
                        className="field"
                      />
                    </div>
                    <SaveButton look={ROW_ACTION}>Save costs</SaveButton>
                  </form>
                </Panel>

                <ShortGroups groups={groupsShort} />

                {refunds.length > 0 && (
                  <Panel
                    title="Refunds owed"
                    detail="A group shrank when unpaid shares dropped out, so its delivery fee fell a band. Send these back tonight."
                    className="space-y-2"
                  >
                    <ul className="mt-2 text-[14.5px]">
                      {refunds.map((order) => (
                        <li
                          key={order.id}
                          className="flex justify-between gap-3 border-t-[1.5px] border-rule py-2"
                        >
                          <span>
                            {order.for_name ?? order.customer_name} ·{" "}
                            {formatPhone(order.customer_phone)}
                          </span>
                          <span className="font-semibold">
                            {naira(order.refund_owed)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Panel>
                )}
              </>
            ),
          },
          {
            id: "controls",
            label: "Controls",
            content: (
              <>
                <Panel
                  title="Where the food is"
                  detail={`The same stages as the dropdown at the top of this page. Everyone in this run sees the stage on their order page, and the run closes to new orders by itself the moment you leave "Ordering".`}
                  className="space-y-3"
                >
                  <div className="flex flex-wrap gap-2">
                    {STAGES.filter((stage) => stage !== "ordering").map((stage) => (
                      <form action={setBatchStage} key={stage}>
                        <input type="hidden" name="batch_id" value={batch.id} />
                        <input type="hidden" name="stage" value={stage} />
                        <ActionButton
                          className={`${ROW_ACTION} ${
                            batch.stage === stage ? "bg-ink text-shell" : ""
                          }`}
                          done="Set ✓"
                        >
                          {STAGE_ACTION[stage]}
                        </ActionButton>
                      </form>
                    ))}
                  </div>
                </Panel>

                <section className="card space-y-3 p-3.5 sm:p-5">
                  <form action={updateRun} className="space-y-3">
                    <input type="hidden" name="batch_id" value={batch.id} />
                    <div>
                      <h2 className="font-display text-[21px] font-black uppercase leading-none sm:text-[26px]">
                        This run
                      </h2>
                      <p className="mt-1 text-[12.5px] text-muted">
                        {empty
                          ? "Nobody has ordered into it yet, so everything about it can still change."
                          : "It has orders on it, so the day and the slot are fixed. The window and the cut-off can still move."}
                      </p>
                    </div>

                    {areas.length > 0 && (
                      <div className="soft space-y-2 bg-shell p-3">
                        <input type="hidden" name="areas_set" value="1" />
                        <p className="label mb-0">
                          Where this {batch.kind === "skincare" ? "drop" : "car"} goes
                        </p>
                        <p className="text-xs text-muted">
                          It always passes Sangotedo. Tick anywhere else it is
                          going, and those restaurants can be ordered onto it.
                          Left unticked, an order from there cannot pick this
                          run, which is the point: a car that was never going
                          to Lekki cannot fetch from Lekki.
                        </p>
                        {areas.map((one) => (
                          <label key={one.id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              name="area"
                              value={one.id}
                              defaultChecked={areasOfRun(batch.areas ?? "").includes(one.id)}
                            />
                            {one.name}
                          </label>
                        ))}
                      </div>
                    )}

                    {/* Runs only. A car of its own is fetching for one
                        person, wherever they asked, and the skincare drop is
                        its own shop. */}
                    {batch.kind === "run" && counters.length > 0 && (
                      <div className="soft space-y-2 bg-shell p-3">
                        <input type="hidden" name="places_set" value="1" />
                        <p className="label mb-0">Which counters it stops at</p>
                        <p className="text-xs text-muted">
                          Leave every box empty and it fetches from anywhere,
                          which is what a run normally is. Tick one or two to
                          make this a run for those counters only: nobody can
                          put anything else on it, and a cart with other food
                          in it is offered the next run that does stop there.
                        </p>
                        <div className="grid gap-1 sm:grid-cols-2">
                          {counters.map((one) => (
                            <label key={one.id} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                name="place"
                                value={one.id}
                                defaultChecked={placesOfRun(batch.only_places ?? "").includes(one.id)}
                              />
                              {one.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {empty && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="label" htmlFor="run_date">Day</label>
                          <input
                            id="run_date"
                            name="run_date"
                            type="date"
                            defaultValue={batch.run_date}
                            className="field"
                          />
                        </div>
                        <div>
                          <label className="label" htmlFor="slot">Which run</label>
                          <select
                            id="slot"
                            name="slot"
                            defaultValue={batch.slot}
                            className="field"
                          >
                            <option value="afternoon">Afternoon</option>
                            <option value="night">Night</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Two times rather than a sentence, so this run's hours
                        can be compared with a same day window rather than
                        read out of prose. What the customer is told is built
                        from them. */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                      <div className="sm:grow">
                        <p className="label">This run arrives between</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            name="window_from"
                            aria-label="Earliest this run arrives"
                            defaultValue={windowValues(batch.delivery_window_text).from}
                            className="field"
                          />
                          <span className="text-sm text-muted">and</span>
                          <input
                            type="time"
                            name="window_to"
                            aria-label="Latest this run arrives"
                            defaultValue={windowValues(batch.delivery_window_text).to}
                            className="field"
                          />
                        </div>
                        <p className="mt-1 text-xs text-muted">
                          Now: {batch.delivery_window_text || "nothing set"}. Leave both
                          empty to keep it as it is.
                        </p>
                      </div>
                      <div className="sm:w-36">
                        <label className="label" htmlFor="cut_off_time">
                          Orders close
                        </label>
                        <input
                          id="cut_off_time"
                          name="cut_off_time"
                          type="time"
                          defaultValue={clockValue(batch.cut_off_at)}
                          className="field"
                        />
                      </div>
                      <SaveButton look={ROW_ACTION} className="w-full sm:w-auto sm:shrink-0">
                        Save
                      </SaveButton>
                    </div>
                  </form>
                </section>

                <section className="card space-y-3 p-3.5 sm:p-5">
                  <form action={setFlashFee} className="space-y-2">
                    <input type="hidden" name="batch_id" value={batch.id} />
                    <h2 className="font-display text-[21px] font-black uppercase leading-none sm:text-[26px]">
                      Flash fee drop
                    </h2>
                    <p className="text-xs text-muted">
                      For rescuing a thin batch, not rewarding customers. Never
                      announce it in advance, never make it a fixed day, and always
                      give a reason.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                      <div className="sm:w-32">
                        <label className="label" htmlFor="flash_fee">Entry fee</label>
                        <input
                          id="flash_fee"
                          name="flash_fee"
                          inputMode="numeric"
                          placeholder="2000"
                          defaultValue={batch.flash_fee ?? ""}
                          className="field"
                        />
                      </div>
                      <div className="sm:grow">
                        <label className="label" htmlFor="flash_fee_reason">
                          Reason shown
                        </label>
                        <input
                          id="flash_fee_reason"
                          name="flash_fee_reason"
                          placeholder="Exam week."
                          defaultValue={batch.flash_fee_reason}
                          className="field"
                        />
                      </div>
                      <SaveButton look={ROW_ACTION} className="w-full sm:w-auto sm:shrink-0">
                        Save
                      </SaveButton>
                    </div>
                    <p className="hint">
                      {batch.flash_fee === null
                        ? `Normal bands: ${bandTable(null, bands).map((b) => `${b.label} ${naira(b.fee)}`).join(", ")}`
                        : `Tonight: ${bandTable(batch.flash_fee, bands).map((b) => `${b.label} ${naira(b.fee)}`).join(", ")}`}
                      . Leave the fee blank to go back to normal pricing.
                    </p>
                  </form>

                  <form
                    action={setBatchCapacity}
                    className="flex flex-col gap-2 border-t-[1.5px] border-rule pt-3 sm:flex-row sm:items-end"
                  >
                    <input type="hidden" name="batch_id" value={batch.id} />
                    <div className="sm:grow">
                      <label className="label" htmlFor="capacity">
                        Capacity (blank = no cap)
                      </label>
                      <input
                        id="capacity"
                        name="capacity"
                        inputMode="numeric"
                        defaultValue={batch.capacity ?? ""}
                        className="field"
                      />
                    </div>
                    <SaveButton look={ROW_ACTION} className="w-full sm:w-auto sm:shrink-0">
                      Save
                    </SaveButton>
                  </form>

                  <div className="border-t-[1.5px] border-rule pt-3">
                    <h2 className="font-display text-[21px] font-black uppercase leading-none sm:text-[26px]">
                      Is this run taking orders?
                    </h2>
                    <p className="mt-1 text-[12.5px] text-muted">
                      Currently {batch.status}. The stages above set this for you;
                      these two are for overriding it by hand.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <form action={setBatchStatus}>
                        <input type="hidden" name="batch_id" value={batch.id} />
                        <input type="hidden" name="status" value="open" />
                        <ActionButton
                          className={`${ROW_ACTION} disabled:opacity-40`}
                          disabled={batch.status === "open"}
                          done="Open ✓"
                        >
                          Reopen for orders
                        </ActionButton>
                      </form>
                      <form action={setBatchStatus}>
                        <input type="hidden" name="batch_id" value={batch.id} />
                        <input type="hidden" name="status" value="closed" />
                        <ActionButton
                          className={`${ROW_ACTION} disabled:opacity-40`}
                          disabled={batch.status === "closed"}
                          done="Closed ✓"
                        >
                          Close early
                        </ActionButton>
                      </form>
                      <form action={setBatchStatus}>
                        <input type="hidden" name="batch_id" value={batch.id} />
                        <input type="hidden" name="status" value="cancelled" />
                        <ConfirmButton tone="bad" className={THUMB} confirm="Yes, cancel the run">
                          Cancel this run
                        </ConfirmButton>
                      </form>
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      Cancelling a run does not refund anyone. Refund each order on
                      the handout tab, same night, in full.
                    </p>

                    {empty && (
                      <form action={deleteRun} className="mt-4 border-t-[1.5px] border-rule pt-3">
                        <input type="hidden" name="batch_id" value={batch.id} />
                        <h3 className="font-display text-[22px] font-black uppercase leading-none">
                          Delete this run
                        </h3>
                        <p className="mt-0.5 text-xs text-muted">
                          Nothing has been ordered into it, so it can go
                          entirely. A run with orders on it is cancelled
                          instead, never deleted.
                          {onSchedule && (
                            <>
                              {" "}
                              Your week still has {WEEKDAYS[scheduleWeekday]}{" "}
                              {SLOT_LABEL[batch.slot]} on it, so this one date
                              is noted as taken off and will not open itself
                              again. To bring it back, open that month on the{" "}
                              <Link href="/admin/schedule" className="underline">
                                schedule
                              </Link>
                              .
                            </>
                          )}
                        </p>
                        <span className="mt-2 block">
                          <ConfirmButton tone="bad" className={THUMB} confirm="Yes, delete it">
                            Delete this run
                          </ConfirmButton>
                        </span>
                      </form>
                    )}
                  </div>
                </section>
              </>
            ),
          },
        ]}
      />
      </SheetBody>
    </div>
  );
}

/** A timestamp as an <input type="time"> wants it, in Lagos time. */
/**
 * The two times behind a window, read back out of the words it was written
 * in, so the pickers open on what the run already says.
 *
 * A window created before these pickers existed, or typed by hand, may have
 * no times in it at all: "On campus soon" answers nothing, and the pickers
 * start empty rather than inventing an hour.
 */
function windowValues(text: string): { from: string; to: string } {
  const found = [...text.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/gi)].map((one) => {
    const hour = Number(one[1]) % 12;
    const minutes = one[2] ?? "00";
    const adjusted = one[3].toLowerCase() === "pm" ? hour + 12 : hour;
    return `${String(adjusted).padStart(2, "0")}:${minutes}`;
  });
  return { from: found[0] ?? "", to: found[1] ?? "" };
}

function clockValue(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  });
}

/**
 * What the money on a run actually went on, named rather than assumed.
 *
 * "After fuel and driver" was written when those were the only two boxes, and
 * it went on saying it for a run where the whole figure was a keke. A number
 * is only as useful as knowing what it is.
 */
function spentOn(batch: Batch): string {
  const named = [
    batch.fuel_cost > 0 && "fuel",
    batch.transport_cost > 0 && "transport",
    batch.driver_cost > 0 && "driver",
    batch.other_cost > 0 && (batch.cost_note.trim().toLowerCase() || "other costs"),
  ].filter((one): one is string => typeof one === "string");

  if (named.length === 0) return "costs";
  if (named.length === 1) return named[0];
  return `${named.slice(0, -1).join(", ")} and ${named[named.length - 1]}`;
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "font-semibold" : ""}`}>
      <dt className="text-ink/75">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
