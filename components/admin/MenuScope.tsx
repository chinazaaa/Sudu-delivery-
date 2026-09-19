"use client";

import { useState } from "react";

export type ScopeShop = {
  id: string;
  name: string;
  categories: { id: string; name: string; items: number }[];
  /** Every choice offered anywhere in this menu, by category. */
  choices: { name: string; categories: string[] }[];
};

/**
 * What an offer covers, narrowed one step at a time.
 *
 * Restaurant, then the sections of its menu, then the choice those dishes
 * actually offer. Picking in that order is how somebody thinks about it, and
 * it means the sizes on screen are that kitchen's own words: Domino's says
 * Large where Panarottis says Standard, and neither of them has to be
 * remembered or spelt.
 */
export default function MenuScope({
  shops,
  restaurant,
  categories,
  choice,
}: {
  shops: ScopeShop[];
  /** What is already saved, when an offer is being changed. */
  restaurant: string;
  categories: string[];
  choice: string;
}) {
  const [shopId, setShopId] = useState(restaurant);
  const [sections, setSections] = useState<string[]>(categories);
  const [chosen, setChosen] = useState<string[]>(
    choice.split(",").map((one) => one.trim()).filter(Boolean)
  );

  const shop = shops.find((one) => one.id === shopId) ?? null;

  // Only the choices the picked sections actually offer. With no section
  // picked it is the whole menu's, because the offer is then the whole menu.
  const offered = (shop?.choices ?? []).filter(
    (one) =>
      sections.length === 0 || one.categories.some((id) => sections.includes(id))
  );

  const toggle = (
    value: string,
    list: string[],
    set: (next: string[]) => void
  ) =>
    set(list.includes(value) ? list.filter((one) => one !== value) : [...list, value]);

  return (
    <div className="space-y-3">
      {shopId !== "" && <input type="hidden" name="restaurant_id" value={shopId} />}
      {sections.map((id) => (
        <input key={id} type="hidden" name="category_id" value={id} />
      ))}
      {chosen.map((name) => (
        <input key={name} type="hidden" name="required_choice" value={name} />
      ))}

      <div>
        <p className="label mb-0">Which restaurant</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setShopId("");
              setSections([]);
              setChosen([]);
            }}
            className={`chip ${
              shopId === "" ? "border-ink bg-ink text-white" : "border-black/10 bg-white"
            }`}
          >
            Any
          </button>
          {shops.map((one) => (
            <button
              key={one.id}
              type="button"
              onClick={() => {
                setShopId(one.id);
                setSections([]);
                setChosen([]);
              }}
              className={`chip ${
                shopId === one.id ? "border-ink bg-ink text-white" : "border-black/10 bg-white"
              }`}
            >
              {one.name}
            </button>
          ))}
        </div>
      </div>

      {shop && shop.categories.length > 0 && (
        <div>
          <p className="label mb-0">Which part of the menu</p>
          <div className="flex flex-wrap gap-2">
            {shop.categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => toggle(category.id, sections, setSections)}
                className={`chip ${
                  sections.includes(category.id)
                    ? "border-brand bg-brand text-white"
                    : "border-black/10 bg-white"
                }`}
              >
                {category.name}
                <span
                  className={sections.includes(category.id) ? "text-white/70" : "text-muted"}
                >
                  {category.items}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">
            None picked means the whole of {shop.name}. A dish added to a
            section later is in the offer without anybody adding it.
          </p>
        </div>
      )}

      {shop && offered.length > 0 && (
        <div>
          <p className="label mb-0">And only this choice</p>
          <div className="flex flex-wrap gap-2">
            {offered.map((one) => (
              <button
                key={one.name}
                type="button"
                onClick={() => toggle(one.name, chosen, setChosen)}
                className={`chip ${
                  chosen.includes(one.name)
                    ? "border-brand bg-brand text-white"
                    : "border-black/10 bg-white"
                }`}
              >
                {one.name}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">
            These are {shop.name}&apos;s own words for it. None picked means any
            size, which is usually what you want unless the offer is about one.
          </p>
        </div>
      )}
    </div>
  );
}
