"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  changeMyOrder,
  previewMyOrderChange,
  type ChangePreview,
  type ChangeState,
} from "@/app/actions";
import { naira } from "@/lib/money";
import { halfShown, pickedPrice, sizeShown } from "@/lib/pricing";
import type { ChangeLineData, SwapTarget } from "@/lib/change-data";

export type ChangeableLine = ChangeLineData;

type View =
  | { at: "kitchens" }
  | { at: "kitchen"; name: string }
  | { at: "line"; id: string }
  | { at: "qty"; id: string }
  | { at: "opts"; id: string }
  | { at: "swap"; id: string };

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
  backHref,
  total,
  lines,
}: {
  orderId: string;
  /** Where the order page is, to go back to once it is saved. */
  backHref: string;
  /** What the order comes to now, to show beside what it would come to. */
  total: number;
  lines: ChangeableLine[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ChangeState, FormData>(changeMyOrder, {
    ok: false,
    error: null,
  });
  const [view, setView] = useState<View>(() => {
    const names = [...new Set(lines.map((line) => line.restaurant))];
    if (names.length > 1) return { at: "kitchens" };
    if (lines.length === 1) return { at: "line", id: lines[0].id };
    return { at: "kitchen", name: names[0] };
  });

  // The sum shown before they say yes: what it is now and what it will be.
  const [asking, setAsking] = useState<ChangePreview | "loading" | null>(null);

  // Saved: back to the order, which now shows the new total.
  useEffect(() => {
    if (state.ok) router.push(backHref);
  }, [state, router, backHref]);

  const [qty, setQty] = useState<Record<string, number>>(() =>
    Object.fromEntries(lines.map((line) => [line.id, line.qty]))
  );
  // Only lines whose choices have been touched are in here.
  const [picked, setPicked] = useState<Record<string, string[]>>({});

  // Lines swapped for something else of the same kind, by line id.
  const [swapped, setSwapped] = useState<Record<string, SwapTarget>>({});

  const qtyOf = (line: ChangeableLine) => qty[line.id] ?? line.qty;
  const idsOf = (line: ChangeableLine) => picked[line.id] ?? line.chosenIds;
  // The line as it will be: a swapped one takes the new item's name, price
  // and questions, so everything below reads it the same way.
  const eff = (line: ChangeableLine): ChangeableLine => {
    const to = swapped[line.id];
    return to ? { ...line, name: to.name, base: to.base, groups: to.groups } : line;
  };

  // What goes to the server: every quantity, the choices of lines that
  // changed, and which lines were swapped for what.
  const payload = () => {
    const picks: Record<string, string[]> = {};
    const swaps: Record<string, string> = {};
    for (const line of lines) {
      if (swapped[line.id]) {
        swaps[line.id] = swapped[line.id].id;
        picks[line.id] = picked[line.id] ?? [];
      } else if (line.id in picked && !sameSet(picked[line.id], line.chosenIds)) {
        picks[line.id] = picked[line.id];
      }
    }
    return {
      qtys: Object.fromEntries(lines.map((line) => [line.id, qtyOf(line)])),
      picks,
      swaps,
    };
  };
  const sameSet = (a: string[], b: string[]) =>
    a.length === b.length && a.every((id) => b.includes(id));

  const ask = async () => {
    setAsking("loading");
    const { qtys, picks, swaps } = payload();
    try {
      setAsking(await previewMyOrderChange(orderId, qtys, picks, swaps));
    } catch {
      setAsking({ ok: false, error: "Could not work that out. Try again." });
    }
  };

  const live = lines.filter((line) => qtyOf(line) > 0);
  const changed =
    lines.some((line) => qtyOf(line) !== line.qty) ||
    lines.some((line) => line.id in swapped) ||
    lines.some((line) => line.id in picked && !sameSet(picked[line.id], line.chosenIds));

  // What it would come to, worked out on the server as they go, so the
  // number beside the save button is the one they will actually be charged.
  const [shown, setShown] = useState<ChangePreview | "loading" | null>(null);
  const token = useRef(0);
  const stagedKey = JSON.stringify([qty, picked, Object.fromEntries(Object.entries(swapped).map(([k, v]) => [k, v.id]))]);
  useEffect(() => {
    token.current += 1;
    const mine = token.current;
    if (!changed) {
      setShown(null);
      return;
    }
    setShown("loading");
    const timer = setTimeout(async () => {
      const { qtys, picks, swaps } = payload();
      try {
        const answer = await previewMyOrderChange(orderId, qtys, picks, swaps);
        if (token.current === mine) setShown(answer);
      } catch {
        if (token.current === mine) setShown(null);
      }
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stagedKey]);

  if (lines.length === 0) return null;

  const kitchens = [...new Set(lines.map((line) => line.restaurant))];
  const find = (id: string) => {
    const base = lines.find((line) => line.id === id);
    return base ? eff(base) : undefined;
  };
  const onlyOne = kitchens.length === 1 && lines.length === 1;

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
      const here = live.map(eff).filter((line) => line.restaurant === view.name);
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
            {onlyOne ? null : back(kitchenView)}
          </div>
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => setView({ at: "qty", id: line.id })}
              className="rounded-xl border-2 border-ink bg-white px-3.5 py-2.5 text-left font-bold"
            >
              How many
              <span className="ml-2 font-normal text-muted">{qtyOf(line)} now</span>
            </button>
            {line.groups.length > 0 && (
              <button
                type="button"
                onClick={() => setView({ at: "opts", id: line.id })}
                className="rounded-xl border-2 border-ink bg-white px-3.5 py-2.5 text-left font-bold"
              >
                {line.groups.map((group) => group.name.toLowerCase()).slice(0, 3).join(", ")}
                <span className="block text-xs font-normal text-muted [overflow-wrap:anywhere]">
                  {saying(line)}
                </span>
              </button>
            )}
            {line.swaps.length > 0 && (
              <button
                type="button"
                onClick={() => setView({ at: "swap", id: line.id })}
                className="rounded-xl border-2 border-ink bg-white px-3.5 py-2.5 text-left font-bold"
              >
                Swap it for something else
                <span className="block text-xs font-normal text-muted">
                  Like a whole pizza instead of half and half
                </span>
              </button>
            )}
            {swapped[line.id] && (
              <button
                type="button"
                onClick={() => {
                  setSwapped((was) => {
                    const next = { ...was };
                    delete next[line.id];
                    return next;
                  });
                  setPicked((was) => {
                    const next = { ...was };
                    delete next[line.id];
                    return next;
                  });
                }}
                className="rounded-xl border-2 border-black/15 bg-white px-3.5 py-3 text-left text-sm font-bold text-muted"
              >
                Undo the swap
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
                      : kitchens.length > 1
                        ? { at: "kitchens" }
                        : kitchenView
                  );
                }}
                className="rounded-xl border-2 border-brand/40 bg-white px-3.5 py-2.5 text-left font-bold text-brand-dark"
              >
                Take it off
              </button>
            )}
          </div>
        </>
      );
    }

    if (view.at === "swap") {
      // Carry over what still makes sense: the same size and crust where
      // the new thing has them, and the first available answer where it
      // asks something the old one did not.
      const wasIds = idsOf(line);
      const wasNames = line.groups
        .flatMap((group) => group.options)
        .filter((option) => wasIds.includes(option.id))
        .map((option) => option.name.trim().toLowerCase());
      const carry = (target: SwapTarget): string[] =>
        target.groups.flatMap((group) => {
          if (group.dearest) return [];
          const match = group.options.find(
            (option) => option.available && wasNames.includes(option.name.trim().toLowerCase())
          );
          if (match) return [match.id];
          const first = group.options.find((option) => option.available);
          return group.required && first ? [first.id] : [];
        });
      const original = lines.find((one) => one.id === line.id)!;
      return (
        <>
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-extrabold [overflow-wrap:anywhere]">Swap {line.name} for</p>
            {back({ at: "line", id: line.id })}
          </div>
          <div className="grid gap-2">
            {original.swaps.map((target) => {
              const ids = carry(target);
              return (
                <button
                  key={target.id}
                  type="button"
                  onClick={() => {
                    setSwapped((was) => ({ ...was, [line.id]: target }));
                    setPicked((was) => ({ ...was, [line.id]: ids }));
                    setView({ at: "opts", id: line.id });
                  }}
                  className="flex items-baseline justify-between gap-3 rounded-xl border-2 border-ink bg-white px-3.5 py-3 text-left"
                >
                  <span className="font-extrabold [overflow-wrap:anywhere]">{target.name}</span>
                  <span className="shrink-0 font-mono text-sm font-bold">
                    {naira(pickedPrice(target.base, target.groups, ids))}
                  </span>
                </button>
              );
            })}
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
    <form action={action} className="space-y-3 pb-24">
      <input type="hidden" name="order_id" value={orderId} />
      {lines.map((line) => (
        <input key={line.id} type="hidden" name={`qty_${line.id}`} value={qtyOf(line)} />
      ))}
      {Object.entries(payload().picks).map(([lineId, ids]) => (
        <input key={`o-${lineId}`} type="hidden" name={`opts_${lineId}`} value={ids.join(",")} />
      ))}
      {Object.entries(payload().swaps).map(([lineId, itemId]) => (
        <input key={`s-${lineId}`} type="hidden" name={`swap_${lineId}`} value={itemId} />
      ))}

      <div className="card space-y-3 p-4">{body}</div>

      {state.error && (
        <p className="soft bg-brand-wash px-3 py-2 text-sm text-brand-dark">{state.error}</p>
      )}

      {/* Always there, so nobody has to hunt for how to save. Dim until
          something has changed. */}
      <div className="sticky bottom-24 z-10 space-y-1.5 rounded-2xl border-2 border-ink bg-paper px-3 py-2.5 shadow-card">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-semibold text-muted">
            {changed ? "Was" : "Total"}{" "}
            <span className={changed ? "line-through" : "font-bold text-ink"}>
              {naira(total)}
            </span>
          </span>
          {changed && (
            <span className="text-right">
              <span className="text-sm font-semibold text-muted">Now </span>
              <span className="font-display text-2xl font-black">
                {shown === null || shown === "loading"
                  ? "…"
                  : shown.ok
                    ? naira(shown.to)
                    : "—"}
              </span>
            </span>
          )}
        </div>
        {changed && shown !== null && shown !== "loading" && !shown.ok && (
          <p className="text-xs font-semibold text-brand-dark">{shown.error}</p>
        )}
        <button
          type="button"
          onClick={ask}
          disabled={!changed || pending}
          className="btn-primary w-full disabled:opacity-40"
        >
          {pending ? "Saving…" : changed ? "Save the change" : "Make a change to save"}
        </button>
      </div>

      {asking !== null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-paper p-5 shadow-card">
            {asking === "loading" ? (
              <p className="font-bold">Working out the new total…</p>
            ) : asking.ok ? (
              <>
                <h2 className="text-lg font-extrabold">Save this change?</h2>
                <p className="text-base">
                  Your total goes from{" "}
                  <span className="font-bold">{naira(asking.from)}</span> to{" "}
                  <span className="font-bold">{naira(asking.to)}</span>.
                </p>
                <div className="grid gap-2">
                  <button
                    type="submit"
                    onClick={() => setAsking(null)}
                    className="btn-primary w-full"
                  >
                    Yes, save it
                  </button>
                  <button
                    type="button"
                    onClick={() => setAsking(null)}
                    className="btn-quiet w-full justify-center"
                  >
                    Not yet
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="font-bold">{asking.error}</p>
                <button
                  type="button"
                  onClick={() => setAsking(null)}
                  className="btn-quiet w-full justify-center"
                >
                  Back
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
