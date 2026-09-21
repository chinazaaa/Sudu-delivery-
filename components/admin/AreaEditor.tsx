"use client";

import { useState } from "react";
import { naira } from "@/lib/money";
import { serialiseAreas, type Area } from "@/lib/areas";
import { feeFor, type Band } from "@/lib/fees";

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
  runBands,
  sameDayBands,
}: {
  initial: Area[];
  /** The two ladders as they stand, so each row can show what it becomes. */
  runBands: Band[];
  sameDayBands: Band[];
}) {
  const [areas, setAreas] = useState(
    initial.map((one) => ({
      ...one,
      runExtra: String(one.runExtra),
      sameDayExtra: String(one.sameDayExtra),
    }))
  );

  const parsed: Area[] = areas.map((one) => ({
    id: one.id.trim(),
    name: one.name.trim() || one.id.trim(),
    runExtra: Number(one.runExtra) || 0,
    sameDayExtra: Number(one.sameDayExtra) || 0,
    sameDay: one.sameDay,
  }));

  const edit = (index: number, patch: Partial<(typeof areas)[number]>) =>
    setAreas(areas.map((one, at) => (at === index ? { ...one, ...patch } : one)));

  const runFrom = runBands.length > 0 ? feeFor(1, null, runBands) : 0;
  const sameDayFrom = sameDayBands.length > 0 ? feeFor(1, null, sameDayBands) : 0;

  return (
    <div className="space-y-3">
      <input type="hidden" name="delivery_areas" value={serialiseAreas(parsed)} />

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
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() =>
          setAreas([
            ...areas,
            { id: "", name: "", runExtra: "0", sameDayExtra: "0", sameDay: false },
          ])
        }
        className="chip border-black/10 bg-white text-sm"
      >
        Add an area
      </button>

      <p className="text-xs text-muted">
        Sangotedo is not on this list: it is what the ladders above are
        written for, and everything here is measured against it. A cart with
        two areas in it pays the dearer one, because one car fetches all of
        it.
      </p>
    </div>
  );
}

/** A name turned into something a row can hold. Made once and then kept. */
function slug(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
