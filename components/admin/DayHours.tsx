"use client";

import { useState } from "react";

export type DaySetting = { first: number; last: number; off?: boolean };

const DAYS = [
  { weekday: 1, name: "Monday" },
  { weekday: 2, name: "Tuesday" },
  { weekday: 3, name: "Wednesday" },
  { weekday: 4, name: "Thursday" },
  { weekday: 5, name: "Friday" },
  { weekday: 6, name: "Saturday" },
  { weekday: 0, name: "Sunday" },
];

/**
 * The hours each day of the week, where a day is not like the rest.
 *
 * Saturday and Wednesday are not the same business: the shop can be out at
 * noon on a Saturday and not before three midweek. One pair for the whole
 * week meant picking whichever was wrong more often.
 *
 * A day left alone follows the pair above, which is what every day did
 * before this existed, so nothing has to be filled in for the week to work.
 */
export default function DayHours({
  hours,
  saved,
  base,
}: {
  /** The hours that can be picked, as the rest of the form offers them. */
  hours: { value: string; label: string }[];
  /** What is stored, keyed by weekday, 0 for Sunday. */
  saved: Record<string, DaySetting>;
  /** The pair a day follows when it says nothing of its own. */
  base: { first: number; last: number };
}) {
  const [days, setDays] = useState<Record<string, DaySetting>>(saved);

  // Saving resets the form's fields in the browser, which left every one of
  // these selects showing its first option, seven in the morning, while the
  // real values sat in state untouched. A refresh "fixed" it because the
  // refresh built the selects again from scratch.
  //
  // So when what is stored changes, which is exactly when a save has gone
  // through, the picks are taken from the server again and the list below is
  // rebuilt. Compared by value, not by identity: the prop is a fresh object
  // on every render, and comparing identity would throw away a half-finished
  // edit each time the page re-rendered.
  const stored = JSON.stringify(saved);
  const [seen, setSeen] = useState(stored);
  if (seen !== stored) {
    setSeen(stored);
    setDays(saved);
  }

  // A value the list does not offer would leave the select showing its first
  // option, which is how three in the afternoon came back as seven in the
  // morning. Anything unrecognised falls back to the hours above.
  const offered = new Set(hours.map((hour) => hour.value));
  const pick = (value: number, fallback: number) =>
    offered.has(String(value)) ? String(value) : String(fallback);

  const set = (weekday: number, patch: Partial<DaySetting> | null) =>
    setDays((current) => {
      const next = { ...current };
      if (patch === null) delete next[String(weekday)];
      else
        next[String(weekday)] = {
          // A day that has said nothing yet starts where the week does.
          ...{ first: base.first, last: base.last },
          ...(current[String(weekday)] ?? {}),
          ...patch,
        };
      return next;
    });

  return (
    <div className="space-y-2">
      <input
        type="hidden"
        name="same_day_day_hours"
        value={Object.keys(days).length === 0 ? "" : JSON.stringify(days)}
      />

      <ul key={stored} className="space-y-2">
        {DAYS.map((day) => {
          const own = days[String(day.weekday)];
          const off = own?.off ?? false;

          return (
            <li key={day.weekday} className="flex flex-wrap items-center gap-2">
              <span className="w-24 shrink-0 text-sm font-semibold">{day.name}</span>

              {own && !off ? (
                <>
                  <select
                    value={pick(own.first, base.first)}
                    onChange={(event) =>
                      set(day.weekday, { first: Number(event.target.value) })
                    }
                    className="field w-auto py-2 text-sm"
                    aria-label={`Earliest on ${day.name}`}
                  >
                    {hours.map((hour) => (
                      <option key={hour.value} value={hour.value}>
                        {hour.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-muted">to</span>
                  <select
                    value={pick(own.last, base.last)}
                    onChange={(event) =>
                      set(day.weekday, { last: Number(event.target.value) })
                    }
                    className="field w-auto py-2 text-sm"
                    aria-label={`Latest on ${day.name}`}
                  >
                    {hours.map((hour) => (
                      <option key={hour.value} value={hour.value}>
                        {hour.label}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <span className="text-sm text-muted">
                  {off ? "No same day deliveries" : "Same as above"}
                </span>
              )}

              <span className="ml-auto flex gap-2">
                {own && (
                  <button
                    type="button"
                    onClick={() => set(day.weekday, null)}
                    className="chip border-black/10 bg-white py-1.5 text-xs"
                  >
                    Follow the hours above
                  </button>
                )}
                {!own && (
                  <button
                    type="button"
                    onClick={() => set(day.weekday, {})}
                    className="chip border-black/10 bg-white py-1.5 text-xs"
                  >
                    Different on {day.name}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => set(day.weekday, off ? { off: false } : { off: true })}
                  className={`chip py-1.5 text-xs ${
                    off ? "border-brand bg-brand text-white" : "border-black/10 bg-white"
                  }`}
                >
                  {off ? "Closed" : "Close it"}
                </button>
              </span>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted">
        A day left as it is follows the hours above, which is what every day
        did before. Closing one takes it off the list entirely, so nobody is
        offered a time you will not drive.
      </p>
    </div>
  );
}
