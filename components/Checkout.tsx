"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import Thumb from "./Thumb";
import FeeSummary from "./FeeSummary";
import { submitOrder, type SubmitState } from "@/app/actions";
import { cartSubtotal, countItems, setForName, setQty, toServerLines, useCart } from "@/lib/cart";
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
  const openable = batches.filter((b) => !b.closed && !b.full);
  const [batchId, setBatchId] = useState(adding?.batchId ?? openable[0]?.id ?? "");
  const [groupOn, setGroupOn] = useState(false);
  const [mode, setMode] = useState<GroupMode>("one_payer");
  const [people, setPeople] = useState<string[]>([]);
  const [newPerson, setNewPerson] = useState("");
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

  const named = people.filter(Boolean);
  const assigned = cart.filter((l) => l.forName);
  const everyoneAssigned = groupOn && cart.length > 0 && assigned.length === cart.length;
  const splitReady = !groupOn || mode === "one_payer" || (everyoneAssigned && named.length >= 2);

  // What each person would pay, so a split is not a surprise at the door.
  const shares = named.map((person) => {
    const lines = cart.filter((l) => l.forName === person);
    return {
      person,
      items: lines.reduce((n, l) => n + l.qty, 0),
      food: lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0),
    };
  });
  const feeShares = splitFee(fee, shares.map((s) => s.items));

  if (cart.length === 0) {
    return (
      <div className="card mx-auto max-w-md text-center">
        <h1 className="text-lg font-bold">Your cart is empty</h1>
        <p className="mt-1 text-sm text-ink/60">Pick something from the menu first.</p>
        <Link href="/" className="btn-primary mt-4 w-full">
          Back to the menu
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5 pb-28">
      <input type="hidden" name="cart" value={JSON.stringify(toServerLines(cart))} />
      <input type="hidden" name="batch_id" value={batchId} />
      <input type="hidden" name="group_mode" value={groupOn ? mode : ""} />
      {promoter && <input type="hidden" name="ref" value={promoter.code} />}

      <h1 className="text-2xl font-extrabold tracking-tight">Checkout</h1>

      {adding && (
        <p className="rounded-xl bg-brand-tint px-3 py-2 text-sm text-brand-dark">
          Adding to your order in the {adding.batchLabel} batch ({adding.items}{" "}
          item{adding.items === 1 ? "" : "s"} already). Same bag, and you only pay more
          delivery if this pushes you into a bigger load.
        </p>
      )}

      <section className="space-y-2">
        <h2 className="font-bold">Your items</h2>
        <ul className="space-y-2">
          {cart.map((line) => (
            <li key={line.key} className="card flex gap-3 p-3">
              <span className="size-16 shrink-0 overflow-hidden rounded-xl">
                <Thumb src={line.imageUrl} name={line.name} rounded="rounded-none" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{line.name}</p>
                <p className="text-xs text-ink/50">
                  {line.restaurantName}
                  {line.choices.length > 0 && ` · ${line.choices.join(", ")}`}
                </p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="font-semibold">{naira(line.unitPrice * line.qty)}</span>
                  <span className="flex items-center gap-1 rounded-full border border-black/10 p-1">
                    <button
                      type="button"
                      onClick={() => setQty(line.key, line.qty - 1)}
                      className="size-7 rounded-full text-lg leading-none hover:bg-black/5"
                      aria-label={`One less ${line.name}`}
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-sm font-semibold">{line.qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty(line.key, line.qty + 1)}
                      className="size-7 rounded-full text-lg leading-none hover:bg-black/5"
                      aria-label={`One more ${line.name}`}
                    >
                      +
                    </button>
                  </span>
                </div>

                {groupOn && (
                  <select
                    className="field mt-2 py-1 text-sm"
                    value={line.forName}
                    onChange={(e) => setForName(line.key, e.target.value)}
                  >
                    <option value="">Whose is this?</option>
                    {named.map((person) => (
                      <option key={person} value={person}>
                        {person}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </li>
          ))}
        </ul>
        <Link href="/" className="inline-block text-sm font-medium text-brand hover:underline">
          Add something else
        </Link>
      </section>

      <section className="card space-y-3">
        <div>
          <h2 className="font-bold">Which run?</h2>
          <p className="text-sm text-ink/55">
            Missed one? Order into the next. Nothing is lost.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {batches.map((batch) => {
            const left =
              now === null ? "…" : countdown(new Date(batch.cutOffISO).getTime() - now);
            const disabled = batch.closed || batch.full || (adding !== null && batch.id !== adding.batchId);
            return (
              <button
                key={batch.id}
                type="button"
                disabled={disabled}
                onClick={() => setBatchId(batch.id)}
                className={`rounded-xl border p-3 text-left transition disabled:opacity-45 ${
                  batch.id === batchId
                    ? "border-brand bg-brand-tint"
                    : "border-black/10 hover:bg-black/[0.03]"
                }`}
              >
                <span className={`block font-semibold ${batch.closed ? "line-through" : ""}`}>
                  {batch.label}
                </span>
                <span className="block text-sm text-ink/60">{batch.deliveryWindow}</span>
                <span className="block text-sm">
                  {batch.closed ? "Closed" : `Closes in ${left}`}
                </span>
                {batch.full && <span className="block text-sm text-brand">Full</span>}
                {batch.flashFee !== null && !batch.closed && (
                  <span className="block text-sm font-semibold text-brand">
                    {naira(batch.flashFee)} delivery
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold">Ordering for friends?</h2>
            <p className="text-sm text-ink/55">
              One cart, bags labelled by name at the drop point. Same delivery fee.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setGroupOn((on) => !on)}
            className={groupOn ? "btn-primary px-3 py-1.5 text-sm" : "btn-quiet px-3 py-1.5 text-sm"}
          >
            {groupOn ? "On" : "Start"}
          </button>
        </div>

        {groupOn && (
          <div className="space-y-3 border-t border-black/5 pt-3">
            <div>
              <label className="label" htmlFor="person">Who is in this order?</label>
              <div className="flex gap-2">
                <input
                  id="person"
                  className="field"
                  placeholder="Name"
                  value={newPerson}
                  onChange={(e) => setNewPerson(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    const name = newPerson.trim();
                    if (name && !people.includes(name)) setPeople([...people, name]);
                    setNewPerson("");
                  }}
                />
                <button
                  type="button"
                  className="btn-quiet shrink-0"
                  onClick={() => {
                    const name = newPerson.trim();
                    if (name && !people.includes(name)) setPeople([...people, name]);
                    setNewPerson("");
                  }}
                >
                  Add
                </button>
              </div>
            </div>

            {named.length > 0 && (
              <ul className="space-y-2">
                {shares.map((share, index) => (
                  <li
                    key={share.person}
                    className="flex items-baseline justify-between gap-2 rounded-xl bg-black/[0.03] px-3 py-2 text-sm"
                  >
                    <span className="font-medium">
                      {share.person}
                      <span className="text-ink/50">
                        {" "}
                        · {share.items} item{share.items === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span>
                        {naira(share.food)}
                        {mode === "split" && ` + ${naira(feeShares[index] ?? 0)} delivery`}
                      </span>
                      <button
                        type="button"
                        className="text-ink/40 hover:text-brand"
                        onClick={() => {
                          setPeople(people.filter((p) => p !== share.person));
                          for (const line of cart) {
                            if (line.forName === share.person) setForName(line.key, "");
                          }
                        }}
                        aria-label={`Remove ${share.person}`}
                      >
                        ✕
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {named.length > 0 && !everyoneAssigned && (
              <p className="text-sm text-brand-dark">
                Tag every item above with whose it is.
              </p>
            )}

            <fieldset className="space-y-2">
              <legend className="label">Who pays?</legend>
              <label className="flex gap-2 text-sm">
                <input
                  type="radio"
                  name="who_pays"
                  checked={mode === "one_payer"}
                  onChange={() => setMode("one_payer")}
                />
                <span>
                  <span className="font-medium">I pay for everything.</span> Friends settle
                  up with me.
                </span>
              </label>
              <label className="flex gap-2 text-sm">
                <input
                  type="radio"
                  name="who_pays"
                  checked={mode === "split"}
                  onChange={() => setMode("split")}
                />
                <span>
                  <span className="font-medium">Everyone pays their share.</span> One
                  payment link per name. Anyone unpaid by the cut-off is dropped, the rest
                  still travels, and the fee drops with it.
                </span>
              </label>
            </fieldset>
          </div>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">Where it goes</h2>
        <div>
          <label className="label" htmlFor="name">Your name</label>
          <input
            id="name"
            name="name"
            required
            defaultValue={adding?.name}
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
            defaultValue={adding?.phone}
            readOnly={Boolean(adding)}
            className="field"
            autoComplete="tel"
          />
          <p className="mt-1 text-xs text-ink/50">
            This is how we find your order. No account needed.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="hostel">Hostel / block</label>
          <input
            id="hostel"
            name="hostel"
            required
            defaultValue={adding?.hostel}
            className="field"
          />
        </div>
      </section>

      <section className="card space-y-2">
        <h2 className="font-bold">Total</h2>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between text-ink/70">
            <dt>Food</dt>
            <dd>{naira(subtotal)}</dd>
          </div>
          <div className="flex justify-between text-ink/70">
            <dt>
              {alreadyCharged > 0
                ? `Delivery top-up (${itemCount + alreadyItems} items in total)`
                : `Delivery (${itemCount} item${itemCount === 1 ? "" : "s"})`}
            </dt>
            <dd>{naira(fee)}</dd>
          </div>
          <div className="flex justify-between border-t border-black/10 pt-1 text-base font-bold">
            <dt>Total</dt>
            <dd>{naira(total)}</dd>
          </div>
        </dl>
        <FeeSummary
          itemCount={itemCount + alreadyItems}
          flashFee={selected?.flashFee ?? null}
          alreadyCharged={alreadyCharged}
        />
        {promoter && (
          <p className="text-sm text-brand-dark">
            {naira(FIRST_ORDER_DISCOUNT)} comes off if this is your first order with us.
          </p>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/5 bg-white p-3 shadow-bar">
        <div className="mx-auto max-w-3xl space-y-2">
          {state.error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}
          <button
            type="submit"
            className="btn-primary w-full py-3"
            disabled={pending || !batchId || !splitReady}
          >
            {pending ? "Placing…" : `Place order · ${naira(total)}`}
          </button>
          <p className="text-center text-xs text-ink/50">
            Transfer details on the next screen, or message us to pay by card.
          </p>
        </div>
      </div>
    </form>
  );
}
