import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import Figure from "@/components/admin/Figure";
import Panel from "@/components/admin/Panel";
import { naira } from "@/lib/money";
import { lagosToday, runDateLabel, weekdayLabel } from "@/lib/time";
import { SLOT_LABEL } from "@/lib/config";
import { profitBetween } from "@/lib/profit";
import { costsByKind, madeOn } from "@/lib/other-money";
import { catchUpStanding } from "@/lib/standing";

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
  // Hosting, bank charges, data: what is actually eating the money, which a
  // single "paid out" figure cannot answer.
  const costs = costsByKind(sums.aside);

  // What the counters were actually paid, which is the figure the board puts
  // beside money in: the menu price plus anything the shopping came to over
  // it on the runs that have been reconciled.
  const kitchens = sums.foodAtMenu + sums.overMenu;
  const share =
    sums.gross === 0 ? 0 : Math.round((sums.profit / sums.gross) * 100);

  // The runs nobody has typed a cost into. The one thing on this page that
  // makes every figure above it a guess, so it is both the red button at the
  // top and the note under the working.
  const estimated = sums.byRun.filter((run) => run.estimated);
  const lost = sums.byRun.filter((run) => run.profit < 0);
  const worst = [...lost].sort((a, b) => a.profit - b.profit)[0] ?? null;

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
  const best = [...byDay].sort((a, b) => b.profit - a.profit)[0] ?? null;

  const link = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
    }
    const tail = params.toString();
    return tail === "" ? "/admin/profit" : `/admin/profit?${tail}`;
  };

  return (
    <div>
      {/* The window on the screen, run by run, which is the shape anybody
          sorts or charts. Carrying the dates matters: an export that
          ignores the window somebody set is one they redo by hand. */}
      <PageHeader
        title="Profit"
        detail={`${runDateLabel(from)} to ${runDateLabel(to)}. Every figure here is money that moved, and you can see how each one is worked out.`}
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
                wrong until they are in. */}
            {estimated.length > 0 ? (
              <Link href={`/admin/batch/${estimated[0].id}`} className="btn-admin-go">
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
      <div className="mb-[18px] flex flex-wrap items-center gap-2">
        {every.map((one) => (
          <Link
            key={one.key}
            href={link({ span: one.key })}
            className={`pill-admin ${
              !typed && one.key === chosen.key ? "pill-admin-on" : ""
            }`}
          >
            {one.label}
          </Link>
        ))}
        <form action="/admin/profit" className="soft flex flex-wrap items-center gap-2 p-2">
          <label className="flex items-center gap-1.5 text-[13px] font-semibold" htmlFor="from">
            From
            <input
              id="from"
              name="from"
              type="date"
              defaultValue={from}
              className="field h-[42px] w-auto px-3 py-0 text-[14.5px]"
            />
          </label>
          <label className="flex items-center gap-1.5 text-[13px] font-semibold" htmlFor="to">
            To
            <input
              id="to"
              name="to"
              type="date"
              defaultValue={to}
              className="field h-[42px] w-auto px-3 py-0 text-[14.5px]"
            />
          </label>
          <button className="btn-admin btn-admin-sm">Show that</button>
        </form>
      </div>

      <div className="mb-4 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <Figure
          label="Money in"
          value={naira(sums.gross)}
          detail={`${sums.orders} paid order${sums.orders === 1 ? "" : "s"}`}
        />
        <Figure
          label="Paid to kitchens"
          value={naira(kitchens)}
          detail="What left your hand at counters"
        />
        <Figure
          label="Run costs"
          value={naira(sums.runCosts)}
          detail="Fuel, driver, transport"
        />
        <Figure
          label="Profit"
          value={naira(sums.profit)}
          tone={sums.profit >= 0 ? "mint" : "brand"}
          detail={
            sums.gross === 0 ? "Nothing came in" : `${share}% of everything that came in`
          }
        />
      </div>

      <Panel
        title="The working"
        detail="Nothing hidden. If a number here looks wrong, the run that caused it is in the table below."
        className="mb-[18px]"
      >
        {/* Money in, everything taken off it in the order it is taken, and
            what is left. The same arithmetic as the list under it, at the
            size somebody reads across a desk. */}
        <div className="mt-2.5 flex flex-wrap items-stretch gap-2.5">
          <Box label="Money in" value={sums.gross} note="food + delivery collected" />
          <Sign>−</Sign>
          <Box label="Kitchens" value={kitchens} note="paid at counters" />
          <Sign>−</Sign>
          <Box label="Commission" value={sums.commission} note="earned by promoters" />
          <Sign>−</Sign>
          <Box label="Run costs" value={sums.runCosts} note="fuel, driver, transport" />
          <Sign>+</Sign>
          <Box
            label="Other money"
            value={sums.otherIn - sums.otherOut}
            note={`${sums.aside.length} entr${sums.aside.length === 1 ? "y" : "ies"}`}
          />
          <Sign>=</Sign>
          <Box
            label="Profit"
            value={sums.profit}
            note={sums.gross === 0 ? "nothing came in" : `${share}% margin`}
            dark
          />
        </div>

        {/* Every line that moved it, including the ones too small for a box
            of their own. A figure somebody disputes is disputed at this
            level, not at the summary's. */}
        <dl className="mt-3.5 text-[14.5px]">
          <Line label={`Money in, from ${sums.orders} paid orders`} value={sums.gross} />
          <Line label="The food, at menu prices" value={-sums.foodAtMenu} />
          {sums.overMenu !== 0 && (
            <Line
              label={
                sums.overMenu < 0
                  ? "The counters charged less than the menu"
                  : "The counters charged more than the menu"
              }
              value={-sums.overMenu}
              note="Only across the runs you have reconciled."
            />
          )}
          <Line
            label="Promoter commission"
            value={-sums.commission}
            note="Earned on these orders, whether or not it has been handed over."
          />
          <Line
            label={`Fuel, driver and the rest, across ${sums.runs} runs`}
            value={-sums.runCosts}
          />
          {sums.otherIn > 0 && (
            <Line label="Errands and sales with no run behind them" value={sums.otherIn} />
          )}
          {sums.otherOut > 0 && (
            <Line label="What those cost, and anything else paid out" value={-sums.otherOut} />
          )}
          <div className="flex justify-between gap-3 border-t-[1.5px] border-rule pt-2.5 font-bold">
            <dt>Profit</dt>
            <dd className={`font-mono ${sums.profit >= 0 ? "text-mint" : "text-brand-dark"}`}>
              {naira(sums.profit)}
            </dd>
          </div>
        </dl>

        {estimated.length > 0 && (
          <div className="soft mt-3.5 border-volt-line bg-brand-tint px-3.5 py-2.5 text-[13.5px]">
            <strong>
              {estimated.length} run{estimated.length === 1 ? "" : "s"}
            </strong>{" "}
            still {estimated.length === 1 ? "has" : "have"} no costs typed in, so the profit
            above is the best case. Put the real figures in and this becomes exact.
          </div>
        )}
      </Panel>

      <div className="grid items-start gap-[18px] xl:grid-cols-[1.55fr_1fr]">
        <Panel
          title="Run by run"
          aside={
            <span className="hint">
              {sums.byRun.length} run{sums.byRun.length === 1 ? "" : "s"}
              {lost.length > 0 && ` · ${lost.length} lost money`}
            </span>
          }
        >
          {sums.byRun.length === 0 ? (
            <p className="pt-2 text-[14.5px] text-muted">
              No car went out in this window, so there is nothing to take apart.
            </p>
          ) : (
            <>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <Head>Run</Head>
                    <Head right>Took</Head>
                    <Head right>Food</Head>
                    <Head right>Delivery</Head>
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
                      <td className="py-[11px] pr-2.5 text-right font-mono text-[14.5px]">
                        {naira(run.delivery)}
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
                Took, less what the counters charged and what the car and the promoters cost,
                is the profit on the line. Delivery is what is left of the orders once the menu
                price of the food is out.
              </p>
              {worst && (
                <div className="soft mt-2.5 border-volt-line bg-brand-tint px-3.5 py-2.5 text-[13.5px]">
                  <strong>
                    {runDateLabel(worst.runDate)} · {SLOT_LABEL[worst.slot] ?? worst.kind} lost{" "}
                    {naira(Math.abs(worst.profit))}.
                  </strong>{" "}
                  {worst.orders} order{worst.orders === 1 ? "" : "s"}, {naira(worst.delivery)} of
                  delivery, against {naira(worst.costs)} of fuel, driver and commission.
                </div>
              )}
            </>
          )}
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel
            title="By day of the week"
            size="sm"
            detail="Which days pay for the car, over the window you are reading."
          >
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
              {best && best.profit > 0
                ? `${best.name} carries the window, at ${naira(best.profit)}.`
                : "No day is ahead in this window."}
              {below.length > 0 &&
                ` ${below.map((one) => one.name).join(" and ")} ${
                  below.length === 1 ? "is" : "are"
                } below the line.`}
            </p>
          </Panel>

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

          <Panel
            title="Other money"
            size="sm"
            detail="Errands, sales settled by hand, and anything the shop paid out that was not a run: hosting, data, printing. A cost here is a line with nothing coming in."
          >
            {sums.aside.length === 0 ? (
              <p className="pt-2 text-[14.5px] text-muted">Nothing in this window.</p>
            ) : (
              <ul className="text-[14.5px]">
                {sums.aside.map((one) => (
                  <li
                    key={one.id}
                    className="flex items-center justify-between gap-3 border-t-[1.5px] border-rule py-2.5"
                  >
                    <span className="min-w-0">
                      <strong className="block text-sm">{one.what}</strong>
                      <span className="hint block">
                        {one.happened_on}
                        {one.who ? ` · ${one.who}` : ""} · not through a run
                      </span>
                    </span>
                    <span
                      className={`shrink-0 font-mono font-semibold ${
                        madeOn(one) >= 0 ? "text-mint" : "text-brand-dark"
                      }`}
                    >
                      {naira(madeOn(one))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/admin/money" className="btn-admin btn-admin-sm mt-2.5 w-full">
              Add an entry
            </Link>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/** One figure in the working, at the board's thirty-one pixels. */
function Box({
  label,
  value,
  note,
  dark = false,
}: {
  label: string;
  value: number;
  note: string;
  dark?: boolean;
}) {
  return (
    <div
      className={`min-w-[150px] flex-1 rounded-xl border-2 border-ink px-[15px] py-[13px] ${
        dark ? "bg-ink text-paper" : "bg-paper text-ink"
      }`}
    >
      <p className={`ticket ${dark ? "text-paper/65" : "text-muted"}`}>{label}</p>
      <p className="font-display text-[31px] font-black leading-[1.05]">
        {value < 0 ? `−${naira(Math.abs(value))}` : naira(value)}
      </p>
      <p className="mt-0.5 text-[12.5px] opacity-80">{note}</p>
    </div>
  );
}

/** The operator between two boxes, which is what makes it a sum. */
function Sign({ children }: { children: React.ReactNode }) {
  return (
    <div aria-hidden className="flex items-center text-[26px] font-bold text-muted">
      {children}
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

function Line({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note?: string;
}) {
  return (
    <div className="flex justify-between gap-3 border-t-[1.5px] border-rule py-2.5">
      <dt className="min-w-0">
        <span className="block">{label}</span>
        {note && <span className="hint block">{note}</span>}
      </dt>
      <dd className={`shrink-0 font-mono font-semibold ${value < 0 ? "text-brand-dark" : ""}`}>
        {value < 0 ? `−${naira(Math.abs(value))}` : naira(value)}
      </dd>
    </div>
  );
}
