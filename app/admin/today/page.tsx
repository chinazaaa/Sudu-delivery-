import Link from "next/link";

import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import Checklist from "@/components/Checklist";
import Many from "@/components/Many";
import ActionButton from "@/components/ActionButton";
import { everythingAtTheCounter, setDayCosts } from "@/app/admin/actions";
import { dayCostSoFar } from "@/lib/day-costs";
import { dayToDrive, drivingToday } from "@/lib/admin";
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
  // Today while there is anything left to do with it, and then the next
  // day with something going: this page sat on a finished Saturday all
  // evening while tomorrow's run was the only thing anybody could act on.
  const day = await dayToDrive();
  const sheet = await drivingToday(day);

  if (!sheet) {
    return (
      <div>
        <PageHeader
          title={`Driving ${runDateLabel(day).toLowerCase()}`}
          detail={
          day === lagosToday()
            ? "Everything going out today, as one shopping trip."
            : "Everything going out that day, as one shopping trip."
        }
          actions={
            <Link href="/admin/runs" className="btn-quiet px-4 py-2.5 text-sm">
              All runs
            </Link>
          }
        />
        <p className="card text-[15px] text-muted">
          Nothing is going. A run or a car of its own will show up here the
          moment one is.
        </p>
      </div>
    );
  }

  const toPay = sheet.counter.reduce((all, one) => all + one.expectedFoodTotal, 0);
  // What the day has already been told, added back up out of the shares.
  const already = dayCostSoFar(sheet.parts);

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

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Bags" value={sheet.handout.length} />
        <Stat label="Items" value={sheet.items} />
        <Stat label="The card" value={toPay} money />
      </div>

      {/*
        What the day cost, typed once.

        She goes to the market once, so the fare is one fare. Asking for
        it on each batch asks for it twice, and typed twice it is counted
        twice: the day's profit comes out short by a whole fare and
        nothing anywhere says why. Shared out across them by how many
        bags each is carrying, because every sum in the shop reads costs
        off a batch. See lib/day-costs.ts.
      */}
      <section className="card mb-4">
        <h2 className="font-bold">What {day === lagosToday() ? "today" : "the day"} cost</h2>
        <p className="mb-3 text-sm text-muted">
          One drive, one set of costs. Typed here and shared across what is
          going, so nothing is counted twice.
        </p>
        <form action={setDayCosts} className="space-y-3">
          <input type="hidden" name="day" value={day} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { name: "transport_cost", label: "Transport", value: already.transport },
              { name: "fuel_cost", label: "Fuel", value: already.fuel },
              { name: "driver_cost", label: "Driver", value: already.driver },
              { name: "other_cost", label: "Anything else", value: already.other },
            ].map((box) => (
              <div key={box.name}>
                <label className="label" htmlFor={box.name}>
                  {box.label}
                </label>
                <input
                  id={box.name}
                  name={box.name}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  defaultValue={box.value > 0 ? box.value : ""}
                  placeholder="0"
                  className="field field-admin"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="label" htmlFor="cost_note">
              A note, if anything was odd
            </label>
            <input
              id="cost_note"
              name="cost_note"
              defaultValue={sheet.parts[0]?.note ?? ""}
              placeholder="Went to Ikoyi as well"
              className="field field-admin"
            />
          </div>
          <ActionButton className="btn-admin" done="Saved ✓">
            Save what {day === lagosToday() ? "today" : "that day"} cost
          </ActionButton>
        </form>
      </section>

      {/*
        Where the books live, and nothing else.

        Going to the market is going to the market. Whether somebody
        bought through the run or asked for a car of its own is a fact
        about what they paid and when they were promised it, not about
        the driving, and the driving is what this page is. So the split
        is down here, named for what it is actually for: each one holds
        its own costs, its own stage and its own Settle, and nothing on
        this page moves an order between them.
      */}
      <section className="card mb-4 space-y-2">
        <h2 className="font-bold">Costs and stages</h2>
        <p className="text-sm text-muted">
          One evening, driven once. These are only where each order&apos;s
          money and timeline live.
        </p>
        <ul className="space-y-1.5">
          {sheet.parts.map((part) => (
            <li key={part.id}>
              <Link
                href={`/admin/batch/${part.id}`}
                className="flex items-baseline justify-between gap-3 border-t-[1.5px] border-rule py-2 text-[15px]"
              >
                <span className="min-w-0 font-semibold">{part.label}</span>
                <span className="shrink-0 text-sm text-muted">
                  {part.paid} paid →
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

      {/* Nothing about unpaid orders. This is the sheet somebody reads
          while driving, and an order nobody paid for is not in the car:
          it is not bought, not bagged and not dropped. Chasing it is the
          shop's job at a desk, where the dashboard and the orders page
          already keep it. A list of food that is not coming, on the list
          of food that is, is the one thing on this page that can be
          misread at a counter. */}
    </div>
  );
}
