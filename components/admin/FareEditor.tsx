"use client";

import { useState } from "react";
import { naira } from "@/lib/money";
import { serialiseFares, type Fare } from "@/lib/transport";
import { HOME, type Area } from "@/lib/areas";

/**
 * What a round trip to each set of areas costs the shop.
 *
 * Customers transfer into the shop's own account. The counters are paid
 * with a card somebody else is holding, so before a run goes out the shop
 * has to move money onto that card: what the counters will charge, plus
 * the fare for the trip. Whatever is left in the account is the shop's.
 *
 * A table rather than arithmetic, because nobody can derive a Lagos fare
 * from a map. Sangotedo and back is one figure, Lekki and back is another,
 * and a run that stops at both is a third that is not the two added: it is
 * one journey with an extra leg, not two journeys.
 *
 * Nothing here is named in code. Tick the places a trip goes to and say
 * what it costs, and the run sheet reads it off the stops that run
 * actually has.
 */
export default function FareEditor({
  initial,
  areas,
}: {
  initial: Fare[];
  /** The areas the shop delivers from, as they are named today. */
  areas: Area[];
}) {
  const [fares, setFares] = useState(
    initial.map((one) => ({ areas: one.areas, amount: String(one.amount) }))
  );

  // Home always goes in the list, because it is where most of the food is
  // and a trip to it is the commonest trip there is.
  const places = [{ id: HOME.id, name: HOME.name }, ...areas.map((one) => ({ id: one.id, name: one.name }))];

  const parsed: Fare[] = fares.map((one) => ({
    areas: one.areas,
    amount: Number(one.amount) || 0,
  }));

  const edit = (at: number, patch: Partial<(typeof fares)[number]>) =>
    setFares(fares.map((one, index) => (index === at ? { ...one, ...patch } : one)));

  const toggle = (at: number, id: string) =>
    edit(at, {
      areas: fares[at].areas.includes(id)
        ? fares[at].areas.filter((one) => one !== id)
        : [...fares[at].areas, id],
    });

  const said = (one: (typeof fares)[number]) =>
    one.areas.length === 0
      ? "Nowhere ticked, so this one is ignored"
      : one.areas
          .map((id) => places.find((place) => place.id === id)?.name ?? "Gone")
          .join(" and ");

  return (
    <div className="space-y-3">
      <input type="hidden" name="transport_fares" value={serialiseFares(parsed)} />

      {fares.length === 0 ? (
        <p className="text-sm text-muted">
          No fares yet. The run sheet will say what the counters want and
          leave the trip out of it.
        </p>
      ) : (
        <ul className="space-y-2">
          {fares.map((one, at) => (
            <li key={at} className="space-y-2 rounded-2xl bg-shell p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {places.map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => toggle(at, place.id)}
                    className={`chip py-1.5 text-xs ${
                      one.areas.includes(place.id)
                        ? "chip-on"
                        : "border-black/10 bg-white"
                    }`}
                  >
                    {place.name}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted">₦</span>
                <input
                  value={one.amount}
                  inputMode="numeric"
                  onChange={(event) =>
                    edit(at, { amount: event.target.value.replace(/\D/g, "") })
                  }
                  className="field w-28 py-1.5 text-sm"
                  aria-label={`What the trip to ${said(one)} costs`}
                />
                <span className="text-muted">
                  there and back · {said(one)}
                </span>
                <button
                  type="button"
                  onClick={() => setFares(fares.filter((_, index) => index !== at))}
                  className="ml-auto text-xs font-semibold text-brand"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setFares([...fares, { areas: [HOME.id], amount: "" }])}
        className="chip border-black/10 bg-white py-1.5 text-xs"
      >
        Add a trip
      </button>

      <p className="text-xs text-muted">
        One row per trip the car actually makes. A run stopping in two places
        is its own row with its own figure: it is one journey with an extra
        leg, not two journeys, so the two singles added would be more than it
        costs. Where a run's combination has no row, the sheet uses the
        dearest leg it is made of and says so.
        {parsed.some((one) => one.amount > 0) && (
          <>
            {" "}
            Today the dearest trip on the list is{" "}
            {naira(Math.max(...parsed.map((one) => one.amount)))}.
          </>
        )}
      </p>
    </div>
  );
}
