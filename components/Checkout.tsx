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
import { FIRST_ORDER_DISCOUNT } from "@/lib/config";
import { feeFor, splitFee } from "@/lib/fees";
import { naira } from "@/lib/money";
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
  promoter,
  adding,
}: {
  batches: BatchView[];
  promoter: { code: string; name: string } | null;
  adding: AddingTo | null;
}) {
  const cart = useCart();
  const { people } = usePeople();
  const openable = batches.filter((b) => !b.closed && !b.full);
  const [batchId, setBatchId] = useState(adding?.batchId ?? openable[0]?.id ?? "");
  const [method, setMethod] = useState<"transfer" | "card">("transfer");
  const [mode, setMode] = useState<GroupMode>("one_payer");
  const [collect, setCollect] = useState<"leader" | "each">("leader");
  const [now, setNow] = useState<number | null>(null);
  const [state, action, pending] = useActionState<SubmitState, FormData>(submitOrder, {
    error: null,
  });

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const selected = batches.find((b) => b.id === batchId) ?? null;
  const itemCount = countItems(cart);
  const subtotal = cartSubtotal(cart);
  const alreadyItems = adding?.items ?? 0;
  const alreadyCharged = adding?.feeCharged ?? 0;
  const fee = Math.max(
    0,
    feeFor(itemCount + alreadyItems, selected?.flashFee ?? null) - alreadyCharged
  );
  const total = subtotal + fee;

  const groupOn = people.length > 0;
  const names = people.map((p) => p.name);
  const shares = ["", ...names]
    .map((person) => {
      const lines = cart.filter((l) => l.forName === person);
      return {
        person,
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
      <input type="hidden" name="cart" value={JSON.stringify(toServerLines(cart))} />
      <input type="hidden" name="batch_id" value={batchId} />
      <input type="hidden" name="group_mode" value={groupOn ? mode : ""} />
      <input type="hidden" name="payment_method" value={method} />
      <input type="hidden" name="collect_mode" value={collect} />
      <input type="hidden" name="people" value={JSON.stringify(people)} />
      {promoter && <input type="hidden" name="ref" value={promoter.code} />}

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
              ["transfer", "Bank transfer", "Details on the next screen. Use your phone number as the narration."],
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
              // Their own number is what a payment link and a transfer
              // narration need; their own block is what a bag label needs.
              const wantsPhone = mode === "split" && Boolean(person);
              const wantsHostel = collect === "each" && Boolean(person);

              return (
                <li key={share.person || "me"} className="space-y-2">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="font-semibold">{share.person || "You"}</span>
                    <span className="text-muted">
                      {naira(share.food)}
                      {mode === "split" && ` + ${naira(feeShares[index] ?? 0)} delivery`}
                    </span>
                  </div>

                  {(wantsPhone || wantsHostel) && person && (
                    <div className="flex flex-wrap gap-2">
                      {wantsPhone && (
                        <input
                          className="field grow py-1.5 text-sm"
                          inputMode="tel"
                          placeholder={`${person.name}'s phone, for their link`}
                          value={person.phone}
                          onChange={(e) =>
                            updatePerson(person.name, { phone: e.target.value })
                          }
                        />
                      )}
                      {wantsHostel && (
                        <input
                          className="field grow py-1.5 text-sm"
                          placeholder={`${person.name}'s hostel or block`}
                          value={person.hostel}
                          onChange={(e) =>
                            updatePerson(person.name, { hostel: e.target.value })
                          }
                        />
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {mode === "split" && (
            <p className="text-xs text-muted">
              A phone number each means everyone gets their own payment link and
              their own transfer narration. Leave one blank and that share sits
              under your number instead.
            </p>
          )}

          <fieldset className="space-y-2 border-t border-black/5 pt-3">
            <legend className="label">Who collects at the drop point?</legend>
            <label className="flex gap-2 text-sm">
              <input
                type="radio"
                checked={collect === "leader"}
                onChange={() => setCollect("leader")}
              />
              <span>
                <span className="font-semibold">I collect everything.</span> One name is
                called, I take all the bags and hand them out myself.
              </span>
            </label>
            <label className="flex gap-2 text-sm">
              <input
                type="radio"
                checked={collect === "each"}
                onChange={() => setCollect("each")}
              />
              <span>
                <span className="font-semibold">Each person collects their own.</span>{" "}
                Every name is called separately at the drop point.
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
        <h2 className="font-bold">Where it goes</h2>
        <div>
          <label className="label" htmlFor="name">Your name</label>
          <input id="name" name="name" required defaultValue={adding?.name} className="field" autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="phone">Phone</label>
          <input
            id="phone"
            name="phone"
            required
            inputMode="tel"
            placeholder="0803 123 4567"
            defaultValue={adding?.phone}
            readOnly={Boolean(adding)}
            className="field"
            autoComplete="tel"
          />
        </div>
        <div>
          <label className="label" htmlFor="hostel">Hostel / block</label>
          <input id="hostel" name="hostel" required defaultValue={adding?.hostel} className="field" />
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
        {promoter && (
          <p className="pt-1 text-brand-dark">
            {naira(FIRST_ORDER_DISCOUNT)} comes off if this is your first order.
          </p>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-[68px] z-30 border-t border-black/5 bg-paper p-3 shadow-bar sm:bottom-0">
        <div className="mx-auto max-w-2xl space-y-2">
          {state.error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {state.error}
            </p>
          )}
          <button
            type="submit"
            className="btn-primary w-full py-4 text-base"
            disabled={pending || !batchId || !splitReady}
          >
            {pending ? "Placing…" : `Place order · ${naira(total)}`}
          </button>
        </div>
      </div>
    </form>
  );
}
