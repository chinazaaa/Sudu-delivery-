/**
 * Why to order here, said once, where it will be read.
 *
 * It was two lines of centred grey type between the restaurants and the
 * shelves: the pitch and then the shop's record, both set in the colour
 * this site uses for things that do not matter much. The single hardest
 * thing this shop asks of a stranger is money up front for food nobody has
 * bought yet, and the answer to that was styled like a disclaimer.
 *
 * A panel, in the brand's own tint, with the facts as marks you can count
 * rather than a sentence you have to read. Short enough that it costs the
 * food almost nothing, which is the only reason it is allowed this far up
 * the page.
 */
const FACTS = [
  { label: "Since 2018", note: "On the PAU campus", icon: "clock" },
  { label: "Award winning", note: "PAU Entrepreneurship, 2021", icon: "award" },
  // Not "delivery included": that is true of a box and of nothing else, and
  // an order off the menu is priced at the checkout like anywhere. Mixing
  // restaurants is true of everything here and is the thing no other way of
  // getting food to this campus can do.
  { label: "Mix restaurants", note: "KFC and Domino's, one order", icon: "mix" },
] as const;

function Icon({ name }: { name: (typeof FACTS)[number]["icon"] }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (name === "clock") {
    return (
      <svg {...common} aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }
  if (name === "award") {
    return (
      <svg {...common} aria-hidden>
        <circle cx="12" cy="9" r="5" />
        <path d="M8.5 13.5 7 22l5-2.5L17 22l-1.5-8.5" />
      </svg>
    );
  }
  // Two bags that overlap: one order holding what came from two places.
  return (
    <svg {...common} aria-hidden>
      <circle cx="9" cy="12" r="6" />
      <circle cx="15" cy="12" r="6" />
    </svg>
  );
}

export default function TrustStrip({ pitch }: { pitch: string }) {
  return (
    <section className="rounded-2xl bg-brand-tint p-4 sm:p-5">
      {pitch !== "" && (
        <p className="text-center text-[15px] font-bold leading-snug text-ink sm:text-base">
          {pitch}
        </p>
      )}
      {/* Three across even on the narrowest phone: they are three words
          each, and stacked they would be a list of claims rather than a
          line of marks. */}
      <ul
        className={`grid grid-cols-3 gap-2 ${pitch !== "" ? "mt-4" : ""}`}
      >
        {FACTS.map((fact) => (
          <li key={fact.label} className="flex flex-col items-center gap-1 text-center">
            <span className="grid size-9 place-items-center rounded-full bg-paper text-brand shadow-card">
              <Icon name={fact.icon} />
            </span>
            <span className="text-xs font-extrabold leading-tight sm:text-sm">
              {fact.label}
            </span>
            <span className="text-[11px] leading-tight text-muted sm:text-xs">
              {fact.note}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
