"use client";

import Thumb from "./Thumb";
import { naira } from "@/lib/money";
import type { ItemView } from "@/lib/view";

/**
 * A menu line the way a food app shows one: words first, picture second. It
 * survives a missing photo, which a grid of image tiles does not.
 */
export default function ItemRow({
  item,
  inCart,
  onOpen,
}: {
  item: ItemView;
  inCart: number;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!item.available}
      className="flex w-full items-start gap-4 rounded-2xl bg-paper p-3 text-left shadow-card transition active:scale-[0.99] disabled:opacity-55 sm:p-4"
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="truncate text-base font-bold">{item.name}</span>
          {inCart > 0 && (
            <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-white">
              {inCart} in cart
            </span>
          )}
        </span>

        {item.description && (
          <span className="mt-1 line-clamp-2 block text-sm text-muted">
            {item.description}
          </span>
        )}

        <span className="mt-2 block font-bold">
          {item.groups.length > 0 && (
            <span className="text-xs font-semibold text-muted">from </span>
          )}
          {naira(item.price)}
        </span>

        {!item.available && (
          <span className="mt-1 block text-sm font-semibold text-muted">
            Sold out today
          </span>
        )}
      </span>

      <span className="relative size-24 shrink-0 overflow-hidden rounded-xl sm:size-28">
        <Thumb src={item.imageUrl} name={item.name} rounded="rounded-none" />
        <span className="absolute bottom-1 right-1 grid size-8 place-items-center rounded-full bg-paper text-lg font-bold shadow-card">
          +
        </span>
      </span>
    </button>
  );
}
