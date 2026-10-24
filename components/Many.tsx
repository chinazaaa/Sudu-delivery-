/**
 * How many of a thing, said so it cannot be skimmed past.
 *
 * Two hamburger meals were ordered and one is bought, and the whole of the
 * mistake is a digit that looks exactly like every other digit on the
 * page. The cost of it lands twice: the customer is short a meal, and the
 * shop hands back the money for food it already paid for at the counter.
 *
 * So one of a thing stays quiet and anything more is loud: filled, in the
 * brand colour, with the number written out underneath it. A number and a
 * word fail differently, and somebody reading at a till in a hurry has to
 * miss both.
 */
import { inWords } from "@/lib/counts";

export { inWords };

export default function Many({
  qty,
  /** Smaller, for a line inside a bag rather than the one being bought. */
  small = false,
}: {
  qty: number;
  small?: boolean;
}) {
  const many = Number(qty) || 0;

  if (many <= 1) {
    return (
      <span
        className={`shrink-0 font-display font-black leading-none ${
          small ? "text-[17px]" : "min-w-[46px] text-[34px] sm:min-w-[48px] sm:text-[30px]"
        }`}
      >
        {many}×
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 flex-col items-center justify-center rounded-xl bg-brand px-2 text-white ${
        small ? "py-[1px]" : "min-w-[46px] py-0.5 sm:min-w-[48px]"
      }`}
      /* Said once for a screen reader, which cannot see the colour and
         would otherwise hear the number twice. */
      aria-label={`${inWords(many)}, ${many}`}
    >
      <span
        aria-hidden
        className={`font-display font-black leading-none ${
          small ? "text-[17px]" : "text-[34px] sm:text-[30px]"
        }`}
      >
        {many}×
      </span>
      <span
        aria-hidden
        className={`ticket leading-none ${small ? "text-[8px]" : "text-[9.5px]"}`}
      >
        {inWords(many)}
      </span>
    </span>
  );
}
