"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { addLine, addPerson, setActivePerson, setQty as setCartQty, useCart, usePeople } from "@/lib/cart";
import { useRouter } from "next/navigation";
import { naira } from "@/lib/money";
import type { ItemView } from "@/lib/view";

/** The product page's buy box: variants, quantity, add to cart. */
export default function AddToCart({
  item,
  restaurant,
  /** The cart line being changed, when this page was opened from the cart. */
  editingKey = "",
}: {
  item: ItemView;
  restaurant: { id: string; name: string };
  editingKey?: string;
}) {
  const { people, active } = usePeople();
  const router = useRouter();
  const lines = useCart();
  const editing = editingKey ? (lines.find((line) => line.key === editingKey) ?? null) : null;

  // Opened from the cart, the questions start answered. Coming back to
  // something you already chose and finding every choice blank made changing
  // one of them a rebuild of the whole thing.
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);
  // The cart is read in the browser, so the line arrives a moment after the
  // page does. This fills the boxes in as soon as it is there, once.
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    if (filled || !editing) return;
    const start: Record<string, string[]> = {};
    for (const group of item.groups) {
      const theirs = group.options
        .filter((option) => editing.optionIds.includes(option.id))
        .map((option) => option.id);
      if (theirs.length > 0) start[group.id] = theirs;
    }
    setPicked(start);
    setQty(editing.qty);
    setFilled(true);
  }, [editing, filled, item.groups]);
  const [added, setAdded] = useState(0);
  const [forWho, setForWho] = useState(false);
  const [friend, setFriend] = useState("");

  const chosenIds = Object.values(picked).flat();
  const chosen = item.groups.flatMap((g) => g.options).filter((o) => chosenIds.includes(o.id));
  const unitPrice = item.price + chosen.reduce((sum, o) => sum + o.priceDelta, 0);
  const missing = item.groups.filter((g) => g.required && (picked[g.id] ?? []).length === 0);

  function toggle(groupId: string, optionId: string, maxSelect: number) {
    setAdded(0);
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

  function put() {
    // Changing something replaces it rather than leaving the old one behind,
    // and it stays whoever's it was: a bag is labelled by name.
    if (editing) setCartQty(editing.key, 0);

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
      },
      qty,
      editing ? editing.forName : undefined
    );

    // Changing a line is finished business: back to the cart they came from,
    // rather than a page saying it has been added to a cart they are looking
    // at in another tab of their head.
    if (editing) {
      router.push("/cart");
      return;
    }
    setAdded((count) => count + qty);
  }

  return (
    <div className="space-y-4">
      {item.groups.map((group) => (
        <fieldset key={group.id} className="space-y-2">
          <legend className="flex w-full items-baseline justify-between gap-2 pb-1">
            <span className="font-semibold">{group.name}</span>
            <span className="text-xs text-muted">
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
                    <span className={isPicked ? "text-white/70" : "text-muted"}>
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
          onClick={put}
          className="btn-primary flex-1 py-3"
        >
          {!item.available
            ? "Sold out today"
            : missing.length > 0
              ? `Choose ${missing[0].name.toLowerCase()}`
              : editing
                ? `Save the change · ${naira(unitPrice * qty)}`
                : `Add${active ? ` for ${active}` : ""} · ${naira(unitPrice * qty)}`}
        </button>
      </div>

      {added > 0 && (
        <p className="flex items-center justify-between gap-2 rounded-xl bg-mint/10 px-3 py-2 text-sm font-semibold text-mint">
          <span>
            {added} in your cart{active ? ` for ${active}` : ""}
          </span>
          <Link href="/cart" className="underline">
            View cart
          </Link>
        </p>
      )}

      <div className="space-y-2">
        {people.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted">Adding for</span>
            <button
              type="button"
              onClick={() => setActivePerson("")}
              className={`chip ${active === "" ? "border-ink bg-ink text-white" : "border-black/10 bg-white"}`}
            >
              Me
            </button>
            {people.map((person) => (
              <button
                key={person.name}
                type="button"
                onClick={() => setActivePerson(person.name)}
                className={`chip ${
                  active === person.name
                    ? "border-brand bg-brand text-white"
                    : "border-black/10 bg-paper"
                }`}
              >
                {person.name}
              </button>
            ))}
          </div>
        )}

        {forWho ? (
          <div className="flex gap-2">
            <input
              autoFocus
              className="field"
              placeholder="Friend's name"
              value={friend}
              onChange={(e) => setFriend(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                if (!friend.trim()) return;
                addPerson(friend);
                put();
                setFriend("");
                setForWho(false);
              }}
            />
            <button
              type="button"
              className="btn-quiet shrink-0"
              disabled={!friend.trim() || missing.length > 0}
              onClick={() => {
                addPerson(friend);
                put();
                setFriend("");
                setForWho(false);
              }}
            >
              Add for them
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setForWho(true)}
            className="btn-quiet w-full py-2.5 text-sm"
          >
            {people.length > 0 ? "Add another person" : "Ordering for a friend too? Start a group"}
          </button>
        )}
      </div>
    </div>
  );
}
