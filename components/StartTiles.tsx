"use client";

import Link from "next/link";
import { useState } from "react";
import Builder from "./Builder";
import Thumb from "./Thumb";
import { naira } from "@/lib/money";

type Kind = { label: string; tile?: string; aisle?: string };
type Tile = { aisle: string; from: number; image: string };

/**
 * The same photo tiles the front page opens on, for the menu page: tap one
 * and the step-by-step picker opens, instead of a wall of words and filters.
 */
export default function StartTiles({
  tiles,
  more = [],
  kitchens = [],
  view = "food",
}: {
  tiles: Tile[];
  more?: Tile[];
  kitchens?: { id: string; slug: string; name: string; from: number; image: string }[];
  view?: "food" | "kitchens";
}) {
  const [building, setBuilding] = useState<Kind | null>(null);
  return (
    <section className="shell space-y-2 pb-1 pt-3">
      {building !== null && <Builder kind={building} onClose={() => setBuilding(null)} />}
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-black uppercase leading-none">
          {view === "kitchens" ? "Restaurants" : "What are you having?"}
        </h1>
        <div className="flex shrink-0 rounded-full border-2 border-ink bg-white p-0.5 text-sm font-bold">
          <Link
            href="/products"
            className={`rounded-full px-3 py-1 ${view === "food" ? "bg-ink text-shell" : ""}`}
          >
            Food
          </Link>
          <Link
            href="/products?view=kitchens"
            className={`rounded-full px-3 py-1 ${view === "kitchens" ? "bg-ink text-shell" : ""}`}
          >
            Restaurants
          </Link>
        </div>
      </div>
      {view === "kitchens" ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {kitchens.map((one) => (
            <li key={one.id}>
              <Link
                href={`/r/${one.slug}`}
                className="flex h-full w-full flex-col justify-between gap-1 rounded-2xl border-2 border-ink bg-white p-2 text-left shadow-[2px_2px_0_0_#111]"
              >
                <span className="block aspect-[16/9] w-full overflow-hidden rounded-lg">
                  <Thumb src={one.image} name={one.name} category={one.name} variant="tile" />
                </span>
                <span className="text-[15px] font-extrabold leading-tight">{one.name}</span>
                <span className="text-[13px] font-bold text-brand">
                  {one.from > 0 ? <>from {naira(one.from)} </> : null}
                  <span aria-hidden>→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ...tiles.map((one) => ({ ...one, kind: { label: one.aisle, tile: one.aisle } as Kind })),
          ...more.map((one) => ({ ...one, kind: { label: one.aisle, aisle: one.aisle } as Kind })),
        ].map((one) => (
          <li key={one.aisle}>
            <button
              type="button"
              onClick={() => setBuilding(one.kind)}
              className="flex h-full w-full flex-col justify-between gap-1 rounded-2xl border-2 border-ink bg-white p-2 text-left shadow-[2px_2px_0_0_#111]"
            >
              <span className="block aspect-[16/9] w-full overflow-hidden rounded-lg">
                <Thumb src={one.image} name={one.aisle} category={one.aisle} variant="tile" />
              </span>
              <span className="text-[15px] font-extrabold leading-tight">{one.aisle}</span>
              <span className="text-[13px] font-bold text-brand">
                from {naira(one.from)} <span aria-hidden>→</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      )}
    </section>
  );
}
