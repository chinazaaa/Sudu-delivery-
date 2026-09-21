"use client";

import { useState } from "react";

import type { PickerItem, PickerRestaurant } from "@/lib/box-admin";
import type { BoxLine } from "@/lib/boxes";
import { naira } from "@/lib/money";

/**
 * What goes in a box, and what somebody may have instead.
 *
 * Two selects rather than a search box: a restaurant, then one of its
 * dishes. Seven hundred dishes in one list is not a picker, and the shop
 * thinks in restaurants anyway because that is where the car stops.
 *
 * Required choices are shown as soon as a dish is picked, because a pizza
 * with no size is not an order, and a box that cannot be bought is worse
 * than no box.
 *
 * Comes out as JSON in a hidden field, read back on the server through the
 * same reader the shop uses, so nothing this sends can reach the database
 * in a shape the shop would not understand.
 */
export default function BoxLines({
  catalogue,
  start,
}: {
  catalogue: PickerRestaurant[];
  start: BoxLine[];
}) {
  const [lines, setLines] = useState<BoxLine[]>(start);

  const itemOf = (id: string): PickerItem | null => {
    for (const place of catalogue) {
      const found = place.items.find((one) => one.id === id);
      if (found) return found;
    }
    return null;
  };
  const placeOf = (id: string): string =>
    catalogue.find((one) => one.items.some((item) => item.id === id))?.name ?? "";

  const priceOf = (itemId: string, optionIds: string[], qty: number): number => {
    const item = itemOf(itemId);
    if (!item) return 0;
    const extra = item.groups
      .flatMap((group) => group.options)
      .filter((one) => optionIds.includes(one.id))
      .reduce((sum, one) => sum + one.delta, 0);
    return (item.price + extra) * qty;
  };

  const food = lines.reduce(
    (sum, line) => sum + priceOf(line.menu_item_id, line.option_ids, line.qty),
    0
  );

  const change = (id: string, to: Partial<BoxLine>) =>
    setLines((was) => was.map((one) => (one.id === id ? { ...one, ...to } : one)));

  return (
    <div className="space-y-3">
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />

      {lines.map((line) => (
        <div key={line.id} className="rounded-xl border border-black/10 p-3">
          <Pick
            catalogue={catalogue}
            itemId={line.menu_item_id}
            optionIds={line.option_ids}
            onPick={(menu_item_id, option_ids) =>
              change(line.id, { menu_item_id, option_ids })
            }
          />

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              How many
              <input
                inputMode="numeric"
                value={line.qty}
                onChange={(e) =>
                  change(line.id, { qty: Math.max(1, Number(e.target.value) || 1) })
                }
                className="field w-16 py-1.5 text-sm"
              />
            </label>
            <span className="text-sm font-semibold">
              {naira(priceOf(line.menu_item_id, line.option_ids, line.qty))}
            </span>
            <button
              type="button"
              onClick={() => setLines((was) => was.filter((one) => one.id !== line.id))}
              className="ml-auto text-sm font-semibold text-red-700"
            >
              Take out
            </button>
          </div>

          {/* What somebody may have instead. Three at most on purpose: the
              moment a box can be anything it is a menu again. */}
          <details className="mt-2">
            <summary className="cursor-pointer text-sm font-semibold text-brand">
              What they can swap it for ({line.swaps.length})
            </summary>
            <div className="mt-2 space-y-2">
              {line.swaps.map((swap, at) => (
                <div key={at} className="rounded-xl bg-black/[0.03] p-2">
                  <Pick
                    catalogue={catalogue}
                    itemId={swap.menu_item_id}
                    optionIds={swap.option_ids}
                    onPick={(menu_item_id, option_ids) =>
                      change(line.id, {
                        swaps: line.swaps.map((one, index) =>
                          index === at ? { menu_item_id, option_ids } : one
                        ),
                      })
                    }
                  />
                  <div className="mt-1 flex items-center gap-3 text-sm">
                    <span className={difference(line, swap, priceOf) === 0 ? "text-mint" : "text-muted"}>
                      {difference(line, swap, priceOf) === 0
                        ? "Same price"
                        : difference(line, swap, priceOf) > 0
                          ? `Costs ${naira(difference(line, swap, priceOf))} more`
                          : `Costs ${naira(-difference(line, swap, priceOf))} less`}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        change(line.id, {
                          swaps: line.swaps.filter((_, index) => index !== at),
                        })
                      }
                      className="ml-auto font-semibold text-red-700"
                    >
                      Take out
                    </button>
                  </div>
                </div>
              ))}

              {line.swaps.length < 3 && (
                <button
                  type="button"
                  onClick={() =>
                    change(line.id, {
                      swaps: [
                        ...line.swaps,
                        { menu_item_id: line.menu_item_id, option_ids: line.option_ids },
                      ],
                    })
                  }
                  className="btn-quiet px-3 py-1.5 text-sm"
                >
                  Add a swap
                </button>
              )}
              {line.swaps.length >= 3 && (
                <p className="text-xs text-muted">
                  Three is the most. Past that it is a menu, and a menu is the
                  thing a box exists to save somebody from.
                </p>
              )}
            </div>
          </details>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() =>
            setLines((was) => [
              ...was,
              {
                id: `l${Date.now()}`,
                menu_item_id: catalogue[0]?.items[0]?.id ?? "",
                option_ids: [],
                qty: 1,
                swaps: [],
              },
            ])
          }
          className="btn-quiet px-3 py-2 text-sm"
        >
          Add something
        </button>
        <span className="text-sm">
          Food comes to <span className="font-bold">{naira(food)}</span>
        </span>
      </div>
    </div>
  );
}

const difference = (
  line: BoxLine,
  swap: { menu_item_id: string; option_ids: string[] },
  priceOf: (itemId: string, optionIds: string[], qty: number) => number
): number =>
  priceOf(swap.menu_item_id, swap.option_ids, line.qty) -
  priceOf(line.menu_item_id, line.option_ids, line.qty);

/** A restaurant, one of its dishes, and whatever that dish makes you choose. */
function Pick({
  catalogue,
  itemId,
  optionIds,
  onPick,
}: {
  catalogue: PickerRestaurant[];
  itemId: string;
  optionIds: string[];
  onPick: (itemId: string, optionIds: string[]) => void;
}) {
  const place =
    catalogue.find((one) => one.items.some((item) => item.id === itemId)) ??
    catalogue[0];
  const item = place?.items.find((one) => one.id === itemId) ?? null;

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <select
          value={place?.id ?? ""}
          onChange={(e) => {
            const next = catalogue.find((one) => one.id === e.target.value);
            onPick(next?.items[0]?.id ?? "", []);
          }}
          className="field py-2 text-sm"
        >
          {catalogue.map((one) => (
            <option key={one.id} value={one.id}>{one.name}</option>
          ))}
        </select>

        <select
          value={itemId}
          onChange={(e) => onPick(e.target.value, [])}
          className="field py-2 text-sm"
        >
          {(place?.items ?? []).map((one) => (
            <option key={one.id} value={one.id}>
              {one.name} · {naira(one.price)}
            </option>
          ))}
        </select>
      </div>

      {/* A pizza with no size is not an order, so the choices come up with
          the dish rather than being somewhere else to remember. */}
      {(item?.groups ?? []).map((group) => (
        <select
          key={group.id}
          value={group.options.find((one) => optionIds.includes(one.id))?.id ?? ""}
          onChange={(e) =>
            onPick(itemId, [
              ...optionIds.filter(
                (id) => !group.options.some((option) => option.id === id)
              ),
              ...(e.target.value ? [e.target.value] : []),
            ])
          }
          className="field py-2 text-sm"
        >
          <option value="">
            {group.name}
            {group.required ? " (needed)" : " (none)"}
          </option>
          {group.options.map((one) => (
            <option key={one.id} value={one.id}>
              {group.name}: {one.name}
              {one.delta !== 0 && ` (+${naira(one.delta)})`}
            </option>
          ))}
        </select>
      ))}
    </div>
  );
}
