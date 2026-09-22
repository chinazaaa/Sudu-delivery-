"use client";

import { useState } from "react";
import { ROUTES_DEFAULT, serialiseRoutes, type Band, type Route } from "@/lib/parcels";

/**
 * The routes parcels travel, and what each charges by weight.
 *
 * Eight of them, each way between campus and the four places the shop goes,
 * and every one of them a guess until the first month says otherwise. So
 * they are typed here rather than written in code, and a route with no bands
 * is simply not offered.
 */
export default function ParcelRoutes({ saved }: { saved: Route[] }) {
  const [routes, setRoutes] = useState<Route[]>(
    saved.length > 0 ? saved : ROUTES_DEFAULT
  );

  const change = (id: string, patch: Partial<Route>) =>
    setRoutes((all) => all.map((one) => (one.id === id ? { ...one, ...patch } : one)));

  const setBand = (id: string, at: number, patch: Partial<Band>) =>
    setRoutes((all) =>
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
    setRoutes((all) =>
      all.map((one) =>
        one.id === id
          ? {
              ...one,
              // The next one up from the heaviest so far, so a list is built
              // by pressing the button rather than by typing numbers twice.
              bands: [
                ...one.bands,
                {
                  upTo: (one.bands[one.bands.length - 1]?.upTo ?? 0) + 3,
                  fee: one.bands[one.bands.length - 1]?.fee ?? 0,
                },
              ],
            }
          : one
      )
    );

  const dropBand = (id: string, at: number) =>
    setRoutes((all) =>
      all.map((one) =>
        one.id === id
          ? { ...one, bands: one.bands.filter((_, index) => index !== at) }
          : one
      )
    );

  return (
    <div className="space-y-2">
      <input type="hidden" name="parcel_routes" value={serialiseRoutes(routes)} />

      {routes.map((route) => (
        <div key={route.id} className="rounded-xl border border-black/10 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 font-semibold">
              <input
                type="checkbox"
                checked={route.on}
                onChange={(event) => change(route.id, { on: event.target.checked })}
              />
              {route.label}
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
              No weights yet, so this one is not offered.
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {route.bands.map((band, index) => (
                <li key={index} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted">Up to</span>
                  <input
                    type="number"
                    min={1}
                    value={band.upTo}
                    onChange={(event) =>
                      setBand(route.id, index, { upTo: Number(event.target.value) })
                    }
                    className="field w-20 py-1.5 text-sm"
                    aria-label={`Kilos on ${route.label}`}
                  />
                  <span className="text-muted">kg</span>
                  <span className="text-muted">·</span>
                  <span className="text-muted">₦</span>
                  <input
                    type="number"
                    min={0}
                    value={band.fee}
                    onChange={(event) =>
                      setBand(route.id, index, { fee: Number(event.target.value) })
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

      <p className="text-xs text-muted">
        Anything heavier than the last weight on a route is not taken, rather
        than charged the top price. Untick a route to stop offering it without
        losing what it charged.
      </p>
    </div>
  );
}
