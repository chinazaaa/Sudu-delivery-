import BoxShelf from "@/components/BoxShelf";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Food for an occasion",
  description:
    "A birthday, a match, a games night. Boxes packed for the day, at one " +
    "price with delivery in it, to PAU.",
  alternates: { canonical: "/occasions" },
};

/**
 * The shelf with a date on it.
 *
 * An occasion passes. A match that has kicked off, a birthday that was last
 * week: the page has to be able to drop them, which is exactly what a
 * collection must never do. Same boxes, same cards, two shelves.
 */
export default function OccasionsPage() {
  return (
    <BoxShelf
      kind="occasion"
      base="/occasions"
      title="Food for a room full of people"
      blurb="A birthday, a match, a games night. Already worked out, one price with delivery in it, and nothing to decide but when you want it."
      empty="Nothing is on just now."
      other={{ href: "/collections", said: "See the collections" }}
    />
  );
}
