"use client";

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
export default function StartTiles({ tiles, more = [] }: { tiles: Tile[]; more?: Tile[] }) {
  const [building, setBuilding] = useState<Kind | null>(null);
  if (tiles.length === 0) return null;
  return (
    <section className="shell space-y-2 pb-1 pt-3">
      {building !== null && <Builder kind={building} onClose={() => setBuilding(null)} />}
      <h1 className="font-display text-2xl font-black uppercase leading-none">
        What are you having?
      </h1>
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
    </section>
  );
}
