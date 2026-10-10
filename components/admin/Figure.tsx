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
  /** "mint" for money kept, which is the one figure worth colouring. */
  tone?: "ink" | "mint";
}) {
  return (
    <div className="card p-4">
      <p className="ticket text-muted">{label}</p>
      <p
        className={`mt-0.5 font-display text-[40px] font-black leading-[1.05] ${
          tone === "mint" ? "text-mint" : "text-ink"
        }`}
      >
        {value}
      </p>
      {detail && <p className="mt-1 text-[12.5px] leading-[1.35] text-muted">{detail}</p>}
    </div>
  );
}
