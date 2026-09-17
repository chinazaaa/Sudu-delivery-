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
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setActive(section.id)}
            className={`chip ${
              current?.id === section.id
                ? "border-ink bg-ink text-white"
                : "border-black/10 bg-white"
            }`}
          >
            {section.label}
            {section.badge && (
              <span
                className={`rounded-full px-1.5 text-xs ${
                  current?.id === section.id ? "bg-white/20" : "bg-black/5"
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
