/**
 * Sudu Bot, as a face.
 *
 * Three bars in a circle said "menu" more than it said anybody, and a chat
 * that is going to interrupt somebody's evening should at least look like
 * it belongs to this shop. So: a rider in a tomato helmet with a visor, two
 * volt lights for eyes, and the speed lines the brand already uses behind
 * him.
 *
 * Drawn rather than photographed, and drawn once rather than twice: the
 * launcher and the head of the panel are the same character at two sizes,
 * so the thing somebody taps is the thing that then talks to them.
 *
 * Every stroke width lives in the hundred-unit viewBox, so it scales with
 * the box rather than needing a second set of numbers for the small one.
 */
export default function Rider({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`rider ${className}`}
      viewBox="0 0 100 100"
      aria-hidden
      focusable="false"
    >
      {/* The speed lines, behind him, which are the shop's own mark. */}
      <path className="rs" d="M19 52 L9 52 M19 61 L4 61" />
      <g className="ro">
        {/* Jacket, helmet, visor. Drawn in that order so each sits on the
            one before it without needing a mask. */}
        <path className="rj" d="M26 78 Q26 86 36 86 L64 86 Q74 86 74 78 L74 62 L26 62 Z" />
        <path className="rh" d="M22 58 A28 28 0 0 1 78 58 L78 66 L22 66 Z" />
        <path className="rv" d="M27 50 Q50 42 73 50 L73 62 Q50 68 27 62 Z" />
      </g>
      {/* The eyes blink every few seconds, which keeps him alive without
          being busy about it. */}
      <g className="re">
        <circle cx="40" cy="56" r="4.6" />
        <circle cx="60" cy="56" r="4.6" />
      </g>
      <path className="rm" d="M42 76 Q50 81 58 76" />
    </svg>
  );
}
