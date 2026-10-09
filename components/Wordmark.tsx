/**
 * SUDU, said the way the redesign says it.
 *
 * Three bars of speed falling away behind a name sheared ten degrees
 * forward: a courier's mark rather than a shop's. Drawn in markup rather
 * than as an image so it takes the colour it is put on, which is the whole
 * reason it can sit on cream and on Ink without two files.
 *
 * The bars are stepped 52/36/20 at full size, which is what makes them read
 * as motion rather than as a bar chart, so they scale with the name instead
 * of being fixed.
 */
export default function Wordmark({
  /** The cap height of the name, in px. Everything else follows it. */
  size = 32,
  /** "ink" on a light ground, "light" on Ink. */
  tone = "ink",
  className = "",
}: {
  size?: number;
  tone?: "ink" | "light";
  className?: string;
}) {
  const bar = Math.max(3, Math.round(size * 0.125));
  const gap = Math.max(2, Math.round(size * 0.09));
  const wide = [size * 0.5, size * 0.345, size * 0.19];

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      aria-label="Sudu"
      role="img"
    >
      <span
        aria-hidden="true"
        className="flex flex-col items-end"
        style={{ gap: `${gap}px` }}
      >
        {wide.map((w, at) => (
          <span
            key={at}
            className="block bg-brand"
            style={{ width: `${Math.round(w)}px`, height: `${bar}px` }}
          />
        ))}
      </span>
      <span
        className={`font-display font-black uppercase leading-none ${
          tone === "light" ? "text-white" : "text-ink"
        }`}
        style={{ fontSize: `${size}px`, transform: "skewX(-10deg)" }}
      >
        Sudu
      </span>
    </span>
  );
}
