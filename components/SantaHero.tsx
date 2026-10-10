/**
 * The band at the top of a Secret Santa page.
 *
 * Ink with the speed stripes, the way every other head on the site is
 * drawn, with the stripes in Mint rather than Tomato where the page is
 * about the draw itself: this is the one part of the shop that is only
 * true in December, and the green is the whole of how it says so.
 */
export default function SantaHero({
  kicker,
  title,
  lead = "",
  chips = [],
  green = false,
  children,
}: {
  /** The small line over the name, in ticket type. */
  kicker: string;
  title: string;
  /** One sentence under the name. */
  lead?: string;
  chips?: string[];
  /** Mint stripes rather than Tomato. */
  green?: boolean;
  /** Anything the page wants under the name: the step pills, mostly. */
  children?: React.ReactNode;
}) {
  return (
    <section className="bleed relative overflow-hidden bg-ink text-shell">
      <span
        aria-hidden
        className="absolute inset-y-0 -right-10 w-[28%] opacity-85"
        style={{
          background: `repeating-linear-gradient(-60deg,${
            green ? "#1e7a4c" : "#e5321d"
          } 0 7px,transparent 7px 16px)`,
        }}
      />
      <div className="shell relative flex flex-col gap-3.5 pb-8 pt-6 sm:pb-9 sm:pt-7">
        <span className="ticket text-volt">{kicker}</span>
        <h1 className="font-display text-[min(14vw,6rem)] font-black uppercase leading-[0.86] sm:text-[clamp(3.25rem,8vw,6rem)]">
          {title}
        </h1>
        {lead !== "" && (
          <p className="max-w-[560px] text-[16px] leading-relaxed text-rail-text sm:text-[17px]">
            {lead}
          </p>
        )}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {chips.map((one) => (
              <span
                key={one}
                className="rounded-full border border-[#4a423b] px-3 py-1.5 text-sm"
              >
                {one}
              </span>
            ))}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
