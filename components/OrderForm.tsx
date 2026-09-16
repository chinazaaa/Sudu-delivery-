"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import Countdown from "./Countdown";
import FeeSummary from "./FeeSummary";
import { submitOrder, type SubmitState } from "@/app/actions";
import { feeFor } from "@/lib/fees";
import { FIRST_ORDER_DISCOUNT } from "@/lib/config";
import { naira } from "@/lib/money";
import type { BatchView, MenuView } from "@/lib/view";
import type { GroupMode } from "@/lib/types";

export type AddingTo = {
  batchId: string;
  phone: string;
  name: string;
  hostel: string;
  items: number;
  feeCharged: number;
};

export default function OrderForm({
  menu,
  batches,
  promoter,
  adding,
}: {
  menu: MenuView[];
  batches: BatchView[];
  promoter: { code: string; name: string } | null;
  /** Set when this cart is being added to an order already in a batch. */
  adding: AddingTo | null;
}) {
  const openable = batches.filter((b) => !b.full && !b.closed);
  // Default to the next open batch, so ordering is one tap (brief §9) — unless
  // we are adding to an order, in which case it has to be that batch.
  const [batchId, setBatchId] = useState(adding?.batchId ?? openable[0]?.id ?? "");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [forNames, setForNames] = useState<Record<string, string>>({});
  const [groupOn, setGroupOn] = useState(false);
  const [mode, setMode] = useState<GroupMode>("one_payer");
  const [state, action, pending] = useActionState<SubmitState, FormData>(submitOrder, {
    error: null,
  });

  const items = useMemo(
    () => new Map(menu.flatMap((m) => m.items.map((i) => [i.id, i]))),
    [menu]
  );

  const lines = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([menu_item_id, qty]) => ({
      menu_item_id,
      qty,
      for_name: groupOn ? forNames[menu_item_id]?.trim() || null : null,
    }));

  const subtotal = lines.reduce(
    (total, l) => total + (items.get(l.menu_item_id)?.price ?? 0) * l.qty,
    0
  );
  const itemCount = lines.reduce((count, l) => count + l.qty, 0);

  const selected = batches.find((b) => b.id === batchId) ?? null;
  const flashFee = selected?.flashFee ?? null;
  const alreadyCharged = adding && adding.batchId === batchId ? adding.feeCharged : 0;
  const alreadyItems = adding && adding.batchId === batchId ? adding.items : 0;
  // One load, one band: the fee is worked out on everything this phone has in
  // the batch, and what was already charged comes off (addendum §3).
  const fee = Math.max(0, feeFor(itemCount + alreadyItems, flashFee) - alreadyCharged);
  const total = subtotal + fee;

  const nextAfter = selected
    ? openable.find((b) => new Date(b.cutOffISO) > new Date(selected.cutOffISO)) ?? null
    : null;

  const namesTagged = new Set(
    lines.map((l) => l.for_name).filter((name): name is string => Boolean(name))
  );
  const splitReady = mode === "one_payer" || namesTagged.size >= 2;

  const setQty = (id: string, qty: number) =>
    setCart((current) => ({ ...current, [id]: Math.max(0, qty) }));

  if (batches.length === 0) {
    return (
      <div className="card">
        <h2 className="font-semibold">Ordering is closed right now</h2>
        <p className="mt-1 text-sm text-ink/70">
          The next run day has not been opened yet. Watch the PAU WhatsApp group — the
          menu goes up on Monday.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="cart" value={JSON.stringify(lines)} />
      <input type="hidden" name="batch_id" value={batchId} />
      <input type="hidden" name="group_mode" value={groupOn ? mode : ""} />
      {promoter && <input type="hidden" name="ref" value={promoter.code} />}

      {promoter && !adding && (
        <p className="rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand-dark">
          {promoter.name} sent you — {naira(FIRST_ORDER_DISCOUNT)} off if this is your
          first order.
        </p>
      )}

      {adding && (
        <p className="rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand-dark">
          Adding to your order in the{" "}
          {batches.find((b) => b.id === adding.batchId)?.label ?? "open"} batch
          ({adding.items} item{adding.items === 1 ? "" : "s"} already). It goes in the
          same bag, and you only pay more delivery if the extra items push you into a
          bigger load.
        </p>
      )}

      <section className="card space-y-3">
        <div>
          <h2 className="font-semibold">Pick your batch</h2>
          <p className="text-sm text-ink/60">
            Closed a batch? Order into the next one — nothing is lost.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {batches.map((batch) => (
            <button
              key={batch.id}
              type="button"
              disabled={
                batch.full || batch.closed || (adding !== null && batch.id !== adding.batchId)
              }
              onClick={() => setBatchId(batch.id)}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                batch.id === batchId
                  ? "border-brand bg-brand/10"
                  : "border-black/15 hover:bg-black/5"
              } disabled:opacity-40`}
            >
              <span className={`block font-medium ${batch.closed ? "line-through" : ""}`}>
                {batch.label}
              </span>
              <span className="block text-ink/60">
                {batch.closed ? "Closed" : "Closes"} {batch.cutOffLabel} ·{" "}
                {batch.deliveryWindow}
              </span>
              {batch.closed && (
                <span className="block text-ink/60">
                  Missed it — order into the next batch below.
                </span>
              )}
              {batch.full && <span className="block text-brand">Full</span>}
              {batch.flashFee !== null && (
                <span className="block font-medium text-brand">
                  {naira(batch.flashFee)} delivery
                </span>
              )}
            </button>
          ))}
        </div>

        {selected?.flashFee !== null && selected && (
          <p className="rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand-dark">
            <span className="font-semibold">
              {naira(selected.flashFee!)} delivery, {selected.label} batch only.
            </span>{" "}
            {selected.flashReason}
          </p>
        )}

        {selected && (
          <Countdown
            current={{ label: selected.label, cutOffISO: selected.cutOffISO }}
            next={nextAfter && { label: nextAfter.label, cutOffISO: nextAfter.cutOffISO }}
          />
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-semibold">Menu</h2>
            <p className="text-sm text-ink/60">
              Mix restaurants in one order — one delivery fee either way.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setGroupOn((on) => !on)}
            className={groupOn ? "btn-primary shrink-0" : "btn-quiet shrink-0"}
          >
            {groupOn ? "Group order on" : "Start a group order"}
          </button>
        </div>

        {menu.map((group) => (
          <div key={group.restaurant.id} className="card space-y-2">
            <div className="flex items-baseline justify-between">
              <h3 className="font-semibold">{group.restaurant.name}</h3>
              <span className="text-xs text-ink/50">
                closes {group.restaurant.closesAt}
              </span>
            </div>

            {group.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 border-t border-black/5 pt-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="text-sm text-ink/60">
                    {naira(item.price)}
                    {!item.available && " · unavailable today"}
                  </p>
                </div>
                <QtyStepper
                  qty={cart[item.id] ?? 0}
                  disabled={!item.available}
                  onChange={(qty) => setQty(item.id, qty)}
                />
              </div>
            ))}
          </div>
        ))}
      </section>

      {groupOn && (
      <section className="card space-y-3">
        <div>
          <h2 className="font-semibold">Group order</h2>
          <p className="text-sm text-ink/60">
            One cart, one payment, bags labelled by name at the drop point.
          </p>
        </div>

        <>
            <p className="text-sm text-ink/60">
              Tag each item with whose it is, then choose who pays. The delivery fee is
              the same as any order this size — no extra charge for sharing a cart.
            </p>
            <div className="space-y-2">
              {lines.length === 0 ? (
                <p className="text-sm text-ink/60">Add something to the cart first.</p>
              ) : (
                lines.map((line) => (
                  <div key={line.menu_item_id} className="flex items-center gap-2">
                    <span className="min-w-0 grow truncate text-sm">
                      {line.qty}× {items.get(line.menu_item_id)?.name}
                    </span>
                    <input
                      className="field w-36 py-1 text-sm"
                      placeholder="For…"
                      value={forNames[line.menu_item_id] ?? ""}
                      onChange={(e) =>
                        setForNames((current) => ({
                          ...current,
                          [line.menu_item_id]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))
              )}
            </div>

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
                  <span className="font-medium">I pay for everything</span> — friends
                  settle up with me. Simplest.
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
                  <span className="font-medium">Everyone pays their own share</span> —
                  you get a payment link per name to send round. Anyone unpaid by the
                  cut-off is dropped, and the rest still travels.
                </span>
              </label>
            </fieldset>

            {mode === "split" && !splitReady && (
              <p className="text-sm text-brand-dark">
                Tag items with at least two different names to split payment.
              </p>
            )}
        </>
      </section>
      )}

      <section className="card space-y-2">
        <h2 className="font-semibold">Your order</h2>
        {lines.length === 0 ? (
          <p className="text-sm text-ink/60">Nothing in the cart yet.</p>
        ) : (
          <>
            <ul className="space-y-1 text-sm">
              {lines.map((line) => {
                const item = items.get(line.menu_item_id)!;
                return (
                  <li key={line.menu_item_id} className="flex justify-between">
                    <span>
                      {line.qty}× {item.name}
                      {line.for_name && (
                        <span className="text-ink/50"> · for {line.for_name}</span>
                      )}
                    </span>
                    <span>{naira(item.price * line.qty)}</span>
                  </li>
                );
              })}
            </ul>
            <dl className="space-y-1 border-t border-black/10 pt-2 text-sm">
              <Row label="Food" value={naira(subtotal)} />
              <Row
                label={
                  alreadyCharged > 0
                    ? `Delivery top-up (${itemCount + alreadyItems} items in total)`
                    : `Delivery (${itemCount} item${itemCount === 1 ? "" : "s"})`
                }
                value={naira(fee)}
              />
              <Row label="Total" value={naira(total)} strong />
            </dl>
            <FeeSummary
              itemCount={itemCount + alreadyItems}
              flashFee={flashFee}
              alreadyCharged={alreadyCharged}
            />
            {!adding && (
              <p className="text-xs text-ink/50">
                Already ordered for this batch?{" "}
                <Link href="/reorder" className="text-brand underline">
                  Add to your order
                </Link>{" "}
                instead — you only pay the difference in delivery, if any.
              </p>
            )}
            {promoter && (
              <p className="text-sm text-brand-dark">
                {naira(FIRST_ORDER_DISCOUNT)} comes off at checkout if this is your
                first order with us.
              </p>
            )}
          </>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Where it goes</h2>
        <div>
          <label className="label" htmlFor="name">Name</label>
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
            This is how we find your order — no account needed.
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

        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={pending || lines.length === 0 || !batchId || !splitReady}
        >
          {pending ? "Placing…" : `Place order · ${naira(total)}`}
        </button>
        <p className="text-xs text-ink/50">
          Transfer details come on the next screen — or message us there to pay by
          card. Orders travel once paid.
        </p>
      </section>
    </form>
  );
}

function QtyStepper({
  qty,
  disabled,
  onChange,
}: {
  qty: number;
  disabled: boolean;
  onChange: (qty: number) => void;
}) {
  if (qty === 0) {
    return (
      <button type="button" className="btn-quiet shrink-0" disabled={disabled} onClick={() => onChange(1)}>
        Add
      </button>
    );
  }
  return (
    <div className="flex shrink-0 items-center gap-2">
      <button type="button" className="btn-quiet px-3 py-1" onClick={() => onChange(qty - 1)}>
        −
      </button>
      <span className="w-5 text-center font-medium">{qty}</span>
      <button type="button" className="btn-quiet px-3 py-1" onClick={() => onChange(qty + 1)}>
        +
      </button>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "font-semibold" : "text-ink/70"}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
