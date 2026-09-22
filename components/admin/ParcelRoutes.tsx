"use client";

import { useState } from "react";
import { ROUTES_DEFAULT, serialiseRoutes, type Route } from "@/lib/parcels";

/** A route as it is being typed: numbers are text until they are saved. */
type Draft = {
  id: string;
  label: string;
  toPau: boolean;
  on: boolean;
  bands: { upTo: string; fee: string }[];
};

const draftsOf = (routes: Route[]): Draft[] =>
  routes.map((one) => ({
    id: one.id,
    label: one.label,
    toPau: one.toPau,
    on: one.on,
    bands: one.bands.map((band) => ({
      upTo: String(band.upTo),
      fee: String(band.fee),
    })),
  }));

const routesOf = (drafts: Draft[]): Route[] =>
  drafts.map((one) => ({
    id: one.id,
    label: one.label,
    toPau: one.toPau,
    on: one.on,
    bands: one.bands.map((band) => ({
      upTo: Number(band.upTo) || 0,
      fee: Number(band.fee) || 0,
    })),
  }));

/**
 * The routes parcels travel, and what each charges by weight.
 *
 * Eight of them, each way between campus and the four places the shop goes,
 * and every one of them a guess until the first month says otherwise. So
 * they are typed here rather than written in code, and a route with no bands
 * is simply not offered.
 *
 * Held as text rather than as numbers while it is being typed. A number field
 * bound to a number reads an empty box as zero and writes the zero straight
 * back, so the nought could not be deleted to type over it: every price had
 * to be typed around a nought that kept coming back.
 */
export default function ParcelRoutes({ saved }: { saved: Route[] }) {
  const [drafts, setDrafts] = useState<Draft[]>(
    draftsOf(saved.length > 0 ? saved : ROUTES_DEFAULT)
  );

  // Saving resets the form's fields in the browser, which left every tick box
  // here unticked while the routes they belonged to were saved as offered.
  // When what is stored changes, which is exactly when a save has gone
  // through, these are taken from the server again and the list is rebuilt.
  const stored = JSON.stringify(saved);
  const [seen, setSeen] = useState(stored);
  if (seen !== stored) {
    setSeen(stored);
    setDrafts(draftsOf(saved.length > 0 ? saved : ROUTES_DEFAULT));
  }

  const change = (id: string, patch: Partial<Draft>) =>
    setDrafts((all) => all.map((one) => (one.id === id ? { ...one, ...patch } : one)));

  const setBand = (id: string, at: number, patch: Partial<Draft["bands"][number]>) =>
    setDrafts((all) =>
      all.map((one) =>
        one.id === id
          ? {
              ...one,
              bands: one.bands.map((band, index) =>
                index === at ? { ...band, ...patch } : band
              ),
            }
          : one
      )
    );

  const addBand = (id: string) =>
    setDrafts((all) =>
      all.map((one) =>
        one.id === id
          ? {
              ...one,
              // The next one up from the heaviest so far, so a list is built
              // by pressing the button rather than by typing numbers twice.
              bands: [
                ...one.bands,
                {
                  upTo: String((Number(one.bands[one.bands.length - 1]?.upTo) || 0) + 3),
                  fee: one.bands[one.bands.length - 1]?.fee ?? "",
                },
              ],
            }
          : one
      )
    );

  const dropBand = (id: string, at: number) =>
    setDrafts((all) =>
      all.map((one) =>
        one.id === id
          ? { ...one, bands: one.bands.filter((_, index) => index !== at) }
          : one
      )
    );

  const offered = drafts.filter((one) => one.on && one.bands.length > 0).length;

  return (
    <div className="space-y-2">
      <input type="hidden" name="parcel_routes" value={serialiseRoutes(routesOf(drafts))} />

      <p className="text-sm text-muted">
        Tick a route to offer it. {offered === 0
          ? "None are ticked, so nobody can send a parcel yet."
          : `${offered} ticked.`}
      </p>

      <div key={stored} className="space-y-2">
        {drafts.map((route) => (
          <div
            key={route.id}
            className={`rounded-xl border p-3 ${
              route.on ? "border-brand/40 bg-brand-tint/40" : "border-black/10"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  checked={route.on}
                  onChange={(event) => change(route.id, { on: event.target.checked })}
                />
                {route.label}
                <span className="text-xs font-normal text-muted">
                  {route.on ? "offered" : "not offered"}
                </span>
              </label>
              <button
                type="button"
                onClick={() => addBand(route.id)}
                className="chip border-black/10 bg-white py-1.5 text-xs"
              >
                Add a weight
              </button>
            </div>

            {route.bands.length === 0 ? (
              <p className="mt-2 text-xs text-muted">
                No weights yet, so this one is not offered whether it is ticked
                or not.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {route.bands.map((band, index) => (
                  <li key={index} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted">Up to</span>
                    <input
                      inputMode="numeric"
                      value={band.upTo}
                      onChange={(event) =>
                        setBand(route.id, index, {
                          upTo: event.target.value.replace(/[^\d]/g, ""),
                        })
                      }
                      className="field w-20 py-1.5 text-sm"
                      aria-label={`Kilos on ${route.label}`}
                    />
                    <span className="text-muted">kg</span>
                    <span className="text-muted">·</span>
                    <span className="text-muted">₦</span>
                    <input
                      inputMode="numeric"
                      value={band.fee}
                      placeholder="0"
                      onChange={(event) =>
                        setBand(route.id, index, {
                          fee: event.target.value.replace(/[^\d]/g, ""),
                        })
                      }
                      className="field w-28 py-1.5 text-sm"
                      aria-label={`Price on ${route.label}`}
                    />
                    <button
                      type="button"
                      onClick={() => dropBand(route.id, index)}
                      className="ml-auto text-xs font-semibold text-brand"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted">
        Anything heavier than the last weight on a route is not taken, rather
        than charged the top price. Untick a route to stop offering it without
        losing what it charged.
      </p>
    </div>
  );
}
