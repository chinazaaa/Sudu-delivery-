/**
 * One number, big enough to read across a desk.
 *
 * The board sets every headline figure in the display face at forty pixels
 * with a ticket label over it, which is the same voice the shop uses for a
 * price. A dashboard read at arm's length while something else is cooking
 * wants the number, not the label, to be the thing the eye lands on.
 */
export default function Figure({
  label,
  value,
  detail,
  tone = "ink",
  deskOnly = false,
}: {
  label: string;
  value: string;
  detail?: string;
  /**
   * "mint" for money kept, "brand" for a number somebody should be
   * uneasy about.
   *
   * Two repeat customers out of twenty-one is the most important figure on
   * the customers page and it was reading in the same ink as lifetime
   * spend, which is the one thing a dashboard must not do: a figure worth
   * worrying about has to look different from a figure worth knowing.
   */
  tone?: "ink" | "mint" | "brand";
  /** Several phone boards draw the figure with no line under it, because
   *  a phone has two tiles where a desk has four and the room goes to the
   *  number. The hint is still in the page for a screen reader. */
  deskOnly?: boolean;
}) {
  return (
    <div className="card px-3.5 py-3 sm:p-4">
      <p className="ticket text-muted">{label}</p>
      <p
        className={`mt-0.5 font-display text-[26px] font-black leading-[1.05] sm:text-[40px] ${
          tone === "mint" ? "text-mint" : tone === "brand" ? "text-brand-dark" : "text-ink"
        }`}
      >
        {value}
      </p>
      {detail && (
        <p className={`hint mt-1 ${deskOnly ? "hidden sm:block" : ""}`}>{detail}</p>
      )}
    </div>
  );
}
