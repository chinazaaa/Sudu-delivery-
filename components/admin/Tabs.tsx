"use client";

import { useState } from "react";

/**
 * Sections of one long sheet, one at a time. The run sheet has five different
 * jobs in it and reading all five at once at a counter is hopeless.
 */
export default function Tabs({
  sections,
}: {
  sections: { id: string; label: string; badge?: string; content: React.ReactNode }[];
}) {
  const [active, setActive] = useState(sections[0]?.id);
  const current = sections.find((section) => section.id === active) ?? sections[0];

  return (
    <div>
      {/* Wrapped, not scrolled sideways: a tap that follows a fling is spent
          stopping the fling, so a row somebody has to scroll is a row whose
          buttons sometimes do nothing. */}
      <div className="mb-4 flex flex-wrap gap-2">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setActive(section.id)}
            className={`pill-admin ${
              current?.id === section.id ? "pill-admin-on" : "bg-paper"
            }`}
          >
            {section.label}
            {section.badge && (
              <span
                className={`font-mono text-xs ${
                  current?.id === section.id ? "opacity-70" : "opacity-60"
                }`}
              >
                {section.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-4">{current?.content}</div>
    </div>
  );
}
