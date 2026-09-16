"use client";

import { useState } from "react";
import PeopleBar from "./PeopleBar";
import ProductCard from "./ProductCard";
import type { MenuView } from "@/lib/view";

/** Everything one restaurant sells, with its categories. */
export default function Collection({ place }: { place: MenuView }) {
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const items = place.items.filter(
    (item) => categoryId === null || item.categoryId === categoryId
  );

  return (
    <div className="space-y-5">
      <PeopleBar />

      {place.categories.length > 0 && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <button
            type="button"
            onClick={() => setCategoryId(null)}
            className={`chip ${
              categoryId === null ? "border-ink bg-ink text-white" : "border-black/10 bg-white"
            }`}
          >
            All {place.items.length}
          </button>
          {place.categories.map((category) => {
            const count = place.items.filter((i) => i.categoryId === category.id).length;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategoryId(category.id)}
                className={`chip ${
                  categoryId === category.id
                    ? "border-ink bg-ink text-white"
                    : "border-black/10 bg-white"
                }`}
              >
                {category.name} {count}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5">
        {items.map((item) => (
          <ProductCard key={item.id} item={item} restaurant={place.restaurant} />
        ))}
        {items.length === 0 && (
          <p className="col-span-full text-sm text-ink/55">Nothing in this section yet.</p>
        )}
      </div>
    </div>
  );
}
