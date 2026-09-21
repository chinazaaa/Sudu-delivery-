import Link from "next/link";

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
}: {
  said: string;
  /** The other way of getting it here, when there is one. */
  also?: { said: string; sooner: boolean } | null;
}) {
  return (
    <Link
      href="/cart"
      className="block rounded-2xl border-2 border-brand/30 bg-brand-tint px-4 py-3 transition active:scale-[0.99]"
    >
      <p className="text-lg font-extrabold text-ink">Order now, get it {said}</p>

      {also && (
        <p className="mt-1 text-sm text-ink/75">
          {also.sooner
            ? `In a hurry? A car of its own can be there ${also.said}, for more.`
            : `Rather pay less? A run gets it to you ${also.said}.`}
        </p>
      )}
    </Link>
  );
}
