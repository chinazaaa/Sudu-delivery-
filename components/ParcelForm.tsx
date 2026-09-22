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
/** A number as the shop stores it: 234 and +234 are both 0. */
function rawDigits(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (digits.startsWith("234")) return `0${digits.slice(3)}`;
  if (digits.length === 10) return `0${digits}`;
  return digits;
}

export default function ParcelForm({
  routes,
  maxValue,
  hostels,
  today,
}: {
  routes: Route[];
  maxValue: number;
  /** The blocks the shop delivers to, as the food checkout offers them.
   *  Empty where the list is not set up, and then it is typed. */
  hostels: string[];
  /** The shop's today, in Lagos, so a phone set to another day cannot offer
   *  a date that is already gone here. */
  today: string;
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

  // React resets an uncontrolled form once its action finishes, which wiped
  // every field each time the server refused something: a number typed
  // slightly wrong cost somebody the whole form. They are held here instead,
  // so a refusal leaves the answer on screen to be corrected.
  const [said, setSaid] = useState({
    item: "",
    shop: "",
    address: "",
    hostel: "",
    room: "",
    name: "",
    phone: "",
    to_name: "",
    to_phone: "",
    note: "",
  });
  const put = (field: keyof typeof said) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setSaid((all) => ({ ...all, [field]: event.target.value }));

  // Said as it is typed rather than after the whole form has been filled in
  // and sent. The cap is the shop's only protection on a parcel, so being
  // refused by it is the most likely reason this form fails, and finding
  // that out at the button is finding it out too late.
  const [worth, setWorth] = useState("");
  const value = Number(worth.replace(/[^\d]/g, "")) || 0;
  const tooDear = value > maxValue;

  // The recipient is optional, but half of one is worse than none: a name
  // with no number is a bag at a gate with nobody to call. Checked here as
  // well as on the server, and with the same rule as the sender's number,
  // because two number fields with one hint between them is the second one
  // rejected for a reason nothing on the page explained.
  const goodNumber = (raw: string) => /^0[789]\d{9}$/.test(rawDigits(raw));
  const halfRecipient =
    (said.to_name.trim() !== "" || said.to_phone.trim() !== "") &&
    (said.to_name.trim() === "" || !goodNumber(said.to_phone));

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
          <label className="label" htmlFor="wanted_on">
            When would you like it?
          </label>
          <input
            id="wanted_on"
            name="wanted_on"
            type="date"
            required
            min={today}
            defaultValue={today}
            className="field"
          />
          <p className="mt-1 text-xs text-muted">
            We will tell you on WhatsApp whether that day works. If it does
            not, we will agree another one with you before anything moves.
          </p>
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
            value={said.item}
            onChange={put("item")}
            required
            minLength={2}
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
            value={said.shop}
            onChange={put("shop")}
            required
            minLength={2}
            placeholder={toPau ? "Bella's Boutique" : "My sister, Ada"}
            className="field"
          />
        </div>

        <div>
          <label className="label" htmlFor="address">
            {toPau ? "The address we are collecting from" : "The address we are delivering to"}
          </label>
          <textarea
            id="address"
            name="address"
            value={said.address}
            onChange={put("address")}
            required
            minLength={6}
            rows={2}
            placeholder="Street, area, and anything that helps us find it"
            className="field"
          />
        </div>

        <div>
          <label className="label" htmlFor="hostel">
            {toPau ? "Which block are we bringing it to?" : "Which block are we collecting from?"}
          </label>
          {hostels.length > 0 ? (
            <select
              id="hostel"
              name="hostel"
              required
              value={said.hostel}
              onChange={put("hostel")}
              className="field"
            >
              <option value="">Pick the block</option>
              {hostels.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="hostel"
              name="hostel"
              required
              value={said.hostel}
              onChange={put("hostel")}
              placeholder="Ikoyi Hall"
              className="field"
            />
          )}
          <div className="mt-2">
            <label className="label" htmlFor="room">
              Room or landmark
            </label>
            <input
              id="room"
              name="room"
              value={said.room}
              onChange={put("room")}
              placeholder="Room 12, or the porter's desk"
              className="field"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="value">
            Roughly what is it worth?
          </label>
          <input
            id="value"
            name="value"
            required
            inputMode="numeric"
            value={worth}
            onChange={(event) => setWorth(event.target.value.replace(/[^\d]/g, ""))}
            placeholder="15000"
            aria-invalid={tooDear}
            className={`field ${tooDear ? "border-brand" : ""}`}
          />
          {tooDear ? (
            <p className="mt-1 text-xs font-semibold text-brand">
              {naira(value)} is over the {naira(maxValue)} limit, so we cannot
              carry it. Message us and we will talk it through.
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted">
              Nothing over {naira(maxValue)}, and no phones, laptops, jewellery
              or cash. If it is lost or damaged in the car it is on us, which is
              why there is a limit.
            </p>
          )}
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="font-bold">You</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">
              Your name
            </label>
            <input
              id="name"
              name="name"
              value={said.name}
              onChange={put("name")}
              required
              minLength={2}
              autoComplete="name"
              className="field"
            />
          </div>
          <div>
            <label className="label" htmlFor="phone">
              Your number
            </label>
            <input
              id="phone"
              name="phone"
              value={said.phone}
              onChange={put("phone")}
              required
              type="tel"
              inputMode="tel"
              minLength={10}
              autoComplete="tel"
              placeholder="0803 123 4567"
              className="field"
            />
            <p className="mt-1 text-xs text-muted">
              Eleven digits, starting 070, 080, 081, 090 or 091.
            </p>
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
            <input
              id="to_name"
              name="to_name"
              value={said.to_name}
              onChange={put("to_name")}
              className="field"
            />
          </div>
          <div>
            <label className="label" htmlFor="to_phone">
              Their number
            </label>
            <input
              id="to_phone"
              name="to_phone"
              value={said.to_phone}
              onChange={put("to_phone")}
              type="tel"
              inputMode="tel"
              placeholder="0803 123 4567"
              aria-invalid={halfRecipient}
              className={`field ${halfRecipient ? "border-brand" : ""}`}
            />
          </div>
          {halfRecipient ? (
            <p className="text-xs font-semibold text-brand sm:col-span-2">
              For somebody else we need both their name and a number that
              works: eleven digits, starting 070, 080, 081, 090 or 091.
              Leave both empty and it comes to you.
            </p>
          ) : (
            <p className="text-xs text-muted sm:col-span-2">
              Leave both empty and it comes to you.
            </p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="note">
            Anything else we should know?
          </label>
          <textarea
            id="note"
            name="note"
            value={said.note}
            onChange={put("note")}
            rows={2}
            className="field"
          />
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

      <button
        type="submit"
        disabled={busy || tooDear || halfRecipient}
        className="btn-primary w-full py-4 text-base"
      >
        {busy
          ? "Sending…"
          : tooDear
            ? `Over the ${naira(maxValue)} limit`
            : halfRecipient
              ? "Their name and number, or neither"
            : fee !== null
              ? `Send it · ${naira(fee)}`
              : "Send it"}
      </button>
      <p className="text-center text-xs text-muted">
        We agree the day with you on WhatsApp once it is paid.
      </p>
    </form>
  );
}
