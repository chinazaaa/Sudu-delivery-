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
}) {
  return (
    <div className="card p-4">
      <p className="ticket text-muted">{label}</p>
      <p
        className={`mt-0.5 font-display text-[40px] font-black leading-[1.05] ${
          tone === "mint" ? "text-mint" : tone === "brand" ? "text-brand-dark" : "text-ink"
        }`}
      >
        {value}
      </p>
      {detail && <p className="hint mt-1">{detail}</p>}
    </div>
  );
}
