/**
 * A row of stars.
 *
 * Solid Ink rather than the gold every other site uses: the design has one
 * yellow and it is the Volt behind this band, so a gold star on it would
 * disappear. Half marks are not drawn, because a rating is already printed
 * beside them in numbers and a half star is a thing people squint at.
 */
export default function Stars({
  out = 5,
  size = 16,
  tone = "ink",
}: {
  /** How many are filled, rounded to the nearest whole one. */
  out?: number;
  size?: number;
  tone?: "ink" | "light";
}) {
  const filled = Math.max(0, Math.min(5, Math.round(out)));
  const colour = tone === "light" ? "#f2efe9" : "#15110e";

  return (
    <span aria-hidden className="flex gap-0.5">
      {[0, 1, 2, 3, 4].map((at) => (
        <svg key={at} width={size} height={size} viewBox="0 0 24 24">
          <path
            d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"
            fill={at < filled ? colour : "none"}
            stroke={colour}
            strokeWidth="1.5"
            strokeLinejoin="round"
            opacity={at < filled ? 1 : 0.3}
          />
        </svg>
      ))}
    </span>
  );
}
