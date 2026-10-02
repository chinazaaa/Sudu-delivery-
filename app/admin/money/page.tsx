import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import SaveButton from "@/components/SaveButton";
import { naira } from "@/lib/money";
import { lagosToday } from "@/lib/time";
import {
  madeOn,
  otherMoneySince,
  otherMoneyTotals,
  windowStart,
  WINDOW_DAYS,
} from "@/lib/other-money";
import { addOtherMoney, removeOtherMoney } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Money that did not come through a run.
 *
 * Somebody pays ₦20,000 for an errand with no car behind it. The figures are
 * worked out per run, so the only way to see that money used to be to invent
 * a customer, invent an order, mark it paid and mark it delivered: four
 * steps, and a bag on a run sheet that nobody was driving anywhere.
 *
 * A notebook page instead. What it was, what came in, what it cost, on a
 * day. It is deliberately not a customer, not an order and not on any run,
 * and it should never grow into one.
 */
export default async function OtherMoneyPage() {
  const rows = await otherMoneySince(windowStart());
  const totals = otherMoneyTotals(rows);

  return (
    <div>
      <PageHeader
        title="Other money"
        detail="Jobs with no run behind them. These count towards the profit on the dashboard."
        backHref="/admin"
        backLabel="Dashboard"
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="Came in" value={totals.took} money />
        <Stat label="Cost us" value={totals.spent} money />
        <Stat
          label="Made"
          value={totals.made}
          money
          tone={totals.made >= 0 ? "good" : "warn"}
          hint={`Last ${WINDOW_DAYS} days`}
        />
      </div>

      <form action={addOtherMoney} className="card mb-4 space-y-3">
        <h2 className="font-bold">Add one</h2>

        <div>
          <label className="label" htmlFor="what">
            What was it
          </label>
          <input
            id="what"
            name="what"
            required
            placeholder="Found an adapter in Sangotedo and dropped it off"
            className="field"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="took">
              They paid
            </label>
            <input
              id="took"
              name="took"
              inputMode="numeric"
              placeholder="20000"
              className="field"
            />
          </div>
          <div>
            <label className="label" htmlFor="spent">
              It cost us
            </label>
            <input
              id="spent"
              name="spent"
              inputMode="numeric"
              placeholder="14000"
              className="field"
            />
            <p className="mt-1 text-xs text-muted">
              What you handed over for it: the thing itself, the bike, whatever
              it took. Leave it empty and the whole lot counts as profit.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="who">
              Who for
            </label>
            <input
              id="who"
              name="who"
              placeholder="A name, if it is worth remembering"
              className="field"
            />
          </div>
          <div>
            <label className="label" htmlFor="happened_on">
              When
            </label>
            <input
              id="happened_on"
              name="happened_on"
              type="date"
              defaultValue={lagosToday()}
              className="field"
            />
            <p className="mt-1 text-xs text-muted">
              The day the work happened, not the day you are writing it down.
            </p>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="note">
            Anything else
          </label>
          <input id="note" name="note" className="field" />
        </div>

        <SaveButton>Add it</SaveButton>
      </form>

      {rows.length === 0 ? (
        <p className="card text-sm text-muted">
          Nothing here yet. Anything you were paid for that never became an
          order belongs on this page rather than as a made-up order on a run.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((one) => (
            <li key={one.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold">{one.what}</p>
                  <p className="text-sm text-muted">
                    {one.happened_on}
                    {one.who ? ` · ${one.who}` : ""}
                  </p>
                  {one.note && <p className="text-sm text-muted">{one.note}</p>}
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`font-extrabold ${
                      madeOn(one) >= 0 ? "text-mint" : "text-brand"
                    }`}
                  >
                    {naira(madeOn(one))}
                  </p>
                  <p className="text-xs text-muted">
                    {naira(one.took)} in
                    {one.spent > 0 ? ` · ${naira(one.spent)} out` : ""}
                  </p>
                </div>
              </div>

              <form action={removeOtherMoney} className="mt-2">
                <input type="hidden" name="id" value={one.id} />
                <button className="text-sm font-medium text-muted hover:text-red-700">
                  Take it off
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
