"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Empty from "./Empty";
import PayChoice from "./PayChoice";
import Thumb from "./Thumb";
import { naira } from "@/lib/money";
import FeeBands from "./FeeBands";
import { feeFor, type Band } from "@/lib/fees";
import { placeSkincareOrder } from "@/app/actions";
import { emptyShelf, setShelfQty, shelfTotal, useShelf } from "@/lib/skincare-cart";

/**
 * Paying for skincare.
 *
 * The same three questions as any other order, because it is the same order
 * underneath: who you are, where it goes, how you are paying. What the page
 * has to say plainly is the one thing that is different, which is that it
 * comes on Saturday and not today.
 */
export default function ShelfCheckout({
  bands,
  when,
  window: arrives,
  cutOff,
  promise,
  hostels,
  promoters = [],
  me,
}: {
  /** The skincare ladder: it is the car, not the cream, so it goes by how
   *  much room the order takes. */
  bands: Band[];
  /** "Saturday, 27 Sep", the whole promise in four words. */
  when: string;
  /** The hours the car delivers in that day, in the shop's own words. */
  window: string;
  /** When it stops taking orders that morning. */
  cutOff: string;
  /** Where the products come from. Said here as well as on the shelf,
   *  because this is the screen where the money changes hands. */
  promise: string;
  hostels: string[];
  /** Whose name to offer, so a skincare order counts for whoever brought it
   *  in. Empty where nobody is promoting. */
  promoters?: { code: string; name: string }[];
  me: { name: string; hostel: string; paymentMethod: "transfer" | "card" } | null;
}) {
  const router = useRouter();
  const cart = useShelf();
  const [name, setName] = useState(me?.name ?? "");
  const [phone, setPhone] = useState("");
  const [hostel, setHostel] = useState(me?.hostel ?? "");
  // Where it goes: a block on campus, or an address anywhere in Lagos.
  //
  // Only skincare asks this. Food is fetched hot and driven straight over,
  // so it goes to PAU and nowhere else; a parcel on a weekly car can go to a
  // house in Lekki without the day being any different. Somebody who is not
  // at PAU is not a lost customer here, they are a customer with an address.
  const [inPau, setInPau] = useState(true);
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [heardFrom, setHeardFrom] = useState("");
  const [method, setMethod] = useState<"transfer" | "card">(me?.paymentMethod ?? "transfer");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("sudu_me_v1") ?? "null");
      if (saved?.name) setName((was) => was || saved.name);
      if (saved?.phone) setPhone((was) => was || saved.phone);
      if (saved?.hostel) setHostel((was) => was || saved.hostel);
      if (saved?.method === "card" || saved?.method === "transfer") setMethod(saved.method);
    } catch {
      /* Nothing saved, or storage is blocked. They type it. */
    }
  }, []);

  const food = shelfTotal(cart);
  const items = cart.reduce((count, one) => count + one.qty, 0);
  const fee = feeFor(items, null, bands);

  if (cart.length === 0) {
    return (
      <Empty icon="cart" title="Nothing in the basket" href="/skincare" action="Back to the shelf">
        Pick a few things and they gather here, ready for {when}.
      </Empty>
    );
  }

  const place = async () => {
    setProblem("");
    setBusy(true);
    try {
      const result = await placeSkincareOrder({
        lines: cart.map((one) => ({ id: one.id, qty: one.qty })),
        name,
        phone,
        hostel: inPau ? hostel : address,
        note,
        heardFrom,
        paymentMethod: method,
      });
      if (!result.ok) {
        setProblem(result.error);
        return;
      }
      try {
        const saved = JSON.parse(localStorage.getItem("sudu_me_v1") ?? "{}");
        localStorage.setItem(
          "sudu_me_v1",
          JSON.stringify({ ...saved, name, phone, hostel, method })
        );
      } catch {
        /* Not worth failing an order over. */
      }
      // Emptied only once there is an order to show for it. A basket cleared
      // by a failed payment is somebody's evening gone.
      emptyShelf();
      router.push(`/o/${result.orderId}`);
    } catch {
      setProblem("Could not place that just now. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 pb-36">
      <h1 className="text-2xl font-extrabold">Checkout</h1>

      <section className="card space-y-1">
        <h2 className="font-bold">When it arrives</h2>
        <p className="text-lg font-extrabold text-ink">{when}</p>
        <p className="text-sm text-muted">
          {arrives !== "" && `${arrives}. `}
          One car a week. Orders for it close at {cutOff} that morning, and
          anything after goes on the next one.
        </p>
      </section>

      <section className="card space-y-2">
        <h2 className="font-bold">What you are getting</h2>
        <p className="text-sm text-muted">{promise}</p>
        <ul className="divide-y divide-black/5">
          {cart.map((line) => (
            <li key={line.id} className="flex items-center gap-3 py-2">
              <span className="size-12 shrink-0">
                <Thumb src={line.imageUrl} name={line.name} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{line.name}</span>
                <span className="block text-xs text-muted">
                  {line.brand !== "" ? `${line.brand} · ` : ""}
                  {naira(line.price)}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  aria-label={`One less ${line.name}`}
                  onClick={() => setShelfQty(line.id, line.qty - 1)}
                  className="chip size-8 justify-center border-black/10 bg-white"
                >
                  −
                </button>
                <span className="w-4 text-center font-bold">{line.qty}</span>
                <button
                  type="button"
                  aria-label={`One more ${line.name}`}
                  onClick={() => setShelfQty(line.id, line.qty + 1)}
                  className="chip size-8 justify-center border-black/10 bg-white"
                >
                  +
                </button>
              </span>
            </li>
          ))}
        </ul>
        <Link href="/skincare" className="text-sm font-semibold text-brand">
          Add something else
        </Link>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">Where it goes</h2>

        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="John Doe"
          aria-label="Your name"
          className="field"
          autoComplete="name"
        />
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="0803 123 4567"
          aria-label="Your phone number"
          inputMode="tel"
          className="field"
          autoComplete="tel"
        />
        <div className="flex gap-2">
          {[
            { at: true, label: "I am at PAU" },
            { at: false, label: "Somewhere else in Lagos" },
          ].map((one) => (
            <button
              key={one.label}
              type="button"
              onClick={() => setInPau(one.at)}
              className={`chip flex-1 justify-center ${
                inPau === one.at ? "border-ink bg-ink text-white" : "border-black/10 bg-white"
              }`}
            >
              {one.label}
            </button>
          ))}
        </div>

        {inPau ? (
          hostels.length > 0 ? (
            <select
              value={hostel}
              onChange={(event) => setHostel(event.target.value)}
              aria-label="Your block"
              className="field"
            >
              <option value="">Which block?</option>
              {hostels.map((one) => (
                <option key={one} value={one}>
                  {one}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={hostel}
              onChange={(event) => setHostel(event.target.value)}
              placeholder="Your hostel or block"
              aria-label="Your hostel or block"
              className="field"
            />
          )
        ) : (
          <div>
            <textarea
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              rows={3}
              placeholder="Street, area, and anything the driver needs to find you"
              aria-label="Your address in Lagos"
              className="field"
            />
            <p className="mt-1 text-xs text-muted">
              Anywhere in Lagos. Outside Lagos we cannot bring it, and we would
              rather say so now than take your money and ring you on Saturday.
            </p>
          </div>
        )}
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Anything we should know? (optional)"
          aria-label="Anything we should know"
          className="field"
        />

        {/* The one question that pays somebody. It was on the food checkout
            and on a parcel and nowhere else, so every skincare order a
            promoter brought in counted for nobody. */}
        {promoters.length > 0 && (
          <select
            value={heardFrom}
            onChange={(event) => setHeardFrom(event.target.value)}
            aria-label="Where did you hear about us?"
            className="field"
          >
            <option value="">Where did you hear about us?</option>
            {promoters.map((one) => (
              <option key={one.code} value={one.code}>
                {one.name}
              </option>
            ))}
            <option value="other">Somewhere else</option>
          </select>
        )}

        <PayChoice value={method} onChange={setMethod} />
      </section>

      <section className="card space-y-1 text-sm">
        <div className="flex justify-between text-muted">
          <span>What you picked</span>
          <span>{naira(food)}</span>
        </div>
        <div className="flex justify-between text-muted">
          <span>Delivery</span>
          <span>{fee === 0 ? "Free" : naira(fee)}</span>
        </div>
        <div className="flex justify-between border-t border-black/10 pt-2 text-lg font-extrabold">
          <span>Total</span>
          <span>{naira(food + fee)}</span>
        </div>
        {/* The whole ladder, one tap away. Four bottles costing less than
            fifteen looks arbitrary until you can see why. */}
        <FeeBands itemCount={items} flashFee={null} bands={bands} />
        <p className="text-xs text-muted">
          One fee for the whole basket. It is the car, not the cream, so it
          goes by how much room your order takes.
        </p>
      </section>

      <div className="fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-30 border-t border-black/5 bg-paper p-3 shadow-bar sm:bottom-0">
        <div className="mx-auto max-w-2xl space-y-2">
          {problem !== "" && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {problem}
            </p>
          )}
          <button
            type="button"
            onClick={place}
            disabled={busy || (inPau ? hostel.trim() === "" : address.trim().length < 8)}
            className="btn-primary w-full py-4 text-base"
          >
            {busy ? "Placing…" : `Place order · ${naira(food + fee)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
