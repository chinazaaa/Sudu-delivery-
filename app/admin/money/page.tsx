import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
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
import MoneyForm from "@/components/admin/MoneyForm";

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
        detail="Money in and out with no run behind it: errands, sales settled by hand, and what the shop pays for. It all counts towards the profit."
        backHref="/admin"
        backLabel="Dashboard"
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Came in" value={totals.took} money />
        <Stat
          label="Of that, delivery"
          value={totals.fee}
          money
          hint="The part that is the trip"
        />
        <Stat label="Cost us" value={totals.spent} money />
        <Stat
          label="Made"
          value={totals.made}
          money
          tone={totals.made >= 0 ? "good" : "warn"}
          hint={`Last ${WINDOW_DAYS} days`}
        />
      </div>

      <MoneyForm action={addOtherMoney} today={lagosToday()} />

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
                    {one.how_many > 1 ? ` · ${one.how_many} of them` : ""}
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
                    {/* Nothing came in, so this is something the shop paid
                        for rather than a job that went badly. */}
                    {one.took === 0
                      ? `${naira(one.spent)} paid out`
                      : `${naira(one.took)} in` +
                        (one.fee > 0 ? ` (${naira(one.fee)} delivery)` : "") +
                        (one.spent > 0 ? ` · ${naira(one.spent)} out` : "")}
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
