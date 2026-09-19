"use client";

import { useState } from "react";

/**
 * The dishes an offer is for, picked out of the whole menu.
 *
 * Free delivery is usually one or two things, out of a hundred and fifty on
 * the menu, so a wall of checkboxes would be the wrong shape: it is a search
 * for something you already have in mind. What is already ticked stays on
 * screen whatever is typed, or saving after a search would quietly drop
 * everything the search hid.
 */
export default function DishPicker({
  menu,
  chosen,
}: {
  menu: { id: string; name: string; restaurant: string }[];
  chosen: string[];
}) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>(chosen);

  const needle = query.trim().toLowerCase();
  const found =
    needle.length < 2
      ? []
      : menu
          .filter(
            (dish) =>
              !picked.includes(dish.id) &&
              (dish.name.toLowerCase().includes(needle) ||
                dish.restaurant.toLowerCase().includes(needle))
          )
          .slice(0, 8);

  const named = (id: string) => menu.find((dish) => dish.id === id);

  return (
    <div className="space-y-2">
      {picked.map((id) => (
        <input key={id} type="hidden" name="menu_item_id" value={id} />
      ))}

      {picked.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {picked.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setPicked((current) => current.filter((one) => one !== id))}
              className="chip border-brand bg-brand-tint font-medium text-brand-dark"
            >
              {named(id)?.name ?? "A dish"}
              <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      )}

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search the menu"
        className="field py-2 text-sm"
      />

      {found.length > 0 && (
        <ul className="divide-y divide-black/5 rounded-xl border border-black/10">
          {found.map((dish) => (
            <li key={dish.id}>
              <button
                type="button"
                onClick={() => {
                  setPicked((current) => [...current, dish.id]);
                  setQuery("");
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-black/[0.03]"
              >
                <span>{dish.name}</span>
                <span className="text-xs text-muted">{dish.restaurant}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
