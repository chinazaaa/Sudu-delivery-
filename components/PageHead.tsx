/**
 * The head of a page that is not the shop itself.
 *
 * The board gives every one of these the same three things on the same
 * band: a line in ticket type saying what kind of page it is, the name of
 * it as big as the page allows, and one sentence. The speed stripes sit
 * against the right edge and the rule under it separates the claim from
 * the work.
 *
 * Written once because there are a dozen of them, and a dozen hand-made
 * headers is a dozen chances for one of them to drift.
 */
export default function PageHead({
  ticket,
  title,
  lead = "",
  tone = "chalk",
  rule = true,
  narrow = false,
  children,
}: {
  /** The small line over the name. */
  ticket: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  /** Chalk is the ordinary one; Ink is for a page about an order or a room;
   *  Tomato is for the one page written to somebody who is not a student. */
  tone?: "chalk" | "ink" | "brand";
  /** The 2px rule along the bottom. Off where the page opens straight onto
   *  a band of its own. */
  rule?: boolean;
  /** A column of reading rather than the full width. */
  narrow?: boolean;
  children?: React.ReactNode;
}) {
  const dark = tone !== "chalk";

  return (
    <header
      className={`bleed relative overflow-hidden ${
        rule && !dark ? "border-b-2 border-ink" : ""
      } ${
        tone === "ink"
          ? "bg-ink text-shell"
          : tone === "brand"
            ? "bg-brand text-white"
            : ""
      }`}
    >
      <span
        aria-hidden
        className={`absolute inset-y-0 -right-10 w-[22%] ${dark ? "opacity-85" : ""}`}
        style={{
          background:
            "repeating-linear-gradient(-60deg,#e5321d 0 7px,transparent 7px 16px)",
        }}
      />
      <div
        className={`shell relative flex flex-col gap-4 pb-8 pt-7 sm:gap-5 sm:pb-10 sm:pt-11 ${
          narrow ? "max-w-[900px]" : ""
        }`}
      >
        <span
          className={`ticket ${
            tone === "brand"
              ? "text-[#ffe38a]"
              : tone === "ink"
                ? "text-volt"
                : "text-brand-dark"
          }`}
        >
          {ticket}
        </span>
        <h1 className="max-w-[900px] font-display text-[min(15vw,7rem)] font-black uppercase leading-[0.86] sm:text-[clamp(3.25rem,8vw,7rem)]">
          {title}
        </h1>
        {lead ? (
          <p
            className={`max-w-[580px] text-[17px] leading-relaxed sm:text-lg ${
              dark ? "text-[#d8d1c7]" : "text-ink/80"
            }`}
          >
            {lead}
          </p>
        ) : null}
        {children}
      </div>
    </header>
  );
}
