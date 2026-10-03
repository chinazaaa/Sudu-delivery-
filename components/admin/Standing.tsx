"use client";

import { useState } from "react";
import SaveButton from "@/components/SaveButton";
import { naira } from "@/lib/money";
import { COST_KINDS } from "@/lib/other-money";
import type { Standing } from "@/lib/standing";

/**
 * The costs that come back every month.
 *
 * Folded away, because most of what a shop pays for happens once and a list
 * of four subscriptions above the form somebody actually came to use is a
 * list in the way. Open it and each one can be repriced, paused for a month
 * or two, or dropped altogether, which is the whole reason it is a list
 * rather than a note somewhere.
 */
export default function StandingCosts({
  rows,
  save,
  remove,
  thisMonth,
}: {
  rows: Standing[];
  save: (form: FormData) => Promise<void>;
  remove: (form: FormData) => Promise<void>;
  thisMonth: string;
}) {
  const [adding, setAdding] = useState(false);
  const on = rows.filter((one) => one.active);
  const every = on.reduce((sum, one) => sum + one.amount, 0);

  return (
    <section className="card mb-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">Every month</h2>
        <button
          type="button"
          onClick={() => setAdding((was) => !was)}
          className="btn-quiet px-3 py-1.5 text-sm"
        >
          {adding ? "Never mind" : "Add one"}
        </button>
      </div>

      <p className="text-sm text-muted">
        {on.length === 0
          ? "Nothing yet. A subscription or a bank's monthly charge goes here and writes itself every month, so you only type it once."
          : `${on.length} of these, ${naira(every)} a month. They write themselves, and the months already recorded keep whatever they cost at the time.`}
      </p>

      {adding && (
        <form action={save} className="space-y-3 rounded-xl bg-black/[0.03] p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="s-what">
                What is it
              </label>
              <input
                id="s-what"
                name="what"
                required
                placeholder="Supabase"
                className="field"
              />
            </div>
            <div>
              <label className="label" htmlFor="s-kind">
                What kind of cost
              </label>
              <input
                id="s-kind"
                name="kind"
                list="standing-kinds"
                placeholder="Software"
                className="field"
              />
              <datalist id="standing-kinds">
                {COST_KINDS.map((one) => (
                  <option key={one} value={one} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="s-amount">
                How much a month
              </label>
              <input
                id="s-amount"
                name="amount"
                inputMode="numeric"
                placeholder="18000"
                className="field"
              />
            </div>
            <div>
              <label className="label" htmlFor="s-day">
                On which day
              </label>
              <input
                id="s-day"
                name="on_day"
                inputMode="numeric"
                defaultValue="1"
                className="field"
              />
              <p className="mt-1 text-xs text-muted">
                1 to 28, so every month has one.
              </p>
            </div>
            <div>
              <label className="label" htmlFor="s-from">
                Starting from
              </label>
              <input
                id="s-from"
                name="from_month"
                type="month"
                defaultValue={thisMonth}
                className="field"
              />
              <p className="mt-1 text-xs text-muted">
                Back-date it and the months between are written too.
              </p>
            </div>
          </div>

          <SaveButton>Add it</SaveButton>
        </form>
      )}

      {rows.length > 0 && (
        <ul className="divide-y divide-black/5">
          {rows.map((one) => (
            <li key={one.id} className="py-3">
              <form action={save} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={one.id} />
                <input type="hidden" name="kind" value={one.kind} />
                <input type="hidden" name="note" value={one.note} />

                <div className="min-w-0 grow">
                  <span className="block font-semibold">
                    {one.what}
                    {!one.active && (
                      <span className="ml-2 chip border-black/10 bg-shell text-xs">
                        Paused
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-muted">
                    {one.kind || "No kind"} · on the {one.on_day}
                    {one.made_through ? ` · written through ${one.made_through.slice(0, 7)}` : ""}
                  </span>
                  <input type="hidden" name="what" value={one.what} />
                </div>

                <div className="w-28">
                  <label className="label" htmlFor={`amt-${one.id}`}>
                    A month
                  </label>
                  <input
                    id={`amt-${one.id}`}
                    name="amount"
                    inputMode="numeric"
                    defaultValue={one.amount}
                    className="field py-2 text-sm"
                  />
                </div>
                {/* A hidden "off" before the box, so unticking it posts
                    something: an unticked box posts nothing at all, which is
                    how a switch ends up with no way back. */}
                <div className="w-20">
                  <label className="label" htmlFor={`day-${one.id}`}>
                    Day
                  </label>
                  <input
                    id={`day-${one.id}`}
                    name="on_day"
                    inputMode="numeric"
                    defaultValue={one.on_day}
                    className="field py-2 text-sm"
                  />
                </div>

                {/* A hidden "off" before the box, so unticking it posts
                    something: an unticked box posts nothing at all, which is
                    how a switch ends up with no way back. */}
                <input type="hidden" name="active" value="off" />
                <label className="flex items-center gap-2 pb-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    name="active"
                    value="on"
                    defaultChecked={one.active}
                  />
                  Running
                </label>

                <SaveButton className="px-3 py-2 text-sm">Save</SaveButton>
              </form>

              <form action={remove} className="mt-1">
                <input type="hidden" name="id" value={one.id} />
                <button className="text-xs font-medium text-muted hover:text-red-700">
                  Drop it altogether
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted">
        Changing what it costs changes next month. Pausing stops it being
        written without losing it. Either way, what is already recorded stays
        at what it really cost then.
      </p>
    </section>
  );
}
