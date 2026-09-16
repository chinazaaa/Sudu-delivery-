"use client";

import Link from "next/link";
import Thumb from "./Thumb";
import { addLine, lineKey, setQty, useCart } from "@/lib/cart";
import { naira } from "@/lib/money";
import type { ItemView } from "@/lib/view";

/**
 * A product tile. Items with choices open their page; plain items add straight
 * to the cart, because making someone open a page to buy a garlic bread is a
 * tax on the common case.
 */
export default function ProductCard({
  item,
  restaurant,
}: {
  item: ItemView;
  restaurant: { id: string; name: string };
}) {
  const cart = useCart();
  const qty = item.groups.length === 0
    ? (cart.find((l) => l.key === lineKey(item.id, []))?.qty ?? 0)
    : 0;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link href={`/p/${item.id}`} className="relative block aspect-[4/3] overflow-hidden">
        <Thumb src={item.imageUrl} name={item.name} rounded="rounded-none" />
        {!item.available && (
          <span className="absolute left-2 top-2 rounded-full bg-ink/85 px-2 py-1 text-xs font-semibold text-white">
            Sold out today
          </span>
        )}
        {item.groups.length > 0 && item.available && (
          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold">
            {item.groups.map((g) => g.name).join(" · ")}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <Link href={`/p/${item.id}`} className="min-w-0">
          <h3 className="truncate font-semibold leading-tight">{item.name}</h3>
          {item.description && (
            <p className="mt-0.5 line-clamp-2 text-sm text-ink/55">{item.description}</p>
          )}
        </Link>

        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="font-bold">
            {item.groups.length > 0 && (
              <span className="text-xs font-medium text-ink/50">from </span>
            )}
            {naira(item.price)}
          </span>

          {item.groups.length > 0 ? (
            <Link href={`/p/${item.id}`} className="btn-quiet px-3 py-1.5 text-sm">
              Choose
            </Link>
          ) : qty === 0 ? (
            <button
              type="button"
              disabled={!item.available}
              onClick={() =>
                addLine({
                  itemId: item.id,
                  optionIds: [],
                  name: item.name,
                  restaurantId: restaurant.id,
                  restaurantName: restaurant.name,
                  imageUrl: item.imageUrl,
                  unitPrice: item.price,
                  choices: [],
                  forName: "",
                })
              }
              className="btn-primary px-3 py-1.5 text-sm"
            >
              Add
            </button>
          ) : (
            <span className="flex items-center gap-1 rounded-full border border-black/10 p-1">
              <button
                type="button"
                onClick={() => setQty(lineKey(item.id, []), qty - 1)}
                className="size-7 rounded-full text-lg leading-none hover:bg-black/5"
                aria-label={`One less ${item.name}`}
              >
                −
              </button>
              <span className="w-5 text-center text-sm font-semibold">{qty}</span>
              <button
                type="button"
                onClick={() => setQty(lineKey(item.id, []), qty + 1)}
                className="size-7 rounded-full text-lg leading-none hover:bg-black/5"
                aria-label={`One more ${item.name}`}
              >
                +
              </button>
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
