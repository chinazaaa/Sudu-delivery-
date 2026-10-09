"use client";

import Thumb from "./Thumb";
import { naira } from "@/lib/money";
import { addLine, setQty, useCart } from "@/lib/cart";
import type { ItemView, MenuView } from "@/lib/view";

/**
 * One thing on a menu, as the board draws it: a card with the photo, the
 * name, the price in the display face, and either an Add button or the Ink
 * stepper once it is in the cart.
 *
 * A horizontal card on a phone, where a column of tall tiles is two dishes a
 * screen, and the board's tall card from sm up, where there is room for a
 * grid of them.
 */
export default function ItemRow({
  item,
  inCart,
  onOpen,
  restaurant,
}: {
  item: ItemView;
  inCart: number;
  /** The sheet, for the choices a card cannot ask for. */
  onOpen: () => void;
  /** Whose kitchen it is. Without it there is nothing to put in a cart
   *  line, so every press opens the sheet instead, which is what the
   *  search results on the front page want anyway. */
  restaurant?: MenuView["restaurant"];
}) {
  const cart = useCart();

  // The lines this dish has in the cart. One of them can be stepped from
  // here; several means somebody ordered it two ways, and which of the two
  // a minus button means is not a question a card can answer, so it opens
  // the cart's own list instead.
  const lines = cart.filter((l) => l.itemId === item.id);
  const simple = item.groups.length === 0 && restaurant !== undefined;
  const steppable = simple && lines.length <= 1;

  const add = () => {
    if (!simple || !restaurant) {
      onOpen();
      return;
    }
    addLine({
      itemId: item.id,
      optionIds: [],
      name: item.name,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      imageUrl: item.imageUrl,
      unitPrice: item.price,
      choices: [],
      containerPct: item.containerPct,
    });
  };

  const drop = () => {
    const line = lines[0];
    if (line) setQty(line.key, line.qty - 1);
  };

  return (
    <article
      className={`flex overflow-hidden rounded-2xl border-2 border-ink bg-paper sm:flex-col ${
        item.available ? "" : "opacity-55"
      }`}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={item.name}
        className="relative w-[104px] shrink-0 sm:h-[170px] sm:w-full"
      >
        <Thumb src={item.imageUrl} name={item.name} rounded="rounded-none" />
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-2 py-3 pl-3.5 pr-3 sm:gap-3 sm:px-[18px] sm:pb-[18px] sm:pt-4">
        <button
          type="button"
          onClick={onOpen}
          className="text-left text-base font-bold leading-[1.25] sm:text-lg"
        >
          {item.name}
        </button>

        {!item.available && (
          <span className="ticket text-muted">Sold out today</span>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 sm:gap-3">
          <span className="font-display text-[26px] font-extrabold leading-none sm:text-[30px]">
            {item.groups.length > 0 && (
              <span className="font-sans text-xs font-semibold text-muted">
                from{" "}
              </span>
            )}
            {naira(item.price)}
          </span>

          {inCart > 0 && steppable ? (
            <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-ink p-0.5 text-white">
              <button
                type="button"
                onClick={drop}
                aria-label={`Remove one ${item.name}`}
                className="grid size-10 place-items-center rounded-full"
              >
                <Minus />
              </button>
              <span className="min-w-5 text-center font-mono font-semibold">
                {inCart}
              </span>
              <button
                type="button"
                onClick={add}
                aria-label={`Add one more ${item.name}`}
                className="grid size-10 place-items-center rounded-full bg-brand"
              >
                <Plus />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={add}
              disabled={!item.available}
              aria-label={`Add ${item.name}`}
              className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border-2 border-ink bg-brand px-0 font-bold text-white shadow-press disabled:opacity-40 disabled:shadow-none sm:px-[18px]"
            >
              <span className="grid size-10 place-items-center sm:size-auto">
                <Plus />
              </span>
              <span className="hidden sm:inline">
                {inCart > 0 ? `${inCart} in cart` : "Add"}
              </span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function Plus() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function Minus() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
      <path d="M5 12h14" />
    </svg>
  );
}
