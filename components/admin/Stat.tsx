import { naira } from "@/lib/money";
import Figure from "./Figure";

/**
 * A number worth glancing at, on a card rather than buried in a sentence.
 *
 * It was the last figure card still in the old look, a hairline border and
 * a 24px bold number, while ten pages' worth of its neighbours had moved to
 * the board's tile: a ticket label over forty pixels of the display face.
 * Two kinds of stat card on one screen is the kind of thing nobody can name
 * and everybody sees.
 *
 * So it is Figure now, and keeps its own signature, because ten pages call
 * it with a number and a tone and there is nothing wrong with that.
 */
export default function Stat({
  label,
  value,
  money = false,
  tone,
  hint,
}: {
  label: string;
  value: number | string;
  money?: boolean;
  /** "good" is money kept, "warn" is a number to be uneasy about. */
  tone?: "good" | "warn";
  hint?: string;
}) {
  return (
    <Figure
      label={label}
      value={money && typeof value === "number" ? naira(value) : String(value)}
      detail={hint}
      tone={tone === "warn" ? "brand" : tone === "good" ? "mint" : "ink"}
    />
  );
}
