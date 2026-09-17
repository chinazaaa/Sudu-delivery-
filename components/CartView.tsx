"use client";

import Link from "next/link";
import { useState } from "react";
import Thumb from "./Thumb";
import {
  addPerson,
  clearPeople,
  cartSubtotal,
  countItems,
  removePerson,
  setForName,
  setQty,
  useCart,
  usePeople,
} from "@/lib/cart";
import { naira } from "@/lib/money";

/** Review and fix the order. Nothing is asked for here except the food. */
export default function CartView() {
  const cart = useCart();
  const { people } = usePeople();
  const [newPerson, setNewPerson] = useState("");

  if (cart.length === 0) {
    return (
      <div className="card mx-auto max-w-md text-center">
        <h1 className="text-lg font-extrabold">Your cart is empty</h1>
        <p className="mt-1 text-sm text-muted">Pick something from the menu first.</p>
        <Link href="/" className="btn-primary mt-4 w-full">
          Back to the menu
        </Link>
      </div>
    );
  }

  const names = people.map((p) => p.name);
  const groups = ["", ...names]
    .map((person) => ({
      person,
      lines: cart.filter((l) => l.forName === person),
    }))
    .filter((group) => group.lines.length > 0);

  return (
    <div className="space-y-5 pb-36">
      <h1 className="text-2xl font-extrabold">Your cart</h1>

      <section className="card space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-bold">
            {people.length > 0 ? "People in this order" : "Ordering for friends?"}
          </h2>
          {people.length > 0 && (
            <button
              type="button"
              onClick={clearPeople}
              className="shrink-0 text-sm font-semibold text-muted hover:text-brand"
            >
              Turn off group
            </button>
          )}
        </div>
        <div>
          <p className="text-sm text-muted">
            {people.length > 0
              ? "Now tap a name under each item below to say whose it is. Bags are labelled with these names on delivery."
              : "Add their names, then tap a name under each item to say whose it is. The delivery fee does not change."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {people.map((person) => (
            <span key={person.name} className="chip border-black/10 bg-paper">
              {person.name}
              <button
                type="button"
                onClick={() => removePerson(person.name)}
                aria-label={`Remove ${person.name}`}
                className="text-muted"
              >
                ✕
              </button>
            </span>
          ))}

          <span className="flex items-center gap-1">
            <input
              className="field w-32 py-1.5 text-sm"
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
              className="chip border-black/10 bg-paper"
              onClick={() => {
                addPerson(newPerson);
                setNewPerson("");
              }}
            >
              Add
            </button>
          </span>
        </div>
      </section>


      {groups.map((group) => (
        <section key={group.person || "me"} className="space-y-3">
          {people.length > 0 && (
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-muted">
              {group.person || "You"}
            </h2>
          )}

          {group.lines.map((line) => (
            <div key={line.key} className="card flex gap-3">
              <span className="size-20 shrink-0 overflow-hidden rounded-xl">
                <Thumb src={line.imageUrl} name={line.name} rounded="rounded-none" />
              </span>

              <div className="min-w-0 flex-1">
                {/* The count lives beside the name too: one card holding three
                    of something read as one item in the cart. */}
                <p className="truncate font-bold">
                  {line.qty > 1 && <span className="text-brand">{line.qty}× </span>}
                  {line.name}
                </p>
                <p className="text-sm text-muted">
                  {line.restaurantName}
                  {line.choices.length > 0 && ` · ${line.choices.join(", ")}`}
                  {people.length > 0 && ` · for ${line.forName || "you"}`}
                </p>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="font-extrabold">{naira(line.unitPrice * line.qty)}</span>
                  <span className="flex items-center gap-1 rounded-full border border-black/10 p-1">
                    <button
                      type="button"
                      onClick={() => setQty(line.key, line.qty - 1)}
                      className="size-8 rounded-full text-lg leading-none hover:bg-black/5"
                      aria-label={`One less ${line.name}`}
                    >
                      −
                    </button>
                    <span className="w-5 text-center font-bold">{line.qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty(line.key, line.qty + 1)}
                      className="size-8 rounded-full text-lg leading-none hover:bg-black/5"
                      aria-label={`One more ${line.name}`}
                    >
                      +
                    </button>
                  </span>
                </div>

                {people.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-muted">Whose?</span>
                    {["", ...names].map((person) => (
                      <button
                        key={person || "me"}
                        type="button"
                        onClick={() => setForName(line.key, person)}
                        className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                          line.forName === person
                            ? "bg-brand text-white"
                            : "bg-black/[0.06] text-ink/70"
                        }`}
                      >
                        {person || "Me"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </section>
      ))}

      <Link href="/" className="inline-block font-semibold text-brand">
        Add something else
      </Link>

      <div className="fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-30 border-t border-black/5 bg-paper p-3 shadow-bar sm:bottom-0">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">
              {countItems(cart)} item{countItems(cart) === 1 ? "" : "s"}
              {cart.length !== countItems(cart) && ` · ${cart.length} product${cart.length === 1 ? "" : "s"}`}
            </p>
            <p className="truncate text-lg font-extrabold">{naira(cartSubtotal(cart))}</p>
          </div>
          <Link href="/checkout" className="btn-primary shrink-0 px-7 py-3.5">
            Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
