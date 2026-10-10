"use client";

import { useState } from "react";

/**
 * The run sheet, in the two shapes its boards draw.
 *
 * On a phone it is tabs. The sheet is five different jobs and the screen is
 * three hundred and ninety pixels wide, so reading all five at once at a
 * counter is hopeless, and the mobile boards give the counter sheet and the
 * handout screens of their own.
 *
 * On a desk the board has no tabs at all: it is two columns, the stops in
 * the wide one and the handout, the costs and the rest in the rail beside
 * them. A desk has the width to show the whole run at once, and hiding four
 * fifths of it behind pills is what made a finished run look like four
 * separate pages.
 *
 * Every section is rendered at both widths. On a phone all but the open one
 * are display:none, which is what a tab is; from the rail up they are all
 * on screen. Nothing is built twice, so no control exists twice.
 */
export default function SheetShape({
  sections,
}: {
  sections: {
    id: string;
    label: string;
    badge?: string;
    /** Which column it sits in from `lg`. "main" is the wide one. */
    column?: "main" | "rail";
    content: React.ReactNode;
  }[];
}) {
  const [active, setActive] = useState(sections[0]?.id);
  const current = sections.some((section) => section.id === active)
    ? active
    : sections[0]?.id;

  const inColumn = (which: "main" | "rail") =>
    sections.filter((section) => (section.column ?? "main") === which);

  const body = (list: typeof sections) =>
    list.map((section) => (
      <div
        key={section.id}
        className={`space-y-4 ${section.id === current ? "" : "hidden"} lg:block`}
      >
        {section.content}
      </div>
    ));

  return (
    <div>
      {/* Wrapped, not scrolled sideways: a tap that follows a fling is spent
          stopping the fling, so a row somebody has to scroll is a row whose
          buttons sometimes do nothing. Gone from the rail up, where the
          sections are all on screen and a pill would select what is already
          in front of you. */}
      <div className="mb-4 flex flex-wrap gap-2 lg:hidden">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setActive(section.id)}
            aria-pressed={current === section.id}
            /* `pill-admin` is already forty-four pixels on a phone and
               thirty-eight from `sm`, so the height was being set twice and
               the second copy is what drifts. */
            className={`pill-admin ${
              current === section.id ? "pill-admin-on" : ""
            }`}
          >
            {section.label}
            {section.badge && (
              <span
                className={`font-mono text-xs ${
                  current === section.id ? "opacity-70" : "opacity-60"
                }`}
              >
                {section.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="lg:grid lg:grid-cols-[1.5fr_1fr] lg:items-start lg:gap-[18px]">
        <div className="space-y-4">{body(inColumn("main"))}</div>
        <div className="space-y-4">{body(inColumn("rail"))}</div>
      </div>
    </div>
  );
}
