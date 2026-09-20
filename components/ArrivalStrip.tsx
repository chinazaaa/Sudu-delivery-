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
 */
export default function ArrivalStrip({ said }: { said: string }) {
  return (
    <Link
      href="/cart"
      className="block rounded-2xl border-2 border-brand/30 bg-brand-tint px-4 py-3 transition active:scale-[0.99]"
    >
      <p className="text-lg font-extrabold text-ink">Order now, get it {said}</p>
    </Link>
  );
}
