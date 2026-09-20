"use client";

import { useState } from "react";
import { choiceValues } from "@/lib/offers";

export type ScopeShop = {
  id: string;
  name: string;
  categories: { id: string; name: string; items: number }[];
  /** Every choice offered anywhere in this menu, kept under the question the
   *  dish asks: Size, Crust, Flavour. */
  choices: { group: string; name: string; categories: string[]; items: number }[];
  /** How many dishes ask each question, so a question only one dish asks is
   *  visibly that rather than a surprise. */
  asks: { group: string; items: number }[];
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
  restaurants,
  categories,
  choice,
  sizes = true,
}: {
  shops: ScopeShop[];
  /** What is already saved, when an offer is being changed. Several, because
   *  an offer can be for two kitchens at once: everything from Domino's or
   *  Chicken Republic, and nothing else in the car. */
  restaurants: string[];
  categories: string[];
  choice: string;
  /** Whether a size can be asked for. A typed code is a deal with a kitchen,
   *  and nobody types a code to get a discount on the medium one. */
  sizes?: boolean;
}) {
  const [shopIds, setShopIds] = useState<string[]>(restaurants);
  // The sections of a menu and the words a kitchen uses for a size are that
  // kitchen's own: Domino's says Large where Panarottis says Standard. So
  // those two pickers only appear once it is down to one restaurant, and an
  // offer across several is the whole of each.
  const shopId = shopIds.length === 1 ? shopIds[0] : "";
  const [sections, setSections] = useState<string[]>(categories);
  // Read back as the picker wrote them, question and all, or a refresh would
  // find nothing it recognised and quietly clear every tick.
  const [chosen, setChosen] = useState<string[]>(choiceValues(choice));

  const shop = shops.find((one) => one.id === shopId) ?? null;

  // Only the choices the picked sections actually offer, under the question
  // they answer. With no section picked it is the whole menu's, because the
  // offer is then the whole menu.
  const offered = (shop?.choices ?? []).filter(
    (one) =>
      sections.length === 0 || one.categories.some((id) => sections.includes(id))
  );
  // How many dishes are in scope, so a question can be told from a quirk.
  const covered =
    shop === null
      ? 0
      : sections.length === 0
        ? shop.categories.reduce((sum, one) => sum + one.items, 0)
        : shop.categories
            .filter((one) => sections.includes(one.id))
            .reduce((sum, one) => sum + one.items, 0);

  const questions = [...new Set(offered.map((one) => one.group))].map((group) => ({
    group,
    options: offered.filter((one) => one.group === group),
    items: shop?.asks.find((one) => one.group === group)?.items ?? 0,
  }));

  // A question most of the menu asks is a way to narrow the offer. A question
  // one dish asks is that dish: Domino's Half and Half wants a flavour for
  // each side, and picking one would quietly shrink an offer about size down
  // to that one pizza. Still reachable, because somebody may want exactly
  // that, but not in the way of the question they came for.
  //
  // Most rather than all, because one exception is normal: the sixteen inch
  // comes thin crust only, and that should not hide crust from the list.
  //
  // The rest are not offered at all. Domino's Half and Half asks for a
  // flavour on each side, and those two rows of fourteen flavours each were
  // most of what was on screen while being about one pizza nobody is running
  // a deal on.
  const common = (asked: number) => covered === 0 || asked * 2 >= covered;
  const plain = questions.filter((one) => common(one.items));

  const toggle = (
    value: string,
    list: string[],
    set: (next: string[]) => void
  ) =>
    set(list.includes(value) ? list.filter((one) => one !== value) : [...list, value]);

  return (
    <div className="space-y-3">
      {shopIds.map((id) => (
        <input key={id} type="hidden" name="restaurant_id" value={id} />
      ))}
      {sections.map((id) => (
        <input key={id} type="hidden" name="category_id" value={id} />
      ))}
      {chosen.map((value) => (
        <input key={value} type="hidden" name="required_choice" value={value} />
      ))}

      <div>
        <p className="label mb-0">Which restaurant</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setShopIds([]);
              setSections([]);
              setChosen([]);
            }}
            className={`chip ${
              shopIds.length === 0
                ? "border-ink bg-ink text-white"
                : "border-black/10 bg-white"
            }`}
          >
            Any
          </button>
          {shops.map((one) => (
            <button
              key={one.id}
              type="button"
              onClick={() => {
                // Tapped again it comes off, so two kitchens is two taps and
                // changing your mind is one. Anything picked under a menu
                // belongs to the shop it came from, so it goes.
                setShopIds(
                  shopIds.includes(one.id)
                    ? shopIds.filter((id) => id !== one.id)
                    : [...shopIds, one.id]
                );
                setSections([]);
                setChosen([]);
              }}
              className={`chip ${
                shopIds.includes(one.id)
                  ? "border-ink bg-ink text-white"
                  : "border-black/10 bg-white"
              }`}
            >
              {one.name}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted">
          {shopIds.length === 0
            ? "Any means the offer is on whatever they order."
            : shopIds.length === 1
              ? "The cart has to be from here and nowhere else."
              : "The cart has to be from these, and nothing outside them. Pick one on its own to narrow it to a section or a size."}
        </p>
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

      {sizes && shop && plain.length > 0 && (
        <div className="space-y-2">
          <p className="label mb-0">And only this choice</p>
          {/* One row per question a dish asks, because Medium and BBQ Chicken
              are two answers and not two items on one list. Ticking both means
              a medium, and that flavour. */}
          {plain.map((question) => (
            <div key={question.group}>
              <p className="text-xs font-bold uppercase tracking-wide text-muted">
                {question.group}
                {question.items > 0 && (
                  <span className="ml-1 font-semibold normal-case tracking-normal">
                    · {question.items} dish{question.items === 1 ? "" : "es"} ask this
                  </span>
                )}
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                {question.options.map((one) => {
                  const value = `${question.group}::${one.name}`;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggle(value, chosen, setChosen)}
                      className={`chip ${
                        chosen.includes(value)
                          ? "border-brand bg-brand text-white"
                          : "border-black/10 bg-white"
                      }`}
                    >
                      {one.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <p className="text-xs text-muted">
            These are {shop.name}&apos;s own words, one row per question most
            of these dishes ask. Nothing picked means any answer, which is
            usually what you want. Two in one row means either will do; from
            two rows means both must be true.
          </p>
        </div>
      )}
    </div>
  );
}
