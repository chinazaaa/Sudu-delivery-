import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import { naira } from "@/lib/money";
import { lagosToday } from "@/lib/time";
import { profitBetween } from "@/lib/profit";
import { madeOn } from "@/lib/other-money";

export const dynamic = "force-dynamic";

/**
 * What the shop made, over a window somebody picks, with the working shown.
 *
 * The dashboard answers this with one figure over a fixed four weeks, which
 * is the right question in the morning and the wrong one at a month end. A
 * number you cannot take apart is a number you end up not believing, so
 * every line that moved it is here, in the order it is taken off.
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

  const sums = await profitBetween(from, to);

  return (
    <div>
      <PageHeader
        title="Profit"
        detail="Money in, everything taken off it, and what is left."
        backHref="/admin"
        backLabel="Dashboard"
      />

      <div className="mb-3 flex flex-wrap gap-2">
        {every.map((one) => (
          <Link
            key={one.key}
            href={`/admin/profit?span=${one.key}`}
            className={`chip text-sm ${
              !typed && one.key === chosen.key
                ? "border-brand bg-brand-tint font-bold text-brand-dark"
                : ""
            }`}
          >
            {one.label}
          </Link>
        ))}
      </div>

      {/* A plain form, so it works before anything has loaded and the window
          stays in the address afterwards. */}
      <form action="/admin/profit" className="card mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="from">
            From
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={from}
            className="field w-auto py-2 text-sm"
          />
        </div>
        <div>
          <label className="label" htmlFor="to">
            To
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={to}
            className="field w-auto py-2 text-sm"
          />
        </div>
        <button className="btn-quiet px-4 py-2 text-sm">Show that</button>
      </form>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Money in" value={sums.gross} money hint={`${sums.orders} paid orders`} />
        <Stat label="Delivery margin" value={sums.margin} money hint="Money in, less the food" />
        <Stat label="Costs" value={sums.commission + sums.runCosts + sums.otherOut} money />
        <Stat
          label="Profit"
          value={sums.profit}
          money
          tone={sums.profit >= 0 ? "good" : "warn"}
          hint={`${from} to ${to}`}
        />
      </div>

      <section className="card mb-4">
        <h2 className="mb-2 font-bold">How it is worked out</h2>
        <dl className="divide-y divide-black/5 text-sm">
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
          <div className="flex justify-between gap-3 border-t border-black/10 pt-2 text-base font-extrabold">
            <dt>Profit</dt>
            <dd className={sums.profit >= 0 ? "text-mint" : "text-brand"}>
              {naira(sums.profit)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="card space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">Money with no run behind it</h2>
          <Link href="/admin/money" className="btn-quiet px-3 py-1.5 text-sm">
            Add one
          </Link>
        </div>
        <p className="text-sm text-muted">
          Errands, sales settled by hand, and anything the shop paid out that
          was not a run: hosting, data, printing. A cost here is a line with
          nothing coming in.
        </p>
        {sums.aside.length === 0 ? (
          <p className="text-sm text-muted">Nothing in this window.</p>
        ) : (
          <ul className="divide-y divide-black/5 text-sm">
            {sums.aside.map((one) => (
              <li key={one.id} className="flex justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block font-medium">{one.what}</span>
                  <span className="block text-xs text-muted">
                    {one.happened_on}
                    {one.who ? ` · ${one.who}` : ""}
                  </span>
                </span>
                <span
                  className={`shrink-0 font-semibold ${
                    madeOn(one) >= 0 ? "text-mint" : "text-brand"
                  }`}
                >
                  {naira(madeOn(one))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
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
    <div className="flex justify-between gap-3 py-2">
      <dt className="min-w-0">
        <span className="block">{label}</span>
        {note && <span className="block text-xs text-muted">{note}</span>}
      </dt>
      <dd className={`shrink-0 font-semibold ${value < 0 ? "text-brand" : ""}`}>
        {value < 0 ? `−${naira(Math.abs(value))}` : naira(value)}
      </dd>
    </div>
  );
}
