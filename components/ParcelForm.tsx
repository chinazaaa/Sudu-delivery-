"use client";

import { useActionState, useState } from "react";
import { naira } from "@/lib/money";
import { feeFor, type Route } from "@/lib/parcels";
import { sendParcel, type ParcelState } from "@/app/parcel/actions";

/**
 * Sending something that is not food.
 *
 * One end of every route is campus, where a block is the whole address
 * anybody needs. The other end is a real one, and which end that is depends
 * on the route, so the form changes its two address questions as soon as the
 * route is picked rather than asking for both and hoping.
 */
export default function ParcelForm({
  routes,
  maxValue,
}: {
  routes: Route[];
  maxValue: number;
}) {
  const [state, action, busy] = useActionState<ParcelState, FormData>(sendParcel, {
    error: "",
  });
  const [routeId, setRouteId] = useState(routes[0]?.id ?? "");
  const route = routes.find((one) => one.id === routeId) ?? null;
  const toPau = route?.toPau ?? true;

  // Priced by weight as well as by route, so the bands change with the route
  // and the one that was picked may not exist on the new one.
  const bands = route?.bands ?? [];
  const [kg, setKg] = useState(bands[0]?.upTo ?? 0);
  const picked = bands.some((one) => one.upTo === kg) ? kg : bands[0]?.upTo ?? 0;
  const fee = route ? feeFor(route, picked) : null;

  return (
    <form action={action} className="space-y-4">
      <div className="card space-y-3">
        <div>
          <label className="label" htmlFor="route">
            Where is it going?
          </label>
          <select
            id="route"
            name="route"
            value={routeId}
            onChange={(event) => setRouteId(event.target.value)}
            className="field"
          >
            {routes.map((one) => (
              <option key={one.id} value={one.id}>
                {one.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="kg">
            About how heavy is it?
          </label>
          <select
            id="kg"
            name="kg"
            value={String(picked)}
            onChange={(event) => setKg(Number(event.target.value))}
            className="field"
          >
            {bands.map((one, index) => (
              <option key={one.upTo} value={one.upTo}>
                {index === 0 ? `Up to ${one.upTo}kg` : `${bands[index - 1].upTo}kg to ${one.upTo}kg`}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">
            A guess is fine. We will say if it is plainly heavier when we
            collect it.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="item">
            What are we carrying?
          </label>
          <input
            id="item"
            name="item"
            placeholder="A dress in a paper bag"
            className="field"
          />
          <p className="mt-1 text-xs text-muted">
            So we collect the right parcel, not because we open it.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="shop">
            {toPau ? "Which shop or person are we collecting from?" : "Who is it going to?"}
          </label>
          <input
            id="shop"
            name="shop"
            placeholder={toPau ? "Bella's Boutique" : "My sister, Ada"}
            className="field"
          />
        </div>

        <div>
          <label className="label" htmlFor="address">
            {toPau ? "The address we are collecting from" : "The address we are delivering to"}
          </label>
          <textarea id="address" name="address" rows={2} className="field" />
        </div>

        <div>
          <label className="label" htmlFor="hostel">
            {toPau ? "Which block are we bringing it to?" : "Which block are we collecting from?"}
          </label>
          <input id="hostel" name="hostel" placeholder="Ikoyi Hall, room 12" className="field" />
        </div>

        <div>
          <label className="label" htmlFor="value">
            Roughly what is it worth?
          </label>
          <input
            id="value"
            name="value"
            inputMode="numeric"
            placeholder="15000"
            className="field"
          />
          <p className="mt-1 text-xs text-muted">
            Nothing over {naira(maxValue)}, and no phones, laptops, jewellery or
            cash. If it is lost or damaged in the car it is on us, which is why
            there is a limit.
          </p>
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="font-bold">You</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">
              Your name
            </label>
            <input id="name" name="name" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="phone">
              Your number
            </label>
            <input id="phone" name="phone" inputMode="tel" className="field" />
          </div>
        </div>

        {/* Somebody else at the far end is the common case, not the odd one:
            a parcel is usually sent to a person rather than collected by the
            person who paid. */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="to_name">
              Who receives it? (if not you)
            </label>
            <input id="to_name" name="to_name" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="to_phone">
              Their number
            </label>
            <input id="to_phone" name="to_phone" inputMode="tel" className="field" />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="note">
            Anything else we should know?
          </label>
          <textarea id="note" name="note" rows={2} className="field" />
        </div>
      </div>

      {/* The price at the end, once they have said what it is and how far it
          is going. Those two are the price, so quoting before either is
          known is a number that has to change later. */}
      {route && fee !== null && (
        <div className="card space-y-1 text-sm">
          <div className="flex justify-between text-muted">
            <span>{route.label}</span>
            <span>up to {picked}kg</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-black/5 pt-1">
            <span className="font-bold text-ink">Delivery</span>
            <span className="text-lg font-extrabold text-ink">{naira(fee)}</span>
          </div>
          <p className="text-xs text-muted">
            One trip, yours alone. Nothing is bought on your behalf, so this is
            the whole of it.
          </p>
        </div>
      )}

      {state.error !== "" && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn-primary w-full py-4 text-base">
        {busy ? "Sending…" : fee !== null ? `Send it · ${naira(fee)}` : "Send it"}
      </button>
      <p className="text-center text-xs text-muted">
        We agree the day with you on WhatsApp once it is paid.
      </p>
    </form>
  );
}
