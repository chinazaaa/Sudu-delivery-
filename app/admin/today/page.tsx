import Link from "next/link";

import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import Checklist from "@/components/Checklist";
import Many from "@/components/Many";
import { everythingAtTheCounter } from "@/app/admin/actions";
import { drivingToday } from "@/lib/admin";
import { naira } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { saidPicksLine } from "@/lib/picks";
import { lagosToday, runDateLabel } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * Everything going out today, as one shopping trip.
 *
 * A scheduled run and a car of its own on one evening are two batches
 * because they were two promises: one shared trip at a run's price, one
 * person's own trip at a car's. They are not two drives. Nobody goes to
 * Chicken Republic twice in an evening because the orders came through
 * different doors, and the answer up to now was to move orders from one
 * batch onto the other by hand, which quietly rewrites what each of them
 * paid for.
 *
 * So nothing is moved. This is the list she reads while driving. Each
 * batch keeps its own page, where its stage, its costs, its profit and
 * its Settle button live, because those are the parts that are genuinely
 * about one promise rather than about one evening.
 */
export default async function DrivingTodayPage() {
  const day = lagosToday();
  const sheet = await drivingToday(day);

  if (!sheet) {
    return (
      <div>
        <PageHeader
          title={`Driving ${runDateLabel(day).toLowerCase()}`}
          detail="Everything going out today, as one shopping trip."
          actions={
            <Link href="/admin/runs" className="btn-quiet px-4 py-2.5 text-sm">
              All runs
            </Link>
          }
        />
        <p className="card text-[15px] text-muted">
          Nothing is going today. A run or a car of its own will show up here
          the moment one is going.
        </p>
      </div>
    );
  }

  const toPay = sheet.counter.reduce((all, one) => all + one.expectedFoodTotal, 0);

  return (
    <div>
      <PageHeader
        title={`Driving ${runDateLabel(day).toLowerCase()}`}
        detail={
          sheet.parts.length === 1
            ? "Everything going out today."
            : `${sheet.parts.length} of them going today, as one shopping trip.`
        }
        actions={
          <Link href="/admin/runs" className="btn-quiet px-4 py-2.5 text-sm">
            All runs
          </Link>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Bags" value={sheet.handout.length} />
        <Stat label="Items" value={sheet.items} />
        <Stat label="The card" value={toPay} money />
        <Stat
          label="Not paid"
          value={sheet.unpaid.length}
          tone={sheet.unpaid.length > 0 ? "warn" : undefined}
        />
      </div>

      {/* What this sheet is made of, and where the rest of each one lives.
          Nothing here moves an order between them: the fee somebody paid
          and the time they were promised belong to the batch they ordered
          onto, and so do its costs and its stage. */}
      <section className="card mb-4 space-y-2">
        <h2 className="font-bold">What is going</h2>
        <ul className="space-y-1.5">
          {sheet.parts.map((part) => (
            <li key={part.id}>
              <Link
                href={`/admin/batch/${part.id}`}
                className="flex items-baseline justify-between gap-3 border-t-[1.5px] border-rule py-2 text-[15px]"
              >
                <span className="min-w-0 font-semibold">{part.label}</span>
                <span className="shrink-0 text-sm text-muted">
                  {part.paid} paid · costs and stage →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="card mb-4 space-y-3">
        <div>
          <h2 className="font-bold">What to buy</h2>
          <p className="text-sm text-muted">
            Added up across everything going today, so a counter is one stop
            however many of them ordered from it. Unpaid orders are not on it,
            because their food is not bought.
          </p>
        </div>

        {sheet.counter.length === 0 ? (
          <p className="text-sm text-muted">Nothing paid for yet.</p>
        ) : (
          sheet.counter.map((place) => (
            <div key={place.restaurant} className="rounded-2xl border border-black/10 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-bold">
                  {place.restaurant}
                  {place.melts === true && (
                    <span className="tag ml-2">melts · buy it last</span>
                  )}
                </h3>
                <span className="text-sm font-semibold">
                  {naira(place.expectedFoodTotal)}
                </span>
              </div>
              {/* The ticks are this browser's own, as they are everywhere
                  else. The first one says she is at a counter, and moves
                  everything going today on with it: she is standing at one
                  till for all of them. */}
              <div className="mt-2">
                <Checklist
                  id={`today-${day}-${place.restaurant}`}
                  label="bought"
                  arrived={everythingAtTheCounter.bind(null, day)}
                  items={place.lines.map((line) => ({
                    key: `${line.name}|${line.choices.join("|")}`,
                    qty: line.qty,
                    text: line.name,
                    detail: saidPicksLine(line.picks, line.choices),
                  }))}
                />
              </div>
            </div>
          ))
        )}
      </section>

      <section className="card mb-4 space-y-3">
        <div>
          <h2 className="font-bold">Bags</h2>
          <p className="text-sm text-muted">
            Who gets what. Marking them delivered still happens on each one&apos;s
            own page above, which is also where its costs and profit live.
          </p>
        </div>
        <ul className="space-y-2">
          {sheet.handout.map((order) => (
            <li key={order.id} className="rounded-2xl border border-black/10 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-bold">
                  {order.for_name ?? order.customer_name}
                </span>
                <span className="text-sm text-muted">
                  {order.hostel} · {formatPhone(order.customer_phone)}
                </span>
              </div>
              <ul className="mt-1 text-sm text-ink/80">
                {order.lines.map((line) => (
                  <li key={line.id} className="flex items-baseline gap-1.5">
                    <Many qty={line.qty} small /> {line.name}
                    {line.choices.length > 0 && (
                      <span className="text-muted">
                        {" "}· {saidPicksLine(line.picks, line.choices)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      {sheet.unpaid.length > 0 && (
        <section className="card space-y-2">
          <h2 className="font-bold">Not paid, not travelling</h2>
          <ul className="space-y-1 text-sm">
            {sheet.unpaid.map((order) => (
              <li key={order.id} className="flex justify-between gap-3">
                <span>
                  {order.for_name ?? order.customer_name} ·{" "}
                  {formatPhone(order.customer_phone)}
                </span>
                <span className="font-semibold">{naira(order.total)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
