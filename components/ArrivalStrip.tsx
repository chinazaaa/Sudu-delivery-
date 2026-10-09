import Link from "next/link";

import CutOff from "./CutOff";

/**
 * The one thing worth saying at the top of a food shop: when it arrives.
 *
 * It used to be a timetable. "today · afternoon batch closes 2:45 PM, in
 * 1h 01m, Between 4pm and 6pm, Delivery from ₦4,000" is four facts about how
 * the shop works and none about dinner, and "batch" is a word from the run
 * sheet that nobody ordering food has any reason to know.
 *
 * So it is one sentence, the same shape whatever is behind it: a run going
 * out, or a car of its own three hours from now. Whichever it is has already
 * been decided by the time this is rendered, and it is the same decision the
 * checkout makes.
 *
 * The other way gets a line under it. Two kinds of person open this page:
 * one wants it tonight and one wants it cheap, and a single sentence naming
 * a run five days out turns the first of them away at the door. No price
 * here, because the price depends on what they end up ordering, and a number
 * quoted before there is a cart is a number that will change.
 */
export default function ArrivalStrip({
  said,
  also,
  closesAt = "",
}: {
  said: string;
  /** The other way of getting it here, when there is one. */
  also?: { said: string; sooner: boolean } | null;
  /** When the run in the sentence above stops taking orders. Empty where
   *  this is a car of its own, which has no queue to make. */
  closesAt?: string;
}) {
  return (
    <Link
      href="/products"
      className="relative block rounded-2xl bg-ink p-5 text-shell shadow-[6px_6px_0_#e5321d] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-[4px_4px_0_#e5321d]"
    >
      {/* A ticket, not a banner. The run is the one fact somebody opening a
          food shop wants, and on Ink with a torn red edge behind it, it is
          the thing on the page that cannot be scrolled past. */}
      <span className="flex items-baseline justify-between gap-3">
        <span className="ticket text-volt">Next run to PAU</span>
        <span className="ticket text-shell/60">Tap to browse</span>
      </span>

      <span className="mt-2 block font-display text-4xl font-extrabold uppercase leading-[0.95] sm:text-5xl">
        {said}
      </span>

      <span className="mt-4 block border-t-2 border-dashed border-shell/25" />

      <span className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="min-w-0">
          {/* The deadline, between the promise and the alternative: it is
              the reason to take the first one rather than read on. */}
          {closesAt !== "" && <CutOff at={closesAt} tone="light" />}
          {also && (
            <span className="block text-shell/75">
              {also.sooner
                ? `In a hurry? A car of its own can be there ${also.said}, for more.`
                : `Rather pay less? A run gets it to you ${also.said}.`}
            </span>
          )}
        </span>
        <span className="shrink-0 font-bold text-volt">Browse the menu</span>
      </span>
    </Link>
  );
}
