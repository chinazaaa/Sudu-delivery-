"use client";

import { useState } from "react";

type Counts = { total: number; soldOut: number; noPhoto: number };
type Flag = "" | "sold-out" | "no-photo";

/**
 * Sixty items is a wall. This narrows the list by name, category, or the two
 * things you actually go looking for: what is switched off, and what has no
 * photograph yet. All of it without a round trip.
 */
export default function AdminItemFilter({
  categories,
  counts,
  children,
}: {
  categories: { id: string; name: string }[];
  counts: Counts;
  children: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [flag, setFlag] = useState<Flag>("");

  const tabs: { key: Flag; label: string; count: number }[] = [
    { key: "", label: "Everything", count: counts.total },
    { key: "sold-out", label: "Sold out", count: counts.soldOut },
    { key: "no-photo", label: "No photo", count: counts.noPhoto },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find an item"
          className="field grow"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="field w-44"
          aria-label="Filter by category"
        >
          <option value="">Every category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFlag(tab.key)}
            aria-pressed={flag === tab.key}
            className={`chip shrink-0 ${
              flag === tab.key
                ? "border-ink bg-ink text-white"
                : "border-black/10 bg-white hover:border-ink/30"
            }`}
          >
            {tab.label}
            <span
              className={`ml-1.5 font-bold ${
                flag === tab.key ? "text-white/70" : "text-muted"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {flag === "sold-out" && counts.soldOut === 0 && (
        <p className="card text-sm text-muted">
          Nothing is switched off. Every item is on the menu.
        </p>
      )}
      {flag === "no-photo" && counts.noPhoto === 0 && (
        <p className="card text-sm text-muted">Every item has a photograph.</p>
      )}

      <div
        // Rows carry their name, category and state, so filtering is a CSS
        // matter rather than a re-render.
        data-query={query.trim().toLowerCase()}
        data-category={category}
        className="space-y-3 [&>[data-item]]:block"
      >
        {children}
      </div>

      <style>{`
        ${query.trim() ? `[data-item]:not([data-name*="${cssEscape(query.trim().toLowerCase())}"]) { display: none !important; }` : ""}
        ${category ? `[data-item]:not([data-category="${cssEscape(category)}"]) { display: none !important; }` : ""}
        ${flag === "sold-out" ? `[data-item]:not([data-stock="off"]) { display: none !important; }` : ""}
        ${flag === "no-photo" ? `[data-item]:not([data-photo="no"]) { display: none !important; }` : ""}
      `}</style>
    </div>
  );
}

/** Keep a stray quote from breaking the rule we just built. */
function cssEscape(value: string): string {
  return value.replace(/["\\\]]/g, "");
}
