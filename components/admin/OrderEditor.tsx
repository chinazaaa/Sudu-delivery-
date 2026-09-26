"use client";

import { useState } from "react";

import { naira } from "@/lib/money";
import type { EditedLine } from "@/lib/order-edit";

/**
 * What is actually in one order, and how to change it.
 *
 * This is the screen somebody stands in front of holding a phone with a
 * customer on it saying they want spaghetti instead of pasta. So the list
 * reads first and the controls come second: every line is one row you can
 * scan, and the way to change it is one button on that row.
 *
 * The first version put two forms under every line, always open. Twenty
 * lines meant forty forms, and finding the one that said "pasta" meant
 * scrolling past everything else twice.
 *
 * Options are typed as well as picked. A shop that has to have thought of
 * every variant in advance can never say yes to anything, and the ones
 * agreed in a chat belong to that order alone.
 */
export default function OrderEditor({
  orderId,
  lines,
  catalogue,
  pending,
  charged,
  total,
  note,
  setQty,
  addLine,
  addOption,
  removeOption,
  settle,
}: {
  orderId: string;
  lines: EditedLine[];
  catalogue: {
    id: string;
    name: string;
    shop: string;
    price: number;
    options: { name: string; delta: number }[];
  }[];
  pending: boolean;
  charged: number | null;
  total: number;
  /** What the customer asked for in their own words, if anything. */
  note: string;
  setQty: (form: FormData) => void;
  addLine: (form: FormData) => void;
  addOption: (form: FormData) => void;
  removeOption: (form: FormData) => void;
  settle: (form: FormData) => void;
}) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState("");

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

  const count = lines.reduce((sum, line) => sum + line.qty, 0);

  return (
    <section className="card mt-4 space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-extrabold">What is in it</h2>
          <p className="text-sm text-muted">
            {lines.length} line{lines.length === 1 ? "" : "s"} · {count} thing
            {count === 1 ? "" : "s"}. Change it to whatever was agreed; the
            collection everybody else buys is untouched.
          </p>
        </div>
        <span className="shrink-0 text-lg font-extrabold">{naira(total)}</span>
      </div>

      {/* What they asked for, at the top and in their own words. It was a
          line inside another card further down, which is where a "no
          pepper" goes to die. */}
      {note !== "" && (
        <div className="rounded-xl border-l-4 border-brand bg-brand-tint px-3 py-2.5">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-dark">
            They asked
          </p>
          <p className="mt-0.5 font-semibold text-ink">{note}</p>
        </div>
      )}

      {pending && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
          <p className="font-bold">The price is not settled.</p>
          <p className="mt-0.5 text-sm text-muted">
            They asked for a change, and their own page says so. Make the
            changes, then say the price is agreed.
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
        <p className="rounded-xl bg-shell px-3 py-2 text-sm font-semibold">
          They paid {naira(charged)}. It now comes to {naira(total)}:{" "}
          <span className={total > charged ? "text-red-700" : "text-mint"}>
            {total > charged
              ? `${naira(total - charged)} still to collect`
              : `${naira(charged - total)} to give back`}
          </span>
          .
        </p>
      )}

      <ul className="divide-y divide-black/5">
        {lines.map((line) => {
          const each =
            line.unit_price_at_order +
            line.options.reduce((sum, one) => sum + one.delta, 0);
          const showing = open === line.id;

          return (
            <li key={line.id} className="py-3 first:pt-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold leading-tight">
                    <span className="text-muted">{line.qty} ×</span> {line.name}
                  </p>

                  {/* Every choice as its own chip. Run together in a
                      sentence, "12 inches" and "vanilla" read as one thing
                      nobody can pick apart at a counter. */}
                  {line.options.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {line.options.map((one) => (
                        <span
                          key={one.id}
                          className="inline-flex items-center gap-1 rounded-full bg-shell px-2 py-0.5 text-xs font-semibold"
                        >
                          {one.name}
                          {one.delta !== 0 && (
                            <span className="text-muted">
                              {one.delta > 0 ? "+" : "−"}
                              {naira(Math.abs(one.delta))}
                            </span>
                          )}
                          <form action={removeOption}>
                            <input
                              type="hidden"
                              name="option_row_id"
                              value={one.id}
                            />
                            <button
                              aria-label={`Take off ${one.name}`}
                              className="text-muted hover:text-red-700"
                            >
                              ×
                            </button>
                          </form>
                        </span>
                      ))}
                    </div>
                  )}

                  {line.source !== "" && (
                    <p className="mt-1 text-xs font-semibold text-brand-dark">
                      Get it: {line.source}
                    </p>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <p className="font-extrabold">{naira(line.qty * each)}</p>
                  <button
                    type="button"
                    onClick={() => setOpen(showing ? "" : line.id)}
                    className="text-sm font-bold text-brand"
                  >
                    {showing ? "Done" : "Change"}
                  </button>
                </div>
              </div>

              {showing && (
                <div className="mt-3 space-y-3 rounded-xl bg-shell p-3">
                  <form action={setQty} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="line_id" value={line.id} />
                    <label className="text-xs font-semibold text-muted">
                      How many
                      <input
                        name="qty"
                        inputMode="numeric"
                        defaultValue={line.qty}
                        className="field mt-0.5 w-20 bg-white py-1.5 text-sm"
                      />
                    </label>
                    <label className="text-xs font-semibold text-muted">
                      Each
                      <input
                        name="unit_price"
                        inputMode="numeric"
                        defaultValue={line.unit_price_at_order}
                        className="field mt-0.5 w-28 bg-white py-1.5 text-sm"
                      />
                    </label>
                    <button className="btn-quiet bg-white px-3 py-2 text-sm">
                      Save
                    </button>
                    <span className="text-xs text-muted">0 takes it off</span>
                  </form>

                  <ChoiceForm
                    lineId={line.id}
                    real={
                      catalogue.find((one) => one.id === line.menu_item_id)
                        ?.options ?? []
                    }
                    add={addOption}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Folded away, because most orders never gain a line and a search box
          standing open on every one of them is a box in the way. */}
      {adding ? (
        <div className="rounded-xl border border-dashed border-black/15 p-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="label">Add something</p>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="text-sm font-semibold text-muted"
            >
              Cancel
            </button>
          </div>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Spaghetti, a cake, a card, anything on the menu"
            className="field mt-1 py-2 text-sm"
          />
          {needle.length >= 2 && found.length === 0 && (
            <p className="mt-2 text-sm text-muted">
              Nothing matches. Add it as a product first, on Restaurants under
              Sudu, and it will be here.
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
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="btn-quiet w-full py-2.5 text-sm"
        >
          Add something to this order
        </button>
      )}
    </section>
  );
}

/**
 * A choice added to one line.
 *
 * Two kinds of change land here and both matter. Hand tossed to thin crust
 * is a choice the menu already has, and picking it should not mean typing it
 * and its price again. Twelve inches with her name on it is a choice no menu
 * has and no menu should.
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
      className="space-y-2 border-t border-black/5 pt-3"
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
          className="field bg-white py-1.5 text-sm"
        >
          <option value="">Pick a choice it already has…</option>
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
            placeholder="Thin crust · 12 inches · write Happy Birthday Ada"
            className="field mt-0.5 bg-white py-1.5 text-sm"
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
            className="field mt-0.5 w-28 bg-white py-1.5 text-sm"
          />
        </label>
        <button className="btn-quiet bg-white px-3 py-2 text-sm">Add</button>
      </div>
      <p className="text-xs text-muted">Minus works: −2000 takes money off.</p>
    </form>
  );
}
