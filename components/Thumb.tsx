import Drawing from "./Drawing";
import { drawingFor } from "@/lib/drawing";

/**
 * A picture if there is one, and one of the shop's own drawings if there is
 * not.
 *
 * It used to be a tinted square with the first letter in it, which read as
 * a thing waiting for a photograph. The drawing is picked off the name and
 * the category, so a bottle of water gets a cup and a pizza gets a slice,
 * and a menu with no photographs at all still looks like a shop rather than
 * a spreadsheet. A real photograph always wins the moment there is one.
 */
export default function Thumb({
  src,
  name,
  className = "",
  rounded = "rounded-xl",
  variant = "tile",
  category = "",
}: {
  src: string;
  name: string;
  className?: string;
  rounded?: string;
  /** What the menu files it under, which is the shop's own decision and
   *  usually righter about what a thing is than one word in its name. */
  category?: string;
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

  // One of the five tile colours rather than a hue off the name, so a wall
  // of drawings is the shop's palette rather than a rainbow.
  const WASH = ["#fff6d6", "#f2efe9", "#ffe9e4", "#eaf3ec", "#fdf3d9"];

  return (
    <div
      className={`${rounded} ${className} flex h-full w-full items-center justify-center overflow-hidden`}
      style={{ background: WASH[hue % WASH.length] }}
    >
      <Drawing name={drawingFor(name, category)} size="72%" />
    </div>
  );
}
