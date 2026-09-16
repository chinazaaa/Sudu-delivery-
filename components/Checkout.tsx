"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import Thumb from "./Thumb";
import FeeSummary from "./FeeSummary";
import { submitOrder, type SubmitState } from "@/app/actions";
import {
  addPerson,
  cartSubtotal,
  countItems,
  removePerson,
  setForName,
  setQty,
  toServerLines,
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
  const openable = batches.filter((b) => !b.closed && !b.full);
  const [batchId, setBatchId] = useState(adding?.batchId ?? openable[0]?.id ?? "");
  const { people } = usePeople();
  const [mode, setMode] = useState<GroupMode>("one_payer");
  const [newPerson, setNewPerson] = useState("");
  const groupOn = people.length > 0;
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

  // The cart is already sorted by person, because that is how it was filled in.
  const groups = ["", ...people]
    .map((person) => {
      const lines = cart.filter((l) => l.forName === person);
      return {
        person,
        lines,
        items: lines.reduce((n, l) => n + l.qty, 0),
        food: lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0),
      };
    })
    .filter((group) => group.lines.length > 0);

  const payingGroups = groups.filter((g) => g.items > 0);
  const splitReady = !groupOn || mode === "one_payer" || payingGroups.length >= 2;
  const feeShares = splitFee(fee, payingGroups.map((g) => g.items));

  if (cart.length === 0) {
    return (
      <div className="card mx-auto max-w-md text-center">
        <h1 className="text-lg font-bold">Your cart is empty</h1>
        <p className="mt-1 text-sm text-muted">Pick something from the menu first.</p>
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

      <section className="space-y-3">
        <h2 className="font-bold">Your items</h2>

        {groups.map((group) => (
          <div key={group.person || "me"} className="space-y-2">
            {people.length > 0 && (
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold">
                  {group.person || "You"}
                  <span className="font-normal text-muted">
                    {" "}· {group.items} item{group.items === 1 ? "" : "s"}
                  </span>
                </h3>
                <span className="text-sm font-semibold">{naira(group.food)}</span>
              </div>
            )}

            <ul className="space-y-2">
              {group.lines.map((line) => (
                <li key={line.key} className="card flex gap-3 p-3">
                  <span className="size-16 shrink-0 overflow-hidden rounded-xl">
                    <Thumb src={line.imageUrl} name={line.name} rounded="rounded-none" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{line.name}</p>
                    <p className="text-xs text-muted">
                      {line.restaurantName}
                      {line.choices.length > 0 && ` · ${line.choices.join(", ")}`}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="font-semibold">
                        {naira(line.unitPrice * line.qty)}
                      </span>
                      <span className="flex items-center gap-1 rounded-full border border-black/10 p-1">
                        <button
                          type="button"
                          onClick={() => setQty(line.key, line.qty - 1)}
                          className="size-7 rounded-full text-lg leading-none hover:bg-black/5"
                          aria-label={`One less ${line.name}`}
                        >
                          −
                        </button>
                        <span className="w-5 text-center text-sm font-semibold">
                          {line.qty}
                        </span>
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

                    {people.length > 0 && (
                      <select
                        className="field mt-2 py-1 text-sm"
                        value={line.forName}
                        onChange={(e) => setForName(line.key, e.target.value)}
                      >
                        <option value="">For you</option>
                        {people.map((person) => (
                          <option key={person} value={person}>
                            For {person}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <Link href="/" className="inline-block text-sm font-medium text-brand hover:underline">
          Add something else
        </Link>
      </section>

      <section className="card space-y-2">
        <h2 className="font-bold">Which run?</h2>
        <label className="label" htmlFor="batch">Delivery day</label>
        <select
          id="batch"
          className="field"
          value={batchId}
          onChange={(e) => setBatchId(e.target.value)}
          disabled={adding !== null}
        >
          {openable.map((batch) => {
            const left =
              now === null ? "" : ` · closes in ${countdown(new Date(batch.cutOffISO).getTime() - now)}`;
            return (
              <option key={batch.id} value={batch.id}>
                {batch.label}{left}
              </option>
            );
          })}
        </select>
        {selected && (
          <p className="text-sm text-muted">
            Orders close {selected.cutOffLabel}. {selected.deliveryWindow}.
            {selected.flashFee !== null && ` ${naira(selected.flashFee)} delivery today.`}
          </p>
        )}
        {adding && (
          <p className="text-sm text-muted">
            Fixed to the run you are adding to, so it travels in one bag.
          </p>
        )}
      </section>

      <section className="card space-y-3">
        <div>
          <h2 className="font-bold">
            {groupOn ? "Who is in this order" : "Is this a group order?"}
          </h2>
          <p className="text-sm text-muted">
            {groupOn
              ? "Bags are labelled with these names at the drop point."
              : "Turn it into one: add the names, then say whose each item is. The delivery fee does not change."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {payingGroups.map((group, index) => (
            <span key={group.person || "me"} className="chip border-black/10 bg-white">
              {group.person || "You"}
              <span className="text-muted">
                {naira(group.food)}
                {mode === "split" && ` + ${naira(feeShares[index] ?? 0)}`}
              </span>
              {group.person && (
                <button
                  type="button"
                  onClick={() => removePerson(group.person)}
                  aria-label={`Remove ${group.person}`}
                  className="text-ink/35 hover:text-brand"
                >
                  ✕
                </button>
              )}
            </span>
          ))}

          <span className="flex items-center gap-1">
            <input
              className="field w-32 py-1 text-sm"
              placeholder="Add a name"
              value={newPerson}
              onChange={(e) => setNewPerson(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                addPerson(newPerson);
                setNewPerson("");
              }}
            />
            <button
              type="button"
              className="btn-quiet px-3 py-1 text-sm"
              onClick={() => {
                addPerson(newPerson);
                setNewPerson("");
              }}
            >
              Add
            </button>
          </span>
        </div>

        {groupOn && (
          <fieldset className="space-y-2 border-t border-black/5 pt-3">
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
            {mode === "split" && !splitReady && (
              <p className="text-sm text-brand-dark">
                Two people at least, each with something in the cart.
              </p>
            )}
          </fieldset>
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
          <p className="mt-1 text-xs text-muted">
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
          <div className="flex justify-between text-ink/75">
            <dt>Food</dt>
            <dd>{naira(subtotal)}</dd>
          </div>
          <div className="flex justify-between text-ink/75">
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
          <p className="text-center text-xs text-muted">
            Transfer details on the next screen, or message us to pay by card.
          </p>
        </div>
      </div>
    </form>
  );
}
