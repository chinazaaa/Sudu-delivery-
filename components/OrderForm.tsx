"use client";

import { useActionState, useMemo, useState } from "react";
import Countdown from "./Countdown";
import { submitOrder, type SubmitState } from "@/app/actions";
import { DELIVERY_FEE, FIRST_ORDER_DISCOUNT } from "@/lib/config";
import { naira } from "@/lib/money";
import type { BatchView, MenuView } from "@/lib/view";

export default function OrderForm({
  menu,
  batches,
  promoter,
}: {
  menu: MenuView[];
  batches: BatchView[];
  promoter: { code: string; name: string } | null;
}) {
  const openable = batches.filter((b) => !b.full);
  // Default to the next open batch, so ordering is one tap (brief §9).
  const [batchId, setBatchId] = useState(openable[0]?.id ?? "");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [state, action, pending] = useActionState<SubmitState, FormData>(submitOrder, {
    error: null,
  });

  const items = useMemo(
    () => new Map(menu.flatMap((m) => m.items.map((i) => [i.id, i]))),
    [menu]
  );

  const lines = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([menu_item_id, qty]) => ({ menu_item_id, qty }));

  const subtotal = lines.reduce(
    (total, l) => total + (items.get(l.menu_item_id)?.price ?? 0) * l.qty,
    0
  );
  const total = subtotal + DELIVERY_FEE;

  const selected = batches.find((b) => b.id === batchId) ?? null;
  const nextAfter = selected
    ? batches.find((b) => new Date(b.cutOffISO) > new Date(selected.cutOffISO)) ?? null
    : null;

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
      {promoter && <input type="hidden" name="ref" value={promoter.code} />}

      {promoter && (
        <p className="rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand-dark">
          {promoter.name} sent you — {naira(FIRST_ORDER_DISCOUNT)} off if this is your
          first order.
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
              disabled={batch.full}
              onClick={() => setBatchId(batch.id)}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                batch.id === batchId
                  ? "border-brand bg-brand/10"
                  : "border-black/15 hover:bg-black/5"
              } disabled:opacity-40`}
            >
              <span className="block font-medium">{batch.label}</span>
              <span className="block text-ink/60">
                Closes {batch.cutOffLabel} · {batch.deliveryWindow}
              </span>
              {batch.full && <span className="block text-brand">Full</span>}
            </button>
          ))}
        </div>

        {selected && (
          <Countdown
            current={{ label: selected.label, cutOffISO: selected.cutOffISO }}
            next={nextAfter && { label: nextAfter.label, cutOffISO: nextAfter.cutOffISO }}
          />
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-semibold">Menu</h2>
          <p className="text-sm text-ink/60">
            Mix restaurants in one order — one delivery fee either way.
          </p>
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
                    </span>
                    <span>{naira(item.price * line.qty)}</span>
                  </li>
                );
              })}
            </ul>
            <dl className="space-y-1 border-t border-black/10 pt-2 text-sm">
              <Row label="Food" value={naira(subtotal)} />
              <Row label="Delivery (all in)" value={naira(DELIVERY_FEE)} />
              <Row label="Total" value={naira(total)} strong />
            </dl>
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
          <input id="name" name="name" required className="field" autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="phone">Phone</label>
          <input
            id="phone"
            name="phone"
            required
            inputMode="tel"
            placeholder="0803 123 4567"
            className="field"
            autoComplete="tel"
          />
          <p className="mt-1 text-xs text-ink/50">
            This is how we find your order — no account needed.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="hostel">Hostel / block</label>
          <input id="hostel" name="hostel" required className="field" />
        </div>

        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={pending || lines.length === 0 || !batchId}
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
