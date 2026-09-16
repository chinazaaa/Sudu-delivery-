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
}: {
  src: string;
  name: string;
  className?: string;
  rounded?: string;
}) {
  if (src) {
    return (
      // Images are pasted in as URLs from anywhere, so next/image optimisation
      // is not worth the domain allow-list it would need.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        loading="lazy"
        className={`${rounded} ${className} h-full w-full object-cover`}
      />
    );
  }

  const hue = [...name].reduce((total, ch) => total + ch.charCodeAt(0), 0) % 360;

  return (
    <div
      className={`${rounded} ${className} flex h-full w-full items-center justify-center`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 70% 92%), hsl(${(hue + 40) % 360} 65% 84%))`,
      }}
    >
      <span
        className="text-2xl font-bold"
        style={{ color: `hsl(${hue} 45% 35%)` }}
      >
        {name.slice(0, 1).toUpperCase()}
      </span>
    </div>
  );
}
