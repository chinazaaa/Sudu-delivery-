"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { submitOrder, type SubmitState } from "@/app/actions";
import {
  cartSubtotal,
  countItems,
  toServerLines,
  updatePerson,
  useCart,
  usePeople,
} from "@/lib/cart";
import { feeFor, splitFee, type Band } from "@/lib/fees";
import { naira } from "@/lib/money";
import CouponBox from "@/components/CouponBox";
import FillDetails from "@/components/FillDetails";
import KeepCart from "@/components/KeepCart";
import { countdown } from "@/lib/time";
import type { GroupMode } from "@/lib/types";
import type { BatchView } from "@/lib/view";

export type AddingTo = {
  batchId: string;
  batchLabel: string;
  phone: string;
  name: string;
  hostel: string;
  items: number;
  feeCharged: number;
};

export default function Checkout({
  batches,
  adding,
  bands,
  hostels,
}: {
  batches: BatchView[];
  adding: AddingTo | null;
  /** The delivery price list in force, read from settings on the server. */
  bands: Band[];
  /** The blocks the admin delivers to. Empty means anything typed is allowed. */
  hostels: string[];
}) {
  const cart = useCart();
  const { people } = usePeople();
  const openable = batches.filter((b) => !b.closed && !b.full);
  const [batchId, setBatchId] = useState(adding?.batchId ?? openable[0]?.id ?? "");
  const [method, setMethod] = useState<"transfer" | "card">("transfer");
  const [mode, setMode] = useState<GroupMode>("one_payer");
  const [collect, setCollect] = useState<"leader" | "each">("leader");
  const [now, setNow] = useState<number | null>(null);
  // React resets an uncontrolled form once its action finishes, which wiped
  // the name, number and block every time the server rejected something. They
  // are held here instead, and remembered for the next order.
  const [name, setName] = useState(adding?.name ?? "");
  const [phone, setPhone] = useState(adding?.phone ?? "");
  const [hostel, setHostel] = useState(adding?.hostel ?? "");
  const [filled, setFilled] = useState(false);
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [state, action, pending] = useActionState<SubmitState, FormData>(submitOrder, {
    error: null,
  });

  // A code applied to one cart and run is not necessarily worth the same, or
  // valid at all, on another. Changing either takes it off rather than
  // showing a discount that will be refused when the order is placed.
  useEffect(() => {
    setApplied(null);
  }, [batchId, itemCount]);

  useEffect(() => {
    if (adding) return;
    try {
      const saved = JSON.parse(localStorage.getItem("sudu_me_v1") ?? "null");
      if (saved?.name) setName((current) => current || saved.name);
      if (saved?.phone) setPhone((current) => current || saved.phone);
      if (saved?.hostel) setHostel((current) => current || saved.hostel);
    } catch {
      /* Nothing saved, or storage is blocked. The fields simply start empty. */
    }
  }, [adding]);

  useEffect(() => {
    try {
      localStorage.setItem("sudu_me_v1", JSON.stringify({ name, phone, hostel }));
    } catch {
      /* Not worth failing checkout over. */
    }
  }, [name, phone, hostel]);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const badPhone = Boolean(state.error?.toLowerCase().includes("phone"));
  const selected = batches.find((b) => b.id === batchId) ?? null;
  const itemCount = countItems(cart);
  const subtotal = cartSubtotal(cart);
  const alreadyItems = adding?.items ?? 0;
  const alreadyCharged = adding?.feeCharged ?? 0;
  const fee = Math.max(
    0,
    feeFor(itemCount + alreadyItems, selected?.flashFee ?? null, bands) - alreadyCharged
  );
  const total = Math.max(0, subtotal + fee - (applied?.discount ?? 0));

  const groupOn = people.length > 0;
  const names = people.map((p) => p.name);
  const shares = ["", ...names]
    .map((person) => {
      const lines = cart.filter((l) => l.forName === person);
      return {
        person,
        lines,
        items: lines.reduce((n, l) => n + l.qty, 0),
        food: lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0),
      };
    })
    .filter((share) => share.items > 0);
  const feeShares = splitFee(fee, shares.map((s) => s.items));
  // Two people with food in the cart is what a split needs, whatever they are
  // called: the leader's share is counted separately from a friend of the same
  // name.
  const splitReady = !groupOn || mode === "one_payer" || shares.length >= 2;

  // Everyone in the cart has to be resolved before the order can be placed.
  const unresolved = people.filter((person) => {
    if (!shares.some((share) => share.person === person.name)) return false;
    if (!person.goesTo) return true;
    if (person.goesTo === "theirs") {
      return person.phone.replace(/\D/g, "").length < 10 || person.hostel.trim() === "";
    }
    return false;
  });

  if (cart.length === 0) {
    return (
      <div className="card mx-auto max-w-md text-center">
        <h1 className="text-lg font-extrabold">Your cart is empty</h1>
        <Link href="/" className="btn-primary mt-4 w-full">
          Back to the menu
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5 pb-36">
      <KeepCart
        phone={phone}
        name={name}
        hostel={hostel}
        batchId={batchId}
        items={itemCount}
        value={total}
        summary={cart
          .map((line) => `${line.qty}x ${line.name}`)
          .join(", ")}
      />

      <input type="hidden" name="cart" value={JSON.stringify(toServerLines(cart))} />
      <input type="hidden" name="coupon" value={applied?.code ?? ""} />
      <input type="hidden" name="batch_id" value={batchId} />
      <input type="hidden" name="group_mode" value={groupOn ? mode : ""} />
      <input type="hidden" name="payment_method" value={method} />
      <input type="hidden" name="collect_mode" value={collect} />
      <input type="hidden" name="people" value={JSON.stringify(people)} />

      <h1 className="text-2xl font-extrabold">Checkout</h1>

      {adding && (
        <p className="rounded-2xl bg-brand-tint px-4 py-3 text-sm font-semibold text-brand-dark">
          Adding to your {adding.batchLabel} order. Same bag, and more delivery only if
          this pushes you into a bigger load.
        </p>
      )}

      <section className="card space-y-2">
        <h2 className="font-bold">Which run?</h2>
        <select
          className="field"
          value={batchId}
          onChange={(e) => setBatchId(e.target.value)}
          disabled={adding !== null}
          aria-label="Delivery run"
        >
          {openable.map((batch) => (
            <option key={batch.id} value={batch.id}>
              {batch.label}
              {now !== null &&
                ` · closes in ${countdown(new Date(batch.cutOffISO).getTime() - now)}`}
            </option>
          ))}
        </select>
        {selected && (
          <p className="text-sm text-muted">
            Orders close {selected.cutOffLabel}. {selected.deliveryWindow}.
          </p>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">How are you paying?</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["transfer", "Bank transfer", "Account details on the next screen, with a four-digit number to put in the narration."],
              ["card", "Card", "Message us on WhatsApp and we send you a card link."],
            ] as const
          ).map(([value, title, detail]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMethod(value)}
              className={`rounded-xl border p-3 text-left transition ${
                method === value ? "border-brand bg-brand-tint" : "border-black/10"
              }`}
            >
              <span className="block font-bold">{title}</span>
              <span className="block text-sm text-muted">{detail}</span>
            </button>
          ))}
        </div>
      </section>

      {!groupOn && (
        <p className="text-sm text-muted">
          Ordering for friends?{" "}
          <Link href="/cart" className="font-semibold text-brand">
            Add their names in your cart
          </Link>{" "}
          and tap a name on each item. Checkout then shows what each person owes.
        </p>
      )}

      {groupOn && (
        <section className="card space-y-3">
          <div>
            <h2 className="font-bold">Group order · {shares.length} people</h2>
            <p className="text-sm text-muted">
              Bags are labelled with these names.{" "}
              <Link href="/cart" className="font-semibold text-brand">
                Change who has what
              </Link>
              .
            </p>
          </div>

          <ul className="space-y-3">
            {shares.map((share, index) => {
              const person = people.find((p) => p.name === share.person);

              return (
                <li
                  key={share.person || "me"}
                  className="space-y-2 rounded-2xl border border-black/10 bg-white p-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-bold">{share.person || "You"}</span>
                    <span className="text-sm font-semibold">
                      {naira(share.food)}
                      {mode === "split" && (
                        <span className="font-normal text-muted">
                          {" "}+ {naira(feeShares[index] ?? 0)} delivery
                        </span>
                      )}
                    </span>
                  </div>

                  <ul className="space-y-0.5 text-sm text-ink/75">
                    {share.lines.map((line) => (
                      <li key={line.key}>
                        {line.qty}× {line.name}
                        {line.choices.length > 0 && (
                          <span className="text-muted"> · {line.choices.join(", ")}</span>
                        )}
                      </li>
                    ))}
                  </ul>

                  {person && (
                    <div className="space-y-2 border-t border-black/5 pt-2">
                      {/* Nothing is assumed. Sending a friend's food to your own
                          block because a field was left blank is the kind of
                          mistake that loses a customer. */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-muted">
                          {person.name}&apos;s food goes
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updatePerson(person.name, {
                              goesTo: "mine",
                              hostel: "",
                              phone: "",
                            })
                          }
                          className={`chip py-1.5 text-xs ${
                            person.goesTo === "mine"
                              ? "border-ink bg-ink text-white"
                              : "border-black/10 bg-white"
                          }`}
                        >
                          Where mine goes
                        </button>
                        <button
                          type="button"
                          onClick={() => updatePerson(person.name, { goesTo: "theirs" })}
                          className={`chip py-1.5 text-xs ${
                            person.goesTo === "theirs"
                              ? "border-ink bg-ink text-white"
                              : "border-black/10 bg-white"
                          }`}
                        >
                          To them
                        </button>
                      </div>

                      {person.goesTo === "theirs" && (
                        <div className="flex flex-wrap gap-2">
                          <input
                            className="field grow py-1.5 text-sm"
                            inputMode="tel"
                            placeholder={`${person.name}'s phone`}
                            value={person.phone}
                            onChange={(event) =>
                              updatePerson(person.name, { phone: event.target.value })
                            }
                          />
                          {hostels.length > 0 ? (
                            <select
                              className="field grow py-1.5 text-sm"
                              value={hostels.includes(person.hostel) ? person.hostel : ""}
                              onChange={(event) =>
                                updatePerson(person.name, { hostel: event.target.value })
                              }
                            >
                              <option value="">{person.name}&apos;s block</option>
                              {hostels.map((name) => (
                                <option key={name} value={name}>
                                  {name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              className="field grow py-1.5 text-sm"
                              placeholder={`${person.name}'s hostel or block`}
                              value={person.hostel}
                              onChange={(event) =>
                                updatePerson(person.name, { hostel: event.target.value })
                              }
                            />
                          )}
                        </div>
                      )}

                      {mode === "split" && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-muted">
                            {person.name} pays by
                          </span>
                          {(["transfer", "card"] as const).map((way) => (
                            <button
                              key={way}
                              type="button"
                              onClick={() => updatePerson(person.name, { pays: way })}
                              className={`chip py-1.5 text-xs ${
                                (person.pays ?? "transfer") === way
                                  ? "border-ink bg-ink text-white"
                                  : "border-black/10 bg-white"
                              }`}
                            >
                              {way === "transfer" ? "Transfer" : "Card link"}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </li>
              );
            })}
          </ul>

          <p className="text-xs text-muted">
            A number each is how anyone in the group gets called when their food
            lands, and in a split it is what their payment link hangs off.
          </p>

          {mode === "split" && (
            <p className="text-xs text-muted">
              A phone number each means everyone gets their own payment link and
              their own narration. Leave one blank and that share sits
              under your number instead.
            </p>
          )}

          <fieldset className="space-y-2 border-t border-black/5 pt-3">
            <legend className="label">Who is it delivered to?</legend>
            <label className="flex gap-2 text-sm">
              <input
                type="radio"
                checked={collect === "leader"}
                onChange={() => setCollect("leader")}
              />
              <span>
                <span className="font-semibold">Everything comes to me.</span> It is
                all delivered to my block and I hand the rest out myself.
              </span>
            </label>
            <label className="flex gap-2 text-sm">
              <input
                type="radio"
                checked={collect === "each"}
                onChange={() => setCollect("each")}
              />
              <span>
                <span className="font-semibold">Each bag goes to its own person.</span>{" "}
                Delivered to the block under each name.
              </span>
            </label>
          </fieldset>

          <fieldset className="space-y-2 border-t border-black/5 pt-3">
            <legend className="label">Who pays?</legend>
            <label className="flex gap-2 text-sm">
              <input
                type="radio"
                checked={mode === "one_payer"}
                onChange={() => setMode("one_payer")}
              />
              <span>
                <span className="font-semibold">I pay for everything.</span> Friends
                settle up with me.
              </span>
            </label>
            <label className="flex gap-2 text-sm">
              <input
                type="radio"
                checked={mode === "split"}
                onChange={() => setMode("split")}
              />
              <span>
                <span className="font-semibold">Everyone pays their share.</span> A
                payment link each. Anyone unpaid by the cut-off is dropped and the rest
                still travels.
              </span>
            </label>
          </fieldset>
        </section>
      )}

      <section className="card space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-bold">Where it goes</h2>
          <FillDetails
            phone={phone}
            onFilled={(me) => {
              setName(me.name);
              setFilled(true);
              if (me.phone) setPhone(me.phone);
              if (me.hostel) setHostel(me.hostel);
            }}
          />
        </div>
        {filled && (
          <p className="rounded-xl bg-mint/10 px-3 py-2 text-sm font-semibold text-mint">
            Filled in from your last order. Change anything that has moved.
          </p>
        )}

        <div>
          <label className="label" htmlFor="name">Your name</label>
          <input
            id="name"
            name="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="field"
            autoComplete="name"
          />
        </div>
        <div>
          <label className="label" htmlFor="phone">Phone</label>
          <input
            id="phone"
            name="phone"
            required
            inputMode="tel"
            placeholder="0803 123 4567"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            readOnly={Boolean(adding)}
            className={`field ${badPhone ? "border-red-400 ring-4 ring-red-100" : ""}`}
            autoComplete="tel"
          />
          <p className="mt-1 text-xs text-muted">
            {badPhone
              ? "A Nigerian mobile: 0803 123 4567, or +234 803 123 4567."
              : "This is how you are reached, and what matches your transfer."}
          </p>
        </div>
        <div>
          <label className="label" htmlFor="hostel">Hostel / block</label>
          {hostels.length > 0 ? (
            <>
              <select
                id="hostel"
                name="hostel"
                required
                value={hostels.includes(hostel) ? hostel : ""}
                onChange={(event) => setHostel(event.target.value)}
                className="field"
              >
                <option value="">Pick your block</option>
                {hostels.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              {hostel !== "" && !hostels.includes(hostel) && (
                <p className="mt-1 text-xs text-brand">
                  You used &quot;{hostel}&quot; last time, which is not on the
                  list any more. Pick the closest block.
                </p>
              )}
            </>
          ) : (
            <input
              id="hostel"
              name="hostel"
              required
              value={hostel}
              onChange={(event) => setHostel(event.target.value)}
              placeholder="Block and room, or the hostel name"
              className="field"
            />
          )}
        </div>

        <div>
          <label className="label" htmlFor="customer_note">
            Anything we should know? (optional)
          </label>
          <textarea
            id="customer_note"
            name="customer_note"
            rows={2}
            maxLength={300}
            placeholder="No pepper, call me when you are outside, room 12"
            className="field"
          />
        </div>
      </section>

      <section className="card space-y-1 text-sm">
        <div className="flex justify-between text-muted">
          <span>Food</span>
          <span>{naira(subtotal)}</span>
        </div>
        <div className="flex justify-between text-muted">
          <span>
            {alreadyCharged > 0
              ? `Delivery top-up (${itemCount + alreadyItems} items)`
              : `Delivery (${itemCount} item${itemCount === 1 ? "" : "s"})`}
          </span>
          <span>{naira(fee)}</span>
        </div>
        <div className="flex justify-between border-t border-black/10 pt-2 text-lg font-extrabold">
          <span>Total</span>
          <span>{naira(total)}</span>
        </div>
        {/* A code is a thing somebody was given in a group chat, so it is
            typed in rather than carried by the link they happened to open. */}
        <CouponBox
          batchId={batchId}
          cart={JSON.stringify(toServerLines(cart))}
          phone={phone}
          onApplied={setApplied}
        />
        {applied && (
          <div className="flex justify-between text-mint">
            <span>Code {applied.code}</span>
            <span>−{naira(applied.discount)}</span>
          </div>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-30 border-t border-black/5 bg-paper p-3 shadow-bar sm:bottom-0">
        <div className="mx-auto max-w-2xl space-y-2">
          {unresolved.length > 0 && (
            <p className="rounded-xl bg-brand-tint px-3 py-2 text-sm font-semibold text-brand-dark">
              Say where {unresolved[0].name}&apos;s food goes: to your block with
              yours, or to them with their own number.
            </p>
          )}
          {state.error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {state.error}
            </p>
          )}
          <button
            type="submit"
            className="btn-primary w-full py-4 text-base"
            disabled={pending || !batchId || !splitReady || unresolved.length > 0}
          >
            {pending ? "Placing…" : `Place order · ${naira(total)}`}
          </button>
        </div>
      </div>
    </form>
  );
}
