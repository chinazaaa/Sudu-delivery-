"use client";

import { useState } from "react";

/**
 * Sixty items is a wall. This narrows the list by name or category before the
 * server-rendered rows are shown, without a round trip.
 */
export default function AdminItemFilter({
  categories,
  children,
}: {
  categories: { id: string; name: string }[];
  children: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

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

      <div
        // Rows carry their name and category, so filtering is a CSS matter.
        data-query={query.trim().toLowerCase()}
        data-category={category}
        className="space-y-3 [&>[data-item]]:block"
      >
        {children}
      </div>

      <style>{`
        ${query.trim() ? `[data-item]:not([data-name*="${cssEscape(query.trim().toLowerCase())}"]) { display: none !important; }` : ""}
        ${category ? `[data-item]:not([data-category="${cssEscape(category)}"]) { display: none !important; }` : ""}
      `}</style>
    </div>
  );
}

/** Keep a stray quote from breaking the rule we just built. */
function cssEscape(value: string): string {
  return value.replace(/["\\\]]/g, "");
}
