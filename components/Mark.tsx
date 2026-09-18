/**
 * The bag, drawn once.
 *
 * A logo that lives in five places should be one drawing: a file somebody
 * replaces later changes the site everywhere, rather than in four of the five
 * places anybody thought to look.
 */
export default function Mark({
  /** "brand" is the cream bag on orange; "light" is for a dark background. */
  tone = "brand",
  className = "size-full",
}: {
  tone?: "brand" | "light";
  className?: string;
}) {
  const tile = tone === "brand" ? "#ff5a1f" : "rgba(255,255,255,0.18)";
  const bag = tone === "brand" ? "#fff1ea" : "#ffffff";

  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden>
      <rect width="512" height="512" rx="116" fill={tile} />
      <path d="M116 180h280l-27 248a44 44 0 0 1-44 39H187a44 44 0 0 1-44-39z" fill={bag} />
      <path
        d="M196 180v-26a60 60 0 0 1 120 0v26"
        fill="none"
        stroke={bag}
        strokeWidth="30"
        strokeLinecap="round"
      />
      <path
        d="M316 272C316 240 202 240 202 294C202 338 316 330 316 372C316 426 202 426 202 392"
        fill="none"
        stroke="#ff5a1f"
        strokeWidth="36"
        strokeLinecap="round"
      />
    </svg>
  );
}
