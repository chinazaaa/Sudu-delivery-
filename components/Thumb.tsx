/**
 * A picture if there is one, and something deliberate if there is not. An
 * empty grey box on every card would look worse than no pictures at all, so
 * the fallback is a tint derived from the name: stable, never ugly, and
 * obviously a placeholder to whoever is filling the menu in.
 */
export default function Thumb({
  src,
  name,
  className = "",
  rounded = "rounded-xl",
  variant = "tile",
}: {
  src: string;
  name: string;
  className?: string;
  rounded?: string;
  /** "banner" drops the initial and goes darker, for wide hero images. */
  variant?: "tile" | "banner";
}) {
  if (src) {
    // Images are pasted in as URLs from anywhere, so next/image optimisation
    // is not worth the domain allow-list it would need.
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        loading="lazy"
        className={`${rounded} ${className} h-full w-full object-cover`}
      />
    );
  }

  const hue = [...name].reduce((total, ch) => total + ch.charCodeAt(0), 0) % 360;

  if (variant === "banner") {
    return (
      <div
        className={`${rounded} ${className} h-full w-full`}
        style={{
          background: `radial-gradient(120% 120% at 15% 20%, hsl(${hue} 55% 32%), hsl(${
            (hue + 35) % 360
          } 65% 12%) 70%)`,
        }}
      />
    );
  }

  return (
    <div
      className={`${rounded} ${className} flex h-full w-full items-center justify-center`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 70% 92%), hsl(${(hue + 40) % 360} 65% 84%))`,
      }}
    >
      <span className="text-2xl font-bold" style={{ color: `hsl(${hue} 45% 35%)` }}>
        {name.slice(0, 1).toUpperCase()}
      </span>
    </div>
  );
}
