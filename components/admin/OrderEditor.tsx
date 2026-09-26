"use client";

import { useState } from "react";

import { naira } from "@/lib/money";
import type { EditedLine } from "@/lib/order-edit";

/**
 * What is actually in one order, changed by hand.
 *
 * A collection is sold high level on purpose: "a cake", "a flower". The
 * conversation on WhatsApp is where it becomes a twelve inch vanilla cake, or
 * a card instead of the flower, and after that conversation the order has to
 * say the agreed thing. Otherwise somebody reads "flower" off the run sheet
 * and delivers a flower to a person who asked for a card.
 *
 * Options are typed rather than picked. A shop that has to have thought of
 * every variant in advance is a shop that can never say yes to anything, and
 * the ones agreed in a chat belong to that order alone.
 *
 * Every change is its own small form, posted to the server on the spot. No
 * draft state to lose, and nothing that needs saving twice.
 */
export default function OrderEditor({
  orderId,
  lines,
  catalogue,
  pending,
  charged,
  total,
  setQty,
  addLine,
  addOption,
  removeOption,
  settle,
}: {
  orderId: string;
  lines: EditedLine[];
  /** Everything sellable, ours and the restaurants', for adding a line. */
  catalogue: {
    id: string;
    name: string;
    shop: string;
    price: number;
    options: { name: string; delta: number }[];
  }[];
  /** Whether the customer said the price is not settled yet. */
  pending: boolean;
  /** What was taken when it was marked paid, where it has been. */
  charged: number | null;
  total: number;
  setQty: (form: FormData) => void;
  addLine: (form: FormData) => void;
  addOption: (form: FormData) => void;
  removeOption: (form: FormData) => void;
  settle: (form: FormData) => void;
}) {
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();
  const found =
    needle.length < 2
      ? []
      : catalogue
          .filter(
            (one) =>
              one.name.toLowerCase().includes(needle) ||
              one.shop.toLowerCase().includes(needle)
          )
          .slice(0, 8);

  return (
    <section className="card mt-4 space-y-4">
      <div>
        <h2 className="font-bold">What is in it</h2>
        <p className="text-sm text-muted">
          Change this order to whatever was agreed. The collection everybody
          else buys is untouched, and the customer sees this the moment you
          change it.
        </p>
      </div>

      {pending && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="font-bold">
            They said this one needs changing, so the price is not settled.
          </p>
          <p className="mt-1 text-muted">
            Their page says so too. Make the changes, then say the price is
            agreed and it stops saying it.
          </p>
          <form action={settle} className="mt-2">
            <input type="hidden" name="order_id" value={orderId} />
            <button className="btn-primary px-4 py-2 text-sm">
              The price is agreed
            </button>
          </form>
        </div>
      )}

      {charged !== null && charged !== total && (
        <p className="rounded-xl bg-brand-tint px-3 py-2 text-sm font-semibold text-brand-dark">
          They paid {naira(charged)}. It now comes to {naira(total)}:{" "}
          {total > charged
            ? `${naira(total - charged)} still to collect.`
            : `${naira(charged - total)} to give back.`}
        </p>
      )}

      <ul className="space-y-3">
        {lines.map((line) => {
          const each =
            line.unit_price_at_order +
            line.options.reduce((sum, one) => sum + one.delta, 0);

          return (
            <li key={line.id} className="rounded-xl border border-black/10 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-bold">{line.name}</span>
                <span className="font-extrabold">{naira(line.qty * each)}</span>
              </div>

              {line.source !== "" && (
                <p className="mt-0.5 text-xs font-semibold text-brand-dark">
                  Get it: {line.source}
                </p>
              )}

              {line.options.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {line.options.map((one) => (
                    <li key={one.id} className="flex items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1">
                        {one.name}
                        {one.delta !== 0 && (
                          <span className="text-muted">
                            {" "}
                            · {one.delta > 0 ? "+" : "−"}
                            {naira(Math.abs(one.delta))}
                          </span>
                        )}
                      </span>
                      <form action={removeOption}>
                        <input type="hidden" name="option_row_id" value={one.id} />
                        <button className="text-xs font-semibold text-red-700">
                          Remove
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}

              <form action={setQty} className="mt-2 flex flex-wrap items-end gap-2">
                <input type="hidden" name="line_id" value={line.id} />
                <label className="text-xs font-semibold text-muted">
                  How many
                  <input
                    name="qty"
                    inputMode="numeric"
                    defaultValue={line.qty}
                    className="field mt-0.5 w-20 py-1.5 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold text-muted">
                  Each
                  <input
                    name="unit_price"
                    inputMode="numeric"
                    defaultValue={line.unit_price_at_order}
                    className="field mt-0.5 w-28 py-1.5 text-sm"
                  />
                </label>
                <button className="btn-quiet px-3 py-2 text-sm">Save</button>
                <span className="text-xs text-muted">Nothing of it, 0, takes it off.</span>
              </form>

              <ChoiceForm
                lineId={line.id}
                real={
                  catalogue.find((one) => one.id === line.menu_item_id)?.options ?? []
                }
                add={addOption}
              />
            </li>
          );
        })}
      </ul>

      {/* Adding a product rather than describing one, so the customer's own
          page reads as the thing they agreed to and the run sheet sends
          somebody to the right shop. */}
      <div className="rounded-xl border border-dashed border-black/15 p-3">
        <p className="label mb-1">Add something to this order</p>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search a card, a cake, a flower, anything on the menu"
          className="field py-2 text-sm"
        />
        {needle.length >= 2 && found.length === 0 && (
          <p className="mt-2 text-sm text-muted">
            Nothing matches. Add it as a product first, on the Restaurants
            screen under Sudu, and it will be here.
          </p>
        )}
        <ul className="mt-2 space-y-1">
          {found.map((one) => (
            <li key={one.id}>
              <form action={addLine} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="order_id" value={orderId} />
                <input type="hidden" name="menu_item_id" value={one.id} />
                <span className="min-w-40 grow text-sm">
                  <span className="font-semibold">{one.name}</span>
                  <span className="text-muted"> · {one.shop}</span>
                </span>
                <label className="text-xs font-semibold text-muted">
                  How many
                  <input
                    name="qty"
                    inputMode="numeric"
                    defaultValue={1}
                    className="field mt-0.5 w-16 py-1.5 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold text-muted">
                  Each
                  <input
                    name="unit_price"
                    inputMode="numeric"
                    defaultValue={one.price}
                    className="field mt-0.5 w-28 py-1.5 text-sm"
                  />
                </label>
                <button className="btn-quiet px-3 py-2 text-sm">Add it</button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * A choice added to one line.
 *
 * Two kinds of change land here and both matter. Hand tossed to thin crust
 * is a choice the menu already has, and picking it should not mean typing it
 * and its price again. Twelve inches with her name on it is a choice no menu
 * has and no menu should: a shop that has to have thought of every variant in
 * advance can never say yes to anything.
 *
 * So the list fills the boxes in, and the boxes can still be typed over.
 */
function ChoiceForm({
  lineId,
  real,
  add,
}: {
  lineId: string;
  real: { name: string; delta: number }[];
  add: (form: FormData) => void;
}) {
  const [name, setName] = useState("");
  const [delta, setDelta] = useState("");

  return (
    <form
      action={(form: FormData) => {
        add(form);
        setName("");
        setDelta("");
      }}
      className="mt-2 space-y-2"
    >
      <input type="hidden" name="line_id" value={lineId} />

      {real.length > 0 && (
        <select
          value=""
          onChange={(event) => {
            const picked = real[Number(event.target.value)];
            if (!picked) return;
            setName(picked.name);
            setDelta(String(picked.delta));
          }}
          className="field py-1.5 text-sm"
        >
          <option value="">Pick one it already has…</option>
          {real.map((one, at) => (
            <option key={`${one.name}-${at}`} value={at}>
              {one.name}
              {one.delta !== 0 ? ` (+${one.delta})` : ""}
            </option>
          ))}
        </select>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-40 grow text-xs font-semibold text-muted">
          Add a choice
          <input
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="12 inches · thin crust · write Happy Birthday Ada"
            className="field mt-0.5 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          Costs extra
          <input
            name="delta"
            value={delta}
            onChange={(event) => setDelta(event.target.value)}
            inputMode="numeric"
            placeholder="4000"
            className="field mt-0.5 w-28 py-1.5 text-sm"
          />
        </label>
        <button className="btn-quiet px-3 py-2 text-sm">Add</button>
      </div>
      <p className="text-xs text-muted">
        Minus works: agreeing something smaller takes money off.
      </p>
    </form>
  );
}
