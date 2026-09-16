"use client";

import { useState } from "react";
import { addLine } from "@/lib/cart";
import { naira } from "@/lib/money";
import type { ItemView } from "@/lib/view";

/** The product page's buy box: variants, quantity, add to cart. */
export default function AddToCart({
  item,
  restaurant,
}: {
  item: ItemView;
  restaurant: { id: string; name: string };
}) {
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const chosenIds = Object.values(picked).flat();
  const chosen = item.groups.flatMap((g) => g.options).filter((o) => chosenIds.includes(o.id));
  const unitPrice = item.price + chosen.reduce((sum, o) => sum + o.priceDelta, 0);
  const missing = item.groups.filter((g) => g.required && (picked[g.id] ?? []).length === 0);

  function toggle(groupId: string, optionId: string, maxSelect: number) {
    setAdded(false);
    setPicked((current) => {
      const already = current[groupId] ?? [];
      if (maxSelect === 1) return { ...current, [groupId]: [optionId] };
      return {
        ...current,
        [groupId]: already.includes(optionId)
          ? already.filter((id) => id !== optionId)
          : already.length < maxSelect
            ? [...already, optionId]
            : already,
      };
    });
  }

  return (
    <div className="space-y-4">
      {item.groups.map((group) => (
        <fieldset key={group.id} className="space-y-2">
          <legend className="flex w-full items-baseline justify-between gap-2 pb-1">
            <span className="font-semibold">{group.name}</span>
            <span className="text-xs text-ink/50">
              {group.required ? "Required" : "Optional"}
              {group.maxSelect > 1 && ` · up to ${group.maxSelect}`}
            </span>
          </legend>

          <div className="flex flex-wrap gap-2">
            {group.options.map((option) => {
              const isPicked = (picked[group.id] ?? []).includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={!option.available}
                  onClick={() => toggle(group.id, option.id, group.maxSelect)}
                  className={`chip ${
                    isPicked
                      ? "border-ink bg-ink text-white"
                      : "border-black/15 bg-white hover:border-ink/40"
                  } disabled:opacity-40`}
                >
                  {option.name}
                  {option.priceDelta !== 0 && (
                    <span className={isPicked ? "text-white/70" : "text-ink/50"}>
                      {option.priceDelta > 0 ? "+" : "−"}
                      {naira(Math.abs(option.priceDelta))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 rounded-full border border-black/10 p-1">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="size-9 rounded-full text-lg leading-none hover:bg-black/5"
            aria-label="One less"
          >
            −
          </button>
          <span className="w-7 text-center font-semibold">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => q + 1)}
            className="size-9 rounded-full text-lg leading-none hover:bg-black/5"
            aria-label="One more"
          >
            +
          </button>
        </div>

        <button
          type="button"
          disabled={!item.available || missing.length > 0}
          onClick={() => {
            addLine(
              {
                itemId: item.id,
                optionIds: chosenIds,
                name: item.name,
                restaurantId: restaurant.id,
                restaurantName: restaurant.name,
                imageUrl: item.imageUrl,
                unitPrice,
                choices: chosen.map((o) => o.name),
                forName: "",
              },
              qty
            );
            setAdded(true);
          }}
          className="btn-primary flex-1 py-3"
        >
          {!item.available
            ? "Sold out today"
            : missing.length > 0
              ? `Choose ${missing[0].name.toLowerCase()}`
              : added
                ? "Added. Add more?"
                : `Add to cart · ${naira(unitPrice * qty)}`}
        </button>
      </div>
    </div>
  );
}
