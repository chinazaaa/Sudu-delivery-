import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import Figure from "@/components/admin/Figure";
import Panel from "@/components/admin/Panel";
import { naira } from "@/lib/money";
import { lagosToday, runDateLabel, weekdayLabel } from "@/lib/time";
import { SLOT_LABEL } from "@/lib/config";
import { profitBetween, profitByKitchen } from "@/lib/profit";
import { costsByKind, madeOn } from "@/lib/other-money";
import { catchUpStanding } from "@/lib/standing";
import { typicalCosts } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * What the shop made, over a window somebody picks, with the working shown.
 *
 * The dashboard answers this with one figure over a fixed four weeks, which
 * is the right question in the morning and the wrong one at a month end. A
 * number you cannot take apart is a number you end up not believing, so
 * every line that moved it is here, in the order it is taken off, and under
 * it the run that caused each one.
 */

/** The ranges worth a button. Everything else is the two date boxes. */
type Span = { key: string; label: string; from: string; to: string };

function spans(today: string): Span[] {
  const at = new Date(`${today}T12:00:00Z`);
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const first = (back = 0) =>
    day(new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() - back, 1, 12)));
  const last = (back = 0) =>
    day(new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() - back + 1, 0, 12)));

  return [
    { key: "month", label: "This month", from: first(), to: today },
    { key: "last", label: "Last month", from: first(1), to: last(1) },
    { key: "three", label: "Three months", from: first(2), to: today },
    {
      key: "year",
      label: "This year",
      from: day(new Date(Date.UTC(at.getUTCFullYear(), 0, 1, 12))),
      to: today,
    },
    {
      key: "all",
      label: "Everything",
      from: "2018-01-01",
      to: today,
    },
  ];
}

/** Monday first, because that is how a week is read off a wall. */
const WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * The window said the short way, for the line under the profit.
 *
 * "1–10 October" is how somebody says the window out loud. Spelling both ends
 * out in full under a forty pixel figure makes the date longer than the
 * number it belongs to, and the number is the thing being read.
 */
function windowLabel(from: string, to: string): string {
  const at = (iso: string) => new Date(`${iso}T12:00:00Z`);
  const dayOf = (iso: string) => String(at(iso).getUTCDate());
  const monthOf = (iso: string) =>
    new Intl.DateTimeFormat("en-NG", { timeZone: "UTC", month: "long" }).format(at(iso));
  const yearOf = (iso: string) => at(iso).getUTCFullYear();

  if (from === to) return `${dayOf(from)} ${monthOf(from)}`;
  if (monthOf(from) === monthOf(to) && yearOf(from) === yearOf(to)) {
    return `${dayOf(from)}–${dayOf(to)} ${monthOf(from)}`;
  }
  return `${dayOf(from)} ${monthOf(from)} to ${dayOf(to)} ${monthOf(to)}`;
}

export default async function ProfitPage({
  searchParams,
}: {
  /** The window lives in the address, so a figure can be sent to somebody
   *  and open on the same window when they tap it. */
  searchParams: Promise<{ span?: string; from?: string; to?: string }>;
}) {
  const asked = await searchParams;
  const today = lagosToday();
  const every = spans(today);

  const day = (said: string | undefined, fallback: string) =>
    said && /^\d{4}-\d{2}-\d{2}$/.test(said) ? said : fallback;

  const chosen = every.find((one) => one.key === asked.span) ?? every[0];
  const typed = Boolean(asked.from || asked.to);
  const from = typed ? day(asked.from, chosen.from) : chosen.from;
  const to = typed ? day(asked.to, today) : chosen.to;

  // A month end is exactly when somebody opens this, and exactly when a
  // standing cost is owed. Written before the sums rather than after.
  await catchUpStanding();

  const sums = await profitBetween(from, to);
  // Food only, and only the runs that have been reconciled, which is why it
  // is its own question rather than a column on the table above.
  const byKitchen = await profitByKitchen(from, to);
  // What a run usually costs to drive, which is the figure a run with nothing
  // typed into it is standing in for.
  const typical = await typicalCosts();
  // Hosting, bank charges, data: what is actually eating the money, which a
  // single "paid out" figure cannot answer.
  const costs = costsByKind(sums.aside);

  // Everything taken off, in one figure, which is the board's third card:
  // the car, what the promoters earned on these orders, and anything the shop
  // paid out that was not a run.
  const allCosts = sums.runCosts + sums.commission + sums.otherOut;
  const share =
    sums.gross === 0 ? 0 : Math.round((sums.profit / sums.gross) * 100);

  // The runs nobody has typed a cost into. The one thing on this page that
  // makes every figure above it a guess, so it is both the red button at the
  // top and a panel of its own.
  const estimated = sums.byRun.filter((run) => run.estimated);
  const lost = sums.byRun.filter((run) => run.profit < 0);
  const worst = [...lost].sort((a, b) => a.profit - b.profit)[0] ?? null;

  // Whether the worst run is one bad night or a standing habit of that
  // weekday, which is the difference between a shrug and a decision.
  const sameDay = worst
    ? sums.byRun
        .filter((run) => weekdayLabel(run.runDate) === weekdayLabel(worst.runDate))
        .slice(0, 6)
    : [];
  const sameDayLost = sameDay.filter((run) => run.profit < 0).length;

  // Profit by the day of the week the car went out, over whatever window is
  // being read. A day below the line is a day worth not driving.
  const byDay = WEEK.map((name) => {
    const mine = sums.byRun.filter((run) => weekdayLabel(run.runDate) === name);
    return {
      name,
      short: name.slice(0, 3),
      runs: mine.length,
      profit: mine.reduce((total, run) => total + run.profit, 0),
    };
  });
  const tallest = Math.max(1, ...byDay.map((one) => Math.abs(one.profit)));
  const below = byDay.filter((one) => one.runs > 0 && one.profit < 0);
  // The two days that carry the week, which is what the board names. One day
  // ahead of six is a different week from two carrying it between them.
  const ahead = byDay
    .filter((one) => one.runs > 0 && one.profit > 0)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 2);

  // The widest bar is the best kitchen, not a hundred per cent: six bars all
  // at a quarter of the panel say nothing about which of them to keep.
  const bestShare = Math.max(1, ...byKitchen.kitchens.map((one) => one.share));

  const link = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
    }
    const tail = params.toString();
    return tail === "" ? "/admin/profit" : `/admin/profit?${tail}`;
  };

  return (
    /* Room under the last panel for the phone bar, which is fixed. */
    <div className="pb-[72px] lg:pb-0">
      {/* The window on the screen, run by run, which is the shape anybody
          sorts or charts. Carrying the dates matters: an export that
          ignores the window somebody set is one they redo by hand. */}
      <PageHeader
        title="Profit"
        detail="Money in, everything taken off it, and what is left."
        backHref="/admin"
        backLabel="Dashboard"
        actions={
          <>
            <a
              href={`/api/admin/export?what=profit&from=${from}&to=${to}`}
              className="btn-admin"
            >
              Export
            </a>
            {/* The one tomato button on the screen, and only while there is
                a run whose costs are still a guess: everything above is
                wrong until they are in. On a phone it stands on the bar at
                the bottom instead of up here. */}
            {estimated.length > 0 ? (
              <Link
                href={`/admin/batch/${estimated[0].id}`}
                className="btn-admin-go hidden lg:inline-flex"
              >
                Add a run&apos;s costs
              </Link>
            ) : (
              <Link href="/admin/runs" className="btn-admin">
                All runs
              </Link>
            )}
          </>
        }
      />

      {/* The window. Presets at the board's filter size, and the two date
          boxes beside them for anything else: a plain form, so it works
          before anything has loaded and the window stays in the address
          afterwards. */}
      <div className="mb-3 flex flex-col gap-1.5 sm:mb-[18px] sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
        {/* Five presets wrap onto two lines on a phone, so they scroll
            sideways instead, edge to edge. */}
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1.5 sm:mx-0 sm:flex-wrap sm:gap-2 sm:overflow-visible sm:px-0 sm:pb-0">
          {every.map((one) => (
            <Link
              key={one.key}
              href={link({ span: one.key })}
              className={`pill-admin min-h-[34px] shrink-0 px-3 text-[13px] sm:min-h-[38px] sm:px-3.5 sm:text-sm ${
                !typed && one.key === chosen.key ? "pill-admin-on" : ""
              }`}
            >
              {one.label}
            </Link>
          ))}
        </div>
        {/* The two boxes side by side on a phone with the button under
            them: a date box squeezed into a third of 390 pixels shows no
            date. */}
        <form
          action="/admin/profit"
          className="soft grid grid-cols-2 items-end gap-2 p-2 sm:flex sm:flex-wrap sm:items-center"
        >
          <label
            className="flex flex-col gap-1 text-[13px] font-semibold sm:flex-row sm:items-center sm:gap-1.5"
            htmlFor="from"
          >
            From
            <input
              id="from"
              name="from"
              type="date"
              defaultValue={from}
              className="field h-[42px] w-full px-3 py-0 text-[14.5px] sm:w-auto"
            />
          </label>
          <label
            className="flex flex-col gap-1 text-[13px] font-semibold sm:flex-row sm:items-center sm:gap-1.5"
            htmlFor="to"
          >
            To
            <input
              id="to"
              name="to"
              type="date"
              defaultValue={to}
              className="field h-[42px] w-full px-3 py-0 text-[14.5px] sm:w-auto"
            />
          </label>
          <button className="btn-admin btn-admin-sm col-span-2 w-full sm:w-auto">
            Show that
          </button>
        </form>
      </div>

      {/*
        The same four figures as one Ink card on a phone.
        Four tiles stacked two by two push the working a screen and a half
        down, and the working is the reason somebody opened this page. The
        board answers it with one card instead: the window, the profit, the
        share and the order count on one line, then the three figures it was
        built from small along the bottom. Everything is still here, and the
        working is now the next thing under the thumb.
      */}
      <div className="card mb-3 border-ink bg-ink p-3.5 text-shell sm:hidden">
        <p className="ticket text-shell/60">{windowLabel(from, to)}</p>
        <p
          /* White, because on Ink the profit is the one thing being read.
             A loss goes to Volt, which is the board's highlight on Ink:
             mint and brand-dark are both colours for a light ground and
             neither carries on this one. */
          className={`font-display text-[46px] font-black leading-none ${
            sums.profit < 0 ? "text-volt" : "text-paper"
          }`}
        >
          {sums.profit < 0 ? `−${naira(Math.abs(sums.profit))}` : naira(sums.profit)}
        </p>
        <p className="text-[13px] text-shell/80">
          {sums.gross === 0 ? "nothing came in" : `${share}% of money in`} ·{" "}
          {sums.orders} paid order{sums.orders === 1 ? "" : "s"}
        </p>
        <div className="mt-3 flex gap-3.5 border-t border-shell/25 pt-3">
          <div>
            <p className="ticket text-shell/60">In</p>
            <p className="font-mono text-sm font-semibold">{naira(sums.gross)}</p>
          </div>
          <div>
            <p className="ticket text-shell/60">Margin</p>
            <p className="font-mono text-sm font-semibold">{naira(sums.margin)}</p>
          </div>
          <div>
            <p className="ticket text-shell/60">Costs</p>
            <p className="font-mono text-sm font-semibold">{naira(allCosts)}</p>
          </div>
        </div>
      </div>

      {/*
        The runs nobody has typed a cost into, named, with the figure that is
        standing in for them.

        It is in the right column on a desk, where the eye takes in both
        columns at once. On a phone that column is below everything, which
        is a caveat arriving after the figure it is a caveat about, so the
        board puts it directly under the profit it makes a guess.
      */}
      {estimated.length > 0 && (
        <div className="card mb-3 border-volt-line bg-brand-tint p-3.5 sm:hidden">
          <strong className="text-[14px]">
            {estimated.length} run{estimated.length === 1 ? "" : "s"} still use
            {estimated.length === 1 ? "s" : ""} estimates
          </strong>
          <p className="hint mt-1">
            {estimated
              .map((run) => `${runDateLabel(run.runDate)} · ${SLOT_LABEL[run.slot] ?? run.kind}`)
              .join(", ")}
            {typical === null
              ? ", with nothing typed in and no run yet to average."
              : `, each assuming ${naira(typical)}.`}{" "}
            Put the real fuel and driver in and this figure becomes exact.
          </p>
          <Link
            href={`/admin/batch/${estimated[0].id}`}
            className="btn-admin btn-admin-sm mt-2.5 w-full"
          >
            Add them now
          </Link>
        </div>
      )}

      {/* Money in, the margin the delivery itself earns, everything taken off
          and what is left: the four figures in the order they happen. */}
      <div className="hidden sm:mb-[18px] sm:grid sm:grid-cols-2 sm:gap-3.5 xl:grid-cols-4">
        <Figure
          label="Money in"
          value={naira(sums.gross)}
          detail={`${sums.orders} paid order${sums.orders === 1 ? "" : "s"}`}
        />
        <Figure
          label="Delivery margin"
          value={naira(sums.margin)}
          detail="Money in, less the food"
        />
        <Figure
          label="Costs"
          value={naira(allCosts)}
          detail="Runs, commission and anything paid out"
        />
        <Figure
          label="Profit"
          value={
            sums.profit < 0 ? `−${naira(Math.abs(sums.profit))}` : naira(sums.profit)
          }
          tone={sums.profit >= 0 ? "mint" : "brand"}
          detail={
            sums.gross === 0
              ? `${windowLabel(from, to)} · nothing came in`
              : `${windowLabel(from, to)} · ${share}% of money in`
          }
        />
      </div>

      <div className="grid items-start gap-3 sm:gap-[18px] xl:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/*
            Written out rather than a Panel, because on a phone the board
            sets this heading as a ticket label and not as a display
            headline: a 21px condensed heading over seven rows of 13.5px
            competes with the figure in the card above it. From sm up this
            is the same markup a Panel renders, so the desk is unchanged.
          */}
          <section className="card p-3.5 sm:p-5">
            <p className="ticket text-muted sm:hidden">How it is worked out</p>
            <h2 className="hidden font-display font-black uppercase leading-none sm:block sm:text-[26px]">
              How it is worked out
            </h2>
            <p className="hint mb-1.5 mt-1">
              Every line is money that moved. Tap one to see the orders or runs behind it.
            </p>
            {/* Every line that moved it, in the order it is taken off. A
                figure somebody disputes is disputed at this level, not at
                the summary's. */}
            <dl className="text-[13.5px] sm:text-[14.5px]">
              <Line
                label={`Money in, from ${sums.orders} paid order${
                  sums.orders === 1 ? "" : "s"
                }`}
                value={sums.gross}
                href="/admin/orders"
              />
              <Line
                label="The food, at menu prices"
                value={-sums.foodAtMenu}
                href="/admin/orders"
              />
              {sums.overMenu !== 0 && (
                <Line
                  label={
                    sums.overMenu < 0
                      ? "The counters charged less than the menu"
                      : "The counters charged more than the menu"
                  }
                  value={-sums.overMenu}
                  note="Only across the runs you have reconciled."
                  href="/admin/runs"
                />
              )}
              <Line
                label="Promoter commission"
                value={-sums.commission}
                note="Earned on these orders, whether or not it has been handed over."
                href="/admin/promoters"
              />
              <Line
                label={`Fuel, driver and the rest, across ${sums.runs} run${
                  sums.runs === 1 ? "" : "s"
                }`}
                value={-sums.runCosts}
                href="/admin/runs"
              />
              {sums.otherIn > 0 && (
                <Line
                  label="Errands and sales with no run behind them"
                  value={sums.otherIn}
                  href="/admin/money"
                />
              )}
              {sums.otherOut > 0 && (
                <Line
                  label="What those cost, and anything else paid out"
                  value={-sums.otherOut}
                  href="/admin/money"
                />
              )}
              <div className="mt-0.5 flex items-baseline justify-between gap-3.5 border-t-2 border-ink pt-3">
                <dt className="text-[17px] font-bold">Profit</dt>
                <dd
                  className={`font-display text-[26px] font-black leading-none sm:text-[30px] ${
                    sums.profit >= 0 ? "text-mint" : "text-brand-dark"
                  }`}
                >
                  {sums.profit < 0
                    ? `−${naira(Math.abs(sums.profit))}`
                    : naira(sums.profit)}
                </dd>
              </div>
            </dl>
          </section>

          <Panel
            title="Run by run"
            aside={
              <span className="hint">
                {sums.byRun.length} run{sums.byRun.length === 1 ? "" : "s"}
                {lost.length > 0 && ` · ${lost.length} lost money`}
                {estimated.length > 0 && ` · ${estimated.length} still estimated`}
              </span>
            }
          >
            {sums.byRun.length === 0 ? (
              <p className="pt-2 text-[14.5px] text-muted">
                No car went out in this window, so there is nothing to take apart.
              </p>
            ) : (
              <>
                {/* The same runs as rows below a desk, which is what the
                    board draws: six columns on a phone is a sideways scroll
                    and a table that sets the width of the page,
                    and what is being read down the list is the profit. The
                    run's own figures stay on the line under it, and a run
                    still on estimates keeps its way in. */}
                <div className="lg:hidden">
                  {sums.byRun.map((run) => (
                    <div
                      key={run.id}
                      className="flex items-center gap-2.5 border-t-[1.5px] border-rule py-3"
                    >
                      <Link
                        href={`/admin/batch/${run.id}`}
                        className="min-w-0 flex-1 hover:text-brand"
                      >
                        <strong className="block text-[14px]">
                          {runDateLabel(run.runDate)} · {SLOT_LABEL[run.slot] ?? run.kind}
                        </strong>
                        <span className="hint block">
                          {naira(run.took)} in · {naira(run.costs)} costs
                          {run.estimated && " (est)"} · {run.orders} order
                          {run.orders === 1 ? "" : "s"}
                        </span>
                      </Link>
                      <span
                        className={`font-mono text-[15px] font-semibold ${
                          run.profit < 0 ? "text-brand-dark" : "text-mint"
                        }`}
                      >
                        {run.profit < 0
                          ? `−${naira(Math.abs(run.profit))}`
                          : naira(run.profit)}
                      </span>
                      {run.estimated && (
                        <Link
                          href={`/admin/batch/${run.id}`}
                          className="btn-admin btn-admin-sm shrink-0"
                        >
                          Add costs
                        </Link>
                      )}
                    </div>
                  ))}
                  {/* The board's way out of this card. On a desk the header
                      carries it, but on a phone that button is the bar at
                      the bottom and the bar is putting a run's costs in
                      while any are still a guess, which leaves the run list
                      with no way to it from here. */}
                  <Link
                    href="/admin/runs"
                    className="flex min-h-[44px] items-center justify-center border-t-[1.5px] border-rule text-[14px] font-semibold text-brand-dark"
                  >
                    Every run ›
                  </Link>
                </div>

                <table className="hidden w-full border-collapse lg:table">
                  <thead>
                    <tr>
                      <Head>Run</Head>
                      <Head right>Took</Head>
                      <Head right>Food</Head>
                      <Head right>Costs</Head>
                      <Head right>Profit</Head>
                      <Head> </Head>
                    </tr>
                  </thead>
                  <tbody>
                    {sums.byRun.map((run) => (
                      <tr key={run.id} className="border-t-[1.5px] border-rule">
                        <td className="py-[11px] pr-2.5">
                          <Link href={`/admin/batch/${run.id}`} className="hover:text-brand">
                            <strong className="text-[14.5px]">
                              {runDateLabel(run.runDate)} · {SLOT_LABEL[run.slot] ?? run.kind}
                            </strong>
                          </Link>
                          <p className="hint">
                            {run.orders} order{run.orders === 1 ? "" : "s"}
                          </p>
                        </td>
                        <td className="py-[11px] pr-2.5 text-right font-mono text-[14.5px]">
                          {naira(run.took)}
                        </td>
                        <td className="py-[11px] pr-2.5 text-right font-mono text-[14.5px] text-muted">
                          {naira(run.food)}
                        </td>
                        <td className="py-[11px] pr-2.5 text-right font-mono text-[14.5px] text-muted">
                          {naira(run.costs)}
                          {run.estimated && <span className="hint"> est</span>}
                        </td>
                        <td
                          className={`py-[11px] pr-2.5 text-right font-mono text-[14.5px] font-semibold ${
                            run.profit < 0 ? "text-brand-dark" : "text-mint"
                          }`}
                        >
                          {run.profit < 0
                            ? `−${naira(Math.abs(run.profit))}`
                            : naira(run.profit)}
                        </td>
                        <td className="py-[11px] text-right">
                          {run.estimated && (
                            <Link
                              href={`/admin/batch/${run.id}`}
                              className="btn-admin btn-admin-sm"
                            >
                              Add costs
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="hint mt-2.5">
                  Took, less what the counters charged and what the car and the promoters
                  cost, is the profit on the line.
                </p>
                {worst && (
                  <div className="soft mt-3 border-volt-line bg-brand-tint px-3.5 py-2.5 text-[13.5px]">
                    <strong>
                      {runDateLabel(worst.runDate)} lost {naira(Math.abs(worst.profit))}.
                    </strong>{" "}
                    {worst.orders} order{worst.orders === 1 ? "" : "s"},{" "}
                    {naira(worst.delivery)} of delivery, against {naira(worst.costs)} of fuel,
                    driver and commission.
                    {sameDayLost > 1 &&
                      ` ${sameDayLost} of the last ${sameDay.length} ${weekdayLabel(
                        worst.runDate
                      )}s look like this.`}
                  </div>
                )}
              </>
            )}
          </Panel>

          <Panel
            title="Money with no run behind it"
            aside={
              <Link href="/admin/money" className="btn-admin btn-admin-sm">
                Add one
              </Link>
            }
            detail="Errands, sales settled by hand, and anything the shop paid out that was not a run: hosting, data, printing. A cost here is a line with nothing coming in."
          >
            {sums.aside.length === 0 ? (
              <p className="pt-2 text-[14.5px] text-muted">Nothing in this window.</p>
            ) : (
              <ul className="text-[14.5px]">
                {sums.aside.map((one) => (
                  <li
                    key={one.id}
                    className="flex items-center justify-between gap-3 border-t-[1.5px] border-rule py-[11px]"
                  >
                    <span className="min-w-0">
                      <strong className="block text-[14.5px]">{one.what}</strong>
                      <span className="hint block">
                        {one.happened_on}
                        {one.who ? ` · ${one.who}` : ""}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 font-mono font-semibold ${
                        madeOn(one) >= 0 ? "text-mint" : "text-brand-dark"
                      }`}
                    >
                      {madeOn(one) < 0
                        ? `−${naira(Math.abs(madeOn(one)))}`
                        : naira(madeOn(one))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Food only. The delivery fee is one fee per car, so it belongs to
              the run and not to any one kitchen, and only the reconciled runs
              are in here: at the menu price every kitchen keeps nothing. */}
          <Panel
            title="What each kitchen keeps"
            size="sm"
            detail="Food only. The delivery fee is one fee per car, so it belongs to the run, not to any one kitchen, so splitting it between kitchens would be a number nobody could check."
          >
            {byKitchen.kitchens.length === 0 ? (
              <p className="pt-2 text-[14.5px] text-muted">
                No run in this window has been reconciled yet, so there is nothing here that
                is money rather than a menu price.
              </p>
            ) : (
              <>
                {byKitchen.kitchens.map((one) => (
                  <div
                    key={one.restaurant}
                    className="border-t-[1.5px] border-rule py-[11px]"
                  >
                    <div className="flex items-baseline justify-between gap-2.5">
                      <strong className="text-[15px]">{one.restaurant}</strong>
                      <span
                        className={`font-mono font-semibold ${
                          one.kept < 0 ? "text-brand-dark" : "text-mint"
                        }`}
                      >
                        {one.kept < 0
                          ? `−${naira(Math.abs(one.kept))}`
                          : naira(one.kept)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2.5">
                      <div className="h-[7px] flex-1 rounded-full bg-rule">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{
                            width: `${Math.max(
                              0,
                              Math.round((Math.max(0, one.share) / bestShare) * 100)
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="hint w-[74px] shrink-0 text-right font-mono">
                        {one.share}% kept
                      </span>
                    </div>
                    <p className="hint mt-0.5">
                      {naira(one.through)} through it · {one.runs} run
                      {one.runs === 1 ? "" : "s"} ·{" "}
                      {one.over === 0 ? (
                        "counters matched the menu"
                      ) : (
                        <span className={one.over < 0 ? "text-mint" : "text-brand-dark"}>
                          counters charged {naira(Math.abs(one.over))}{" "}
                          {one.over < 0 ? "less" : "more"} than the menu
                        </span>
                      )}
                    </p>
                  </div>
                ))}
                <p className="soft mt-3 border-volt-line bg-brand-tint px-3 py-2.5 text-[13px]">
                  Built from{" "}
                  <strong>
                    {byKitchen.runs} reconciled run{byKitchen.runs === 1 ? "" : "s"}
                  </strong>
                  , the ones where you entered what you really paid. Runs still on estimates
                  are left out, so every figure here is money that moved.
                </p>
              </>
            )}
          </Panel>

          <Panel title="By day of the week" size="sm">
            <div className="flex h-[116px] items-end gap-2 pb-1 pt-2.5">
              {byDay.map((one) => (
                <div
                  key={one.name}
                  className="flex flex-1 flex-col items-center justify-end gap-1.5"
                  title={`${one.name}: ${naira(one.profit)} across ${one.runs} run${
                    one.runs === 1 ? "" : "s"
                  }`}
                >
                  {/* A losing day hangs off the baseline and is drawn in the
                      deep red, so it reads as below the line rather than as
                      a short good day. */}
                  <div
                    className={`w-full border-2 border-ink ${
                      one.profit < 0 ? "rounded-b-md bg-brand-dark" : "rounded-t-md bg-brand"
                    }`}
                    style={{
                      height: `${
                        one.runs === 0
                          ? 4
                          : Math.max(6, Math.round((Math.abs(one.profit) / tallest) * 86))
                      }px`,
                    }}
                  />
                  <span className="font-mono text-[10.5px] text-muted">{one.short}</span>
                </div>
              ))}
            </div>
            <p className="hint border-t-[1.5px] border-rule pt-2.5">
              {ahead.length > 0
                ? `${ahead.map((one) => one.name).join(" and ")} ${
                    ahead.length === 1 ? "carries" : "carry"
                  } the week.`
                : "No day is ahead in this window."}
              {below.length > 0 &&
                ` ${below.map((one) => one.name).join(" and ")} ${
                  below.length === 1 ? "is" : "are"
                } below the line.`}
            </p>
          </Panel>

          {estimated.length > 0 && (
            <Panel
              title="Still estimated"
              size="sm"
              /* The amber card under the profit is this panel's phone form,
                 and two copies of the same warning on one screen is the
                 second one being ignored. */
              className="hidden sm:block"
              detail={`${estimated.length} run${
                estimated.length === 1 ? "" : "s"
              } use the average of your last few. Put the real figures in and the profit above becomes exact.`}
            >
              {estimated.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center gap-2.5 border-t-[1.5px] border-rule py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <strong className="text-sm">
                      {runDateLabel(run.runDate)} · {SLOT_LABEL[run.slot] ?? run.kind}
                    </strong>
                    <p className="hint">
                      {typical === null
                        ? "nothing typed in, and no run yet to average"
                        : `using ${naira(typical)} estimated`}
                    </p>
                  </div>
                  <Link href={`/admin/batch/${run.id}`} className="btn-admin btn-admin-sm">
                    Add
                  </Link>
                </div>
              ))}
            </Panel>
          )}

          {costs.length > 0 && (
            <Panel
              title="What the shop paid for"
              size="sm"
              detail="Everything that left, outside of a run's own fuel and driver."
            >
              <ul className="text-[14.5px]">
                {costs.map((one) => (
                  <li
                    key={one.kind}
                    className="flex justify-between gap-3 border-t-[1.5px] border-rule py-2.5"
                  >
                    <span>
                      {one.kind}
                      <span className="text-muted">
                        {" "}
                        · {one.count} {one.count === 1 ? "line" : "lines"}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono font-semibold text-brand-dark">
                      −{naira(one.spent)}
                    </span>
                  </li>
                ))}
                <li className="flex justify-between gap-3 border-t-[1.5px] border-rule pt-2.5 font-bold">
                  <span>All of it</span>
                  <span className="font-mono text-brand-dark">−{naira(sums.otherOut)}</span>
                </li>
              </ul>
            </Panel>
          )}
        </div>
      </div>

      {/* The board's bar: the one thing this screen is for. While a run's
          costs are still a guess that is putting them in, because every
          figure above is wrong until they are; after that it is the way to
          the runs themselves. */}
      <div className="phone-bar">
        {estimated.length > 0 ? (
          <Link
            href={`/admin/batch/${estimated[0].id}`}
            className="btn-admin-go min-h-[50px] w-full text-[15.5px]"
          >
            Add a run&apos;s costs
          </Link>
        ) : (
          <Link href="/admin/runs" className="btn-admin min-h-[50px] w-full text-[15.5px]">
            All runs
          </Link>
        )}
      </div>
    </div>
  );
}

/** A column heading in the board's voice: small, tracked and quiet. */
function Head({ children, right = false }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={`pb-2 pr-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted ${
        right ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

/**
 * One line of the working.
 *
 * The label is a link wherever there is a page behind it, because the panel's
 * own hint promises that tapping a line shows the orders or the runs it came
 * from, and a figure you cannot walk back to its cause is the kind of figure
 * this page exists to replace.
 */
function Line({
  label,
  value,
  note,
  href,
}: {
  label: string;
  value: number;
  note?: string;
  href?: string;
}) {
  return (
    <div className="flex justify-between gap-3.5 border-t-[1.5px] border-rule py-[11px]">
      <dt className="min-w-0">
        {href ? (
          <Link href={href} className="block hover:text-brand">
            {label}
          </Link>
        ) : (
          <span className="block">{label}</span>
        )}
        {note && <span className="hint block">{note}</span>}
      </dt>
      <dd
        className={`shrink-0 font-mono font-semibold ${value < 0 ? "text-brand-dark" : ""}`}
      >
        {value < 0 ? `−${naira(Math.abs(value))}` : naira(value)}
      </dd>
    </div>
  );
}
