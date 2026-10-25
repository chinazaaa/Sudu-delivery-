"use client";

import { useState } from "react";
import { naira } from "@/lib/money";
import {
  everyPair,
  pairExtra,
  serialiseAreas,
  serialiseAreaPairs,
  HOME,
  MIXED_AREA_EXTRA,
  type Area,
  type AreaPair,
} from "@/lib/areas";
import { feeFor, type Band } from "@/lib/fees";
import { DAY_NAMES, openDays, openDaysText } from "@/lib/open-days";

/**
 * Where the shop delivers from, beyond Sangotedo.
 *
 * Sangotedo is not in this list. It is what the ladders were written for, so
 * it is the thing everything else is measured against and it cannot be given
 * an extra without the word "extra" losing its meaning.
 *
 * The numbers underneath are the point: an extra on its own is abstract, and
 * "₦4,000 becomes ₦6,500" is the decision actually being made.
 */
export default function AreaEditor({
  initial,
  initialPairs = [],
  runBands,
  sameDayBands,
}: {
  initial: Area[];
  /** What a stop between each two of them costs. Filled in for the pairs
   *  somebody has priced; the rest fall back until they are. */
  initialPairs?: AreaPair[];
  /** The two ladders as they stand, so each row can show what it becomes. */
  runBands: Band[];
  sameDayBands: Band[];
}) {
  const [areas, setAreas] = useState(
    initial.map((one) => ({
      ...one,
      runExtra: String(one.runExtra),
      sameDayExtra: String(one.sameDayExtra),
      // Held as the list of weekdays while it is being ticked, and written
      // back as text on save. Empty text means every day, so an area
      // nobody has touched keeps behaving as it always has.
      sameDayDays: one.sameDayDays?.trim()
        ? openDays(one.sameDayDays)
        : [0, 1, 2, 3, 4, 5, 6],
    }))
  );

  const parsed: Area[] = areas.map((one) => ({
    id: one.id.trim(),
    name: one.name.trim() || one.id.trim(),
    runExtra: Number(one.runExtra) || 0,
    sameDayExtra: Number(one.sameDayExtra) || 0,
    sameDay: one.sameDay,
    sameDayDays: openDaysText(one.sameDayDays ?? []),
  }));

  const edit = (index: number, patch: Partial<(typeof areas)[number]>) =>
    setAreas(areas.map((one, at) => (at === index ? { ...one, ...patch } : one)));

  /*
   * What a second stop costs, by which two places it is between.
   *
   * Kept as typed text rather than numbers so a box can be emptied while
   * somebody is halfway through typing one, the same as the boxes above.
   * The key is the two ids in a fixed order, so it does not matter which
   * of the pair the grid happens to draw first.
   */
  const [hops, setHops] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      initialPairs.map((one) => [[one.a, one.b].sort().join("\t"), String(one.extra)])
    )
  );
  const hopKey = (a: string, b: string) => [a, b].sort().join("\t");
  const hopOf = (a: string, b: string) =>
    hops[hopKey(a, b)] ?? String(pairExtra(initialPairs, a, b, MIXED_AREA_EXTRA));

  // Home belongs in this grid even though it is not in the list above. It
  // adds nothing to the distance, because every run passes it on the way
  // back, but somebody still has to stop the car and go into the shop.
  const everywhereNamed = [
    { id: HOME.id, name: parsed.find((one) => one.id === "")?.name ?? HOME.name },
    ...parsed.filter((one) => one.id !== "" && one.id !== undefined),
  ].filter((one, at, all) => all.findIndex((other) => other.id === one.id) === at);

  const pairRows = everyPair(everywhereNamed.map((one) => one.id));
  const nameOf = (id: string) =>
    everywhereNamed.find((one) => one.id === id)?.name ?? id;

  const pairsOut: AreaPair[] = pairRows.map(([a, b]) => ({
    a,
    b,
    extra: Number(hopOf(a, b)) || 0,
  }));

  const runFrom = runBands.length > 0 ? feeFor(1, null, runBands) : 0;
  const sameDayFrom = sameDayBands.length > 0 ? feeFor(1, null, sameDayBands) : 0;

  return (
    <div className="space-y-3">
      <input type="hidden" name="delivery_areas" value={serialiseAreas(parsed)} />
      <input type="hidden" name="area_pairs" value={serialiseAreaPairs(pairsOut)} />

      <ul className="space-y-3">
        {areas.map((area, index) => (
          <li key={index} className="space-y-2 rounded-2xl bg-shell p-3">
            <div className="flex items-center gap-2">
              <input
                value={area.name}
                onChange={(event) =>
                  edit(index, {
                    name: event.target.value,
                    // The id is what a restaurant row holds, so it is made
                    // from the name once and then left alone: renaming an
                    // area must not orphan every restaurant in it.
                    id: area.id.trim() === "" ? slug(event.target.value) : area.id,
                  })
                }
                placeholder="Lekki"
                className="field flex-1 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => setAreas(areas.filter((_, at) => at !== index))}
                className="chip shrink-0 border-black/10 bg-white text-sm"
              >
                Remove
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-xs font-semibold text-muted">
                Extra on a run
                <input
                  value={area.runExtra}
                  onChange={(event) =>
                    edit(index, { runExtra: event.target.value.replace(/\D/g, "") })
                  }
                  inputMode="numeric"
                  className="field mt-1 py-2 text-sm"
                />
                {runFrom > 0 && (
                  <span className="mt-1 block font-normal text-muted">
                    {naira(runFrom)} becomes{" "}
                    <span className="font-bold text-ink">
                      {naira(runFrom + (Number(area.runExtra) || 0))}
                    </span>
                  </span>
                )}
              </label>

              <label className="text-xs font-semibold text-muted">
                Extra on a car of its own
                <input
                  value={area.sameDayExtra}
                  onChange={(event) =>
                    edit(index, { sameDayExtra: event.target.value.replace(/\D/g, "") })
                  }
                  inputMode="numeric"
                  disabled={!area.sameDay}
                  className="field mt-1 py-2 text-sm disabled:opacity-40"
                />
                {area.sameDay && sameDayFrom > 0 && (
                  <span className="mt-1 block font-normal text-muted">
                    {naira(sameDayFrom)} becomes{" "}
                    <span className="font-bold text-ink">
                      {naira(sameDayFrom + (Number(area.sameDayExtra) || 0))}
                    </span>
                  </span>
                )}
              </label>
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={area.sameDay}
                onChange={(event) => edit(index, { sameDay: event.target.checked })}
                className="mt-1"
              />
              <span>
                A car of its own can go here
                <span className="block text-xs text-muted">
                  Three hours is the whole promise of one: fetch it, drive it
                  over. An hour each way eats that before the kitchen has
                  started, so leave this off for anywhere far and those orders
                  ride a run.
                </span>
              </span>
            </label>

            {/* Which days, once it can go at all.

                Ajah takes a car, and only on the day the shop is already
                going that way. Without this the switch was all or nothing:
                on meant somebody could buy a Monday car to Ajah that
                nobody was ever going to drive. */}
            {area.sameDay && (
              <div className="mt-2">
                <span className="label">On these days</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {DAY_NAMES.map((day, weekday) => {
                    const on = area.sameDayDays.includes(weekday);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() =>
                          edit(index, {
                            sameDayDays: on
                              ? area.sameDayDays.filter((one) => one !== weekday)
                              : [...area.sameDayDays, weekday],
                          })
                        }
                        className={`pill-admin min-h-[34px] px-2.5 text-[13px] ${
                          on ? "pill-admin-on" : ""
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
                <p className="hint mt-1">
                  {area.sameDayDays.length === 7
                    ? "Every day."
                    : area.sameDayDays.length === 0
                      ? "No days, so no car goes here at all. Untick the box above instead."
                      : `Only ${area.sameDayDays
                          .slice()
                          .sort((a, b) => a - b)
                          .map((one) => DAY_NAMES[one])
                          .join(", ")}.`}
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() =>
          setAreas([
            ...areas,
            {
              id: "",
              name: "",
              runExtra: "0",
              sameDayExtra: "0",
              sameDay: false,
              sameDayDays: [0, 1, 2, 3, 4, 5, 6],
            },
          ])
        }
        className="chip border-black/10 bg-white text-sm"
      >
        Add an area
      </button>

      <p className="text-xs text-muted">
        Sangotedo is not on this list: it is what the ladders above are
        written for, and everything here is measured against it. A cart that
        reaches two areas pays the dearer one, because one car fetches all of
        it, and then a stop from the table below.
      </p>

      {pairRows.length > 0 && (
        <div className="space-y-2 border-t-[1.5px] border-rule pt-3">
          <h3 className="text-sm font-bold">What a second stop costs</h3>
          <p className="text-xs text-muted">
            The areas above say how far the car goes. This says what it costs
            to stop twice, which is not the same everywhere: two places
            minutes apart is one queue more, and crossing the town is an
            afternoon. Sangotedo is in here because somebody still has to
            stop the car and go into the shop, even on the way back.
          </p>
          <ul className="space-y-2">
            {pairRows.map(([a, b]) => (
              <li key={hopKey(a, b)} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm">
                  {nameOf(a)} and {nameOf(b)}
                </span>
                <input
                  value={hopOf(a, b)}
                  onChange={(event) =>
                    setHops({
                      ...hops,
                      [hopKey(a, b)]: event.target.value.replace(/\D/g, ""),
                    })
                  }
                  inputMode="numeric"
                  aria-label={`What a stop in both ${nameOf(a)} and ${nameOf(b)} costs`}
                  className="field w-28 py-2 text-sm"
                />
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">
            A cart reaching three areas pays the cheapest way of joining all
            three, rather than every pair added up: that is the route a
            driver actually takes.
          </p>
        </div>
      )}
    </div>
  );
}

/** A name turned into something a row can hold. Made once and then kept. */
function slug(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
