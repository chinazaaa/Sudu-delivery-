import PageHeader from "@/components/admin/PageHeader";
import Link from "next/link";
import Diagnostic from "@/components/Diagnostic";
import AdminLive from "@/components/admin/AdminLive";
import Figure from "@/components/admin/Figure";
import Panel from "@/components/admin/Panel";
import { howLong, needsDoing } from "@/lib/needs-doing";
import { batchOverview, promoterRows } from "@/lib/admin";
import { dashboard, orderFeed } from "@/lib/admin-data";
import { abandonedCarts } from "@/lib/carts";
import { safeSettings } from "@/lib/settings";
import { diagnoseEmpty, keyKind } from "@/lib/health";
import { newRequests } from "@/lib/requests";
import { parcelJobs } from "@/lib/parcel-jobs";
import { tendBatches } from "@/lib/batches";
import { SLOT_LABEL } from "@/lib/config";
import { naira } from "@/lib/money";
import {
  otherMoneySince,
  otherMoneyTotals,
  windowStart,
} from "@/lib/other-money";
import { clockLabel, lagosToday, runDateLabel } from "@/lib/time";

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
    // Forced: whoever is on this page has just changed something and
    // is looking to see it.
    await tendBatches(true);
    const settings = await safeSettings();
    [batches, stats, unpaid, today, left] = await Promise.all([
      // Four weeks, the same stretch the money figures beside it cover.
      batchOverview("month"),
      dashboard(),
      orderFeed({ status: "pending", limit: 6 }),
      orderFeed({ status: "all", limit: 8 }),
      abandonedCarts(settings.abandon_minutes || 45).catch(() => []),
    ]);
    // Only the ones promised for today, which is the whole reason this is on
    // the front page rather than on the parcels page alone.
    const promised = await parcelJobs().catch(() => []);
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
  const soon = open.filter(
    (batch) => batch.run_date === lagosToday() || batch.run_date === tomorrow
  );
  // Where nothing is going either day, the next one that is, so the answer
  // is never just "no" with nowhere to go from it.
  const after = open
    .filter((batch) => batch.run_date > tomorrow)
    .sort((a, b) => a.run_date.localeCompare(b.run_date))[0];

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
  // So: today's run while it is still going, then the next one that is still
  // to come, so the button goes somewhere useful on a quiet day too.
  // Delivered is done and cancelled is not going, and neither is work. A same
  // day car is somebody's own order rather than the run being driven.
  const drivable = batches
    .filter(
      (batch) =>
        batch.kind !== "same_day" &&
        batch.kind !== "parcel" &&
        batch.status !== "cancelled" &&
        batch.status !== "delivered"
    )
    .sort((a, b) => a.run_date.localeCompare(b.run_date));
  const working =
    drivable.find((batch) => batch.run_date === lagosToday()) ??
    drivable.find((batch) => batch.run_date > lagosToday()) ??
    null;
  const workingLabel =
    working === null
      ? ""
      : working.run_date === lagosToday()
        ? "Today's run"
        : working.run_date === tomorrow
          ? "Tomorrow's run"
          : `${runDateLabel(working.run_date)} run`;
  // Jobs with no run behind them: somebody paid for an errand nobody drove a
  // car for. Counted in the same window as the runs, because a profit that
  // leaves out a fortnight's errands is not the profit.
  const aside = await otherMoneySince(windowStart()).catch(() => []);
  const asideTotals = otherMoneyTotals(aside);
  const profit =
    batches.reduce((total, batch) => total + batch.profit, 0) + asideTotals.made;
  const unpaidValue = unpaid.reduce((total, order) => total + order.total, 0);
  // Somebody asking for something we do not stock, waiting on an answer.
  // It arrives by email too, and an inbox is where things go to be missed.
  const asked = await newRequests().catch(() => 0);
  // Commission earned and not handed over. Not the shop's money, and
  // somebody did the work weeks ago and is still waiting for it.
  const owing = (await promoterRows().catch(() => []))
    .filter((one) => one.owed > 0)
    .map((one) => ({ name: one.name || one.code, owed: one.owed, since: "" }));

  // How long the run being worked has left, for the one job on the list that
  // is about a clock rather than about money.
  const closesIn =
    working === null
      ? 0
      : (new Date(working.cut_off_at).getTime() - Date.now()) / 60000;

  // Carts that could still make today's run: the ones worth a WhatsApp now
  // rather than an apology later.
  const inTime = working === null ? 0 : left.filter((cart) => closesIn > 0).length;

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
  });

  // The last few runs that actually went, for the bars. Newest on the right,
  // the way a week reads.
  const ran = batches
    .filter((batch) => batch.kind !== "same_day" && batch.kind !== "parcel" && batch.paidCount > 0)
    .sort((a, b) => a.run_date.localeCompare(b.run_date))
    .slice(-5);
  const best = Math.max(1, ...ran.map((batch) => batch.profit));
  const topped = Math.max(1, ...(stats?.topItems ?? []).map((one) => one.qty));
  /*
   * A panel as the mobile board draws it: a twenty-one pixel heading in a
   * fourteen pixel card, back to the desk's twenty-six and twenty from sm.
   *
   * An override rather than a prop because Panel is shared with every other
   * admin page and takes a single size for both widths; the change worth
   * making there is a responsive heading inside the component itself.
   */
  const dot = {
    red: "bg-brand-dark",
    amber: "bg-amber",
    ink: "bg-ink",
    volt: "bg-volt",
  } as const;

  return (
    <div>
      <AdminLive />

      <PageHeader
        title="Dashboard"
        detail={
          <>
            {runDateLabel(lagosToday())} · the last 28 days, and what needs doing today.
          </>
        }
        actions={
          <>
            {/* The board's two sizes: an outline button for the second thing,
                and the one tomato button on the screen for the run being
                driven. */}
            <Link href="/admin/runs?new=1" className="btn-admin flex-1 sm:flex-none">
              New run
            </Link>
            {working && (
              /* The board gives the phone one full width tomato button at
                 fifty-four pixels, above everything else on the screen,
                 because it is the thumb's first stop in the morning. On a
                 desk it goes back to sitting beside New run. */
              <Link
                href={`/admin/batch/${working.id}`}
                className="btn-admin-go order-first min-h-[54px] w-full text-base sm:order-none sm:min-h-[44px] sm:w-auto sm:text-[15px]"
              >
                Open {workingLabel.toLowerCase()} →
              </Link>
            )}
          </>
        }
      />

      {problem && !problem.ok && (
        <Diagnostic title={problem.title} detail={problem.detail} />
      )}

      {stats && (
        /* The board sets a phone's figure at twenty-five pixels in a two up
           grid, not forty in a column: four tiles are then one glance
           rather than most of the screen. Written as a descendant override
           because Figure carries one size for both widths, and giving it a
           responsive size is the change to make there. */
        <div className="mb-3 grid grid-cols-2 gap-[9px] [&_.card]:px-[13px] [&_.card]:py-[11px] sm:mb-[18px] sm:gap-3.5 xl:grid-cols-4">
          <Figure
            label="Paid orders"
            value={String(stats.paidOrders)}
            detail="Last 28 days"
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
            detail="After food, commission and run costs"
          />
        </div>
      )}

      <div className="grid items-start gap-3 sm:gap-[18px] xl:grid-cols-[1.35fr_1fr]">
        <Panel
         
          title="Needs doing today"
          detail="Everything here costs you money if it is left. Clearing the list is the whole job."
          aside={
            jobs.length > 0 ? (
              <span className="tag bg-brand-wash text-brand-dark">
                {jobs.length} thing{jobs.length === 1 ? "" : "s"}
              </span>
            ) : (
              <span className="tag bg-mint-tint text-mint">All clear</span>
            )
          }
        >
          {jobs.length === 0 ? (
            <p className="border-t-[1.5px] border-rule pt-3.5 text-[14.5px] text-muted">
              Nothing is waiting. Every cart has been paid for, every order is on a run, and
              nobody is owed an answer.
            </p>
          ) : (
            jobs.map((job) => (
              <div
                key={job.kind}
                className="flex items-center gap-3 border-t-[1.5px] border-rule px-1 py-3"
              >
                <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${dot[job.tone]}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold">{job.title}</p>
                  <p className="hint">{job.detail}</p>
                </div>
                <Link href={job.action.href} className="btn-admin btn-admin-sm shrink-0">
                  {job.action.label}
                </Link>
              </div>
            ))
          )}
        </Panel>

        <Panel
         
          title="Runs"
          aside={
            <Link href="/admin/runs" className="text-[13.5px] font-semibold text-brand-dark">
              All runs
            </Link>
          }
        >
          {soon.length === 0 && !after && (
            <p className="border-t-[1.5px] border-rule pt-3 text-[14.5px] text-muted">
              Nothing is going today or tomorrow.
            </p>
          )}
          {[...soon, ...(after && soon.length === 0 ? [after] : [])].map((batch) => (
            <Link
              key={batch.id}
              href={`/admin/batch/${batch.id}`}
              className="flex items-center gap-3 border-t-[1.5px] border-rule py-3"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-bold">
                  {runDateLabel(batch.run_date)} · {SLOT_LABEL[batch.slot]}
                </span>
                <span className="hint block">Closes {clockLabel(batch.cut_off_at)}</span>
              </span>
              <span className="text-right">
                <span className="block font-mono text-sm font-semibold">
                  {batch.paidCount} paid
                </span>
                <span className="tag bg-mint-tint text-mint">open</span>
              </span>
            </Link>
          ))}
        </Panel>

        <Panel
         
          title="What sells"
          detail="Last 28 days. Use it to decide which kitchens go on a run."
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

        <Panel
         
          title="By day of the week"
          detail="Last 28 days, busiest first. A day near the bottom is a car that went out half full."
        >
          {(stats?.byWeekday ?? []).length === 0 ? (
            <p className="pt-2 text-[14.5px] text-muted">
              Nothing has been paid for yet, so no day has a figure against it.
            </p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="pb-2 pr-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                    Day and slot
                  </th>
                  <th className="pb-2 pr-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                    Orders
                  </th>
                  <th className="pb-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                    Money in
                  </th>
                </tr>
              </thead>
              <tbody>
                {(stats?.byWeekday ?? []).slice(0, 7).map((day) => (
                  <tr key={day.label} className="border-t-[1.5px] border-rule">
                    <td className="py-[11px] pr-2.5 text-[14.5px] font-bold capitalize">
                      {day.label}
                    </td>
                    <td className="py-[11px] pr-2.5 text-right font-mono text-[14.5px] text-muted">
                      {day.orders}
                    </td>
                    <td className="py-[11px] text-right font-mono text-[14.5px] font-semibold">
                      {naira(day.gross)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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

          <Link
            href="/admin/money"
            className="soft flex items-center gap-3 border-volt-line bg-brand-tint px-4 py-3.5"
          >
            <span className="flex-1">
              <strong className="text-[14.5px]">Other money</strong>
              <span className="hint block">
                {aside.length} entr{aside.length === 1 ? "y" : "ies"} in the last 28 days,{" "}
                {naira(asideTotals.made)}
              </span>
            </span>
            <span className="btn-admin btn-admin-sm">Add one</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
