"use client";

import { useActionState, useState } from "react";
import { changeMyOrder, type ChangeState } from "@/app/actions";
import { naira } from "@/lib/money";
import { halfShown, pickedPrice, sizeShown } from "@/lib/pricing";
import type { ChangeLineData } from "@/lib/change-data";
import SaveButton from "@/components/SaveButton";

export type ChangeableLine = ChangeLineData;

type View =
  | { at: "kitchens" }
  | { at: "kitchen"; name: string }
  | { at: "line"; id: string }
  | { at: "qty"; id: string }
  | { at: "opts"; id: string };

/**
 * Changing an order rather than placing it again.
 *
 * Somebody wants pepperoni instead of BBQ chicken, a larger size, or one
 * fewer of five things. Ordering again was easier than finding out how to
 * change the first, so people ordered again and the shop cancelled the first
 * by hand. This is the same job made cheaper than the duplicate, in the same
 * order the shop is built: the kitchen, then the thing, then what about it.
 *
 * Nothing here decides anything. What is sent is the quantity of every line
 * and the new choices of the lines that changed; the server checks them
 * against the menu and prices the whole order again.
 */
export default function ChangeOrder({
  orderId,
  lines,
}: {
  orderId: string;
  lines: ChangeableLine[];
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>({ at: "kitchens" });
  const [state, action] = useActionState<ChangeState, FormData>(changeMyOrder, {
    ok: false,
    error: null,
  });

  const [qty, setQty] = useState<Record<string, number>>(() =>
    Object.fromEntries(lines.map((line) => [line.id, line.qty]))
  );
  // Only lines whose choices have been touched are in here.
  const [picked, setPicked] = useState<Record<string, string[]>>({});

  const qtyOf = (line: ChangeableLine) => qty[line.id] ?? line.qty;
  const idsOf = (line: ChangeableLine) => picked[line.id] ?? line.chosenIds;
  const sameSet = (a: string[], b: string[]) =>
    a.length === b.length && a.every((id) => b.includes(id));

  const live = lines.filter((line) => qtyOf(line) > 0);
  const changed =
    lines.some((line) => qtyOf(line) !== line.qty) ||
    lines.some((line) => line.id in picked && !sameSet(picked[line.id], line.chosenIds));

  if (lines.length === 0) return null;

  const kitchens = [...new Set(lines.map((line) => line.restaurant))];
  const find = (id: string) => lines.find((line) => line.id === id);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setView({ at: "kitchens" });
        }}
        className="block w-full rounded-xl bg-shell px-3 py-2.5 text-left text-sm font-semibold text-brand-dark"
      >
        Want something different?{" "}
        <span className="underline decoration-dotted underline-offset-4">
          Change this order
        </span>
      </button>
    );
  }

  const back = (to: View) => (
    <button
      type="button"
      onClick={() => setView(to)}
      className="text-sm font-semibold text-muted underline"
    >
      Back
    </button>
  );

  const saying = (line: ChangeableLine) => {
    const ids = idsOf(line);
    const names = line.groups
      .flatMap((group) => group.options)
      .filter((option) => ids.includes(option.id))
      .map((option) => option.name);
    return names.length > 0 ? names.join(", ") : line.choices;
  };

  const priceOf = (line: ChangeableLine) =>
    line.groups.length > 0 ? pickedPrice(line.base, line.groups, idsOf(line)) : line.unitPrice;

  const body = (() => {
    if (view.at === "kitchens") {
      return (
        <>
          <p className="font-extrabold">Which kitchen is it from?</p>
          <div className="grid gap-2">
            {kitchens.map((name) => {
              const here = live.filter((line) => line.restaurant === name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setView({ at: "kitchen", name })}
                  className="flex items-center justify-between gap-3 rounded-xl border-2 border-ink bg-white px-3.5 py-3 text-left"
                >
                  <span className="font-extrabold">{name}</span>
                  <span className="text-sm text-muted">
                    {here.reduce((count, line) => count + qtyOf(line), 0)} item
                    {here.reduce((count, line) => count + qtyOf(line), 0) === 1 ? "" : "s"}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      );
    }

    if (view.at === "kitchen") {
      const here = live.filter((line) => line.restaurant === view.name);
      return (
        <>
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-extrabold">{view.name}</p>
            {kitchens.length > 1 ? back({ at: "kitchens" }) : null}
          </div>
          <p className="text-sm text-muted">Tap the one you want to change.</p>
          <div className="grid gap-2">
            {here.map((line) => (
              <button
                key={line.id}
                type="button"
                onClick={() => setView({ at: "line", id: line.id })}
                className="rounded-xl border-2 border-ink bg-white px-3.5 py-3 text-left"
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-extrabold [overflow-wrap:anywhere]">
                    {qtyOf(line)}× {line.name}
                  </span>
                  <span className="shrink-0 font-mono text-sm font-bold">
                    {naira(priceOf(line))}
                  </span>
                </span>
                {saying(line) !== "" && (
                  <span className="mt-0.5 block text-xs text-muted [overflow-wrap:anywhere]">
                    {saying(line)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      );
    }

    const line = find(view.id);
    if (!line) return null;
    const kitchenView: View = { at: "kitchen", name: line.restaurant };

    if (view.at === "line") {
      return (
        <>
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-extrabold [overflow-wrap:anywhere]">{line.name}</p>
            {back(kitchenView)}
          </div>
          <p className="text-sm text-muted">What do you want to change?</p>
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => setView({ at: "qty", id: line.id })}
              className="rounded-xl border-2 border-ink bg-white px-3.5 py-3 text-left font-bold"
            >
              How many
              <span className="ml-2 font-normal text-muted">{qtyOf(line)} now</span>
            </button>
            {line.groups.length > 0 && (
              <button
                type="button"
                onClick={() => setView({ at: "opts", id: line.id })}
                className="rounded-xl border-2 border-ink bg-white px-3.5 py-3 text-left font-bold"
              >
                {line.groups.map((group) => group.name.toLowerCase()).slice(0, 3).join(", ")}
                <span className="block text-xs font-normal text-muted [overflow-wrap:anywhere]">
                  {saying(line)}
                </span>
              </button>
            )}
            {/* Only while there is something else on the order: an order
                with nothing on it is a cancellation, and says so. */}
            {live.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setQty((was) => ({ ...was, [line.id]: 0 }));
                  setView(
                    live.some((one) => one.id !== line.id && one.restaurant === line.restaurant)
                      ? kitchenView
                      : { at: "kitchens" }
                  );
                }}
                className="rounded-xl border-2 border-brand/40 bg-white px-3.5 py-3 text-left font-bold text-brand-dark"
              >
                Take it off
              </button>
            )}
          </div>
        </>
      );
    }

    if (view.at === "qty") {
      const count = qtyOf(line);
      return (
        <>
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-extrabold [overflow-wrap:anywhere]">{line.name}</p>
            {back({ at: "line", id: line.id })}
          </div>
          <div className="flex items-center justify-center gap-4 py-2">
            <button
              type="button"
              onClick={() => setQty((was) => ({ ...was, [line.id]: Math.max(1, count - 1) }))}
              aria-label="One fewer"
              className="size-12 rounded-full border-2 border-ink text-xl font-extrabold"
            >
              &minus;
            </button>
            <span className="w-10 text-center font-mono text-2xl font-bold">{count}</span>
            <button
              type="button"
              onClick={() => setQty((was) => ({ ...was, [line.id]: Math.min(20, count + 1) }))}
              aria-label="One more"
              className="size-12 rounded-full border-2 border-ink text-xl font-extrabold"
            >
              +
            </button>
          </div>
        </>
      );
    }

    // Size, flavour, crust: whatever this item asks.
    const ids = idsOf(line);
    const toggle = (groupId: string, optionId: string, max: number) => {
      const group = line.groups.find((one) => one.id === groupId)!;
      const inGroup = group.options.map((option) => option.id);
      setPicked((was) => {
        const current = was[line.id] ?? line.chosenIds;
        const here = current.filter((id) => inGroup.includes(id));
        const others = current.filter((id) => !inGroup.includes(id));
        if (here.includes(optionId)) {
          // A required question cannot be unanswered.
          if (group.required && here.length === 1) return was;
          return { ...was, [line.id]: [...others, ...here.filter((id) => id !== optionId)] };
        }
        if (max <= 1) return { ...was, [line.id]: [...others, optionId] };
        if (here.length >= max) return was;
        return { ...was, [line.id]: [...others, ...here, optionId] };
      });
    };

    return (
      <>
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-extrabold [overflow-wrap:anywhere]">{line.name}</p>
          {back({ at: "line", id: line.id })}
        </div>
        {line.groups.map((group) => (
          <fieldset key={group.id} className="space-y-1.5">
            <legend className="mb-1 text-sm font-bold">{group.name}</legend>
            {group.options.map((option) => {
              const on = ids.includes(option.id);
              const half = halfShown(group, option, line.groups, ids);
              const size = sizeShown(group, option, line.groups, ids, line.base);
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={!option.available}
                  onClick={() => toggle(group.id, option.id, group.maxSelect)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border-2 px-3.5 py-2.5 text-left text-sm font-semibold disabled:opacity-40 ${
                    on ? "border-ink bg-ink text-white" : "border-black/15 bg-white"
                  }`}
                >
                  <span>{option.name}</span>
                  <span className={on ? "text-white/70" : "text-muted"}>
                    {half !== null
                      ? naira(half)
                      : size !== null
                        ? `${size.from ? "from " : ""}${naira(size.price)}`
                        : option.priceDelta !== 0
                          ? `${option.priceDelta > 0 ? "+" : "−"}${naira(Math.abs(option.priceDelta))}`
                          : ""}
                  </span>
                </button>
              );
            })}
          </fieldset>
        ))}
        <p className="text-sm font-bold">Now {naira(priceOf(line))} each</p>
      </>
    );
  })();

  return (
    <form action={action} className="soft space-y-3 bg-shell px-3.5 py-3">
      <input type="hidden" name="order_id" value={orderId} />
      {lines.map((line) => (
        <input key={line.id} type="hidden" name={`qty_${line.id}`} value={qtyOf(line)} />
      ))}
      {lines
        .filter((line) => line.id in picked && !sameSet(picked[line.id], line.chosenIds))
        .map((line) => (
          <input
            key={`o-${line.id}`}
            type="hidden"
            name={`opts_${line.id}`}
            value={picked[line.id].join(",")}
          />
        ))}

      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-extrabold">Change this order</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm font-semibold text-muted underline"
        >
          Close
        </button>
      </div>

      {body}

      {state.error && (
        <p className="soft bg-brand-wash px-3 py-2 text-sm text-brand-dark">{state.error}</p>
      )}
      {state.ok && !changed && (
        <p className="text-sm font-semibold text-ink">Changed. The new total is above.</p>
      )}

      {changed ? (
        <>
          <p className="text-xs text-muted">
            Delivery is worked out again, so the total can move either way. Nothing is
            charged until you pay.
          </p>
          <SaveButton look="btn-primary w-full">Save the change</SaveButton>
        </>
      ) : null}
    </form>
  );
}
