/**
 * "Ask your parents": a student's own message to their mother, written for
 * them.
 *
 * The student is the one on this page and the parent is the one with the
 * money, and the gap between those two facts is where most of this shop's
 * orders die. A care package is not something anybody buys out of their own
 * pocket money; it is something they get bought. So rather than asking a
 * student to pay ₦24,000, this asks them to forward a sentence, which is a
 * thing they will actually do, and lands the shop in front of a parent who
 * would never have found it.
 *
 * The message is already written because the wording is the hard part. Left
 * to compose it themselves most people close WhatsApp again, and the ones
 * who do write something write "there's this app" with no link.
 *
 * Beside the boxes rather than under them. It used to sit at the foot of
 * the shelf, which is after somebody has read a dozen prices and decided
 * they cannot afford any of them, and by then they have gone. The moment
 * this has to be on screen is the moment they see the first price, so it
 * stands in the column alongside, where the decision is still open.
 *
 * A plain wa.me link, not a share sheet: it opens in WhatsApp with the words
 * in the box, ready to pick a contact, and it works the same on every phone
 * without a line of JavaScript.
 */
export default function AskParents({
  what,
  href,
}: {
  /** The shelf, by name, so the message names the actual thing. */
  what: string;
  /** Where it lives, absolute, because this is going into somebody else's
   *  phone and a relative link means nothing there. */
  href: string;
}) {
  // The shelf is named on its own line rather than dropped into the middle
  // of a sentence: "the care packages" reads, "the study and exam" does not,
  // and the wording cannot be written once for every shelf a shop will ever
  // add.
  /*
   * News, and not a begging letter.
   *
   * It opened "Mum" and asked "please can you get me one of these", which
   * is wrong twice. Half the people this is forwarded to are fathers. And
   * at this university a student may well be paying for their own food,
   * so a message that assumes somebody else is paying is a message that
   * embarrasses the person sending it.
   *
   * What travels instead is a thing worth passing on: there is a service
   * here, it does this, here is the one I would want. Whoever reads it can
   * decide what to do about it, which is what they were going to do
   * anyway.
   */
  const message = encodeURIComponent(
    `There is a service here at PAU that delivers food and foodstuff to the ` +
      `hostels, and they do monthly boxes and parcels for parents now.\n\n` +
      `This is the one I would want:\n${what}\n\n` +
      `They bring it to the hostel and send a photo when it is handed over. ` +
      `They have been on the PAU campus since 2018.\n\n${href}`
  );

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-ink p-6 text-shell shadow-[8px_8px_0_#e5321d]">
      <span className="ticket text-volt">Ask someone at home</span>
      <h2 className="font-display text-[30px] font-black uppercase leading-none">
        Send it to a parent
      </h2>
      <p className="leading-relaxed text-rail-text">
        A ready-made WhatsApp message with the link in it. They can pay from
        anywhere, and we do monthly boxes and parcels for parents too.
      </p>
      <a
        href={`https://wa.me/?text=${message}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-12 items-center justify-center rounded-full bg-volt px-5 font-bold text-ink"
      >
        Make the message
      </a>
    </section>
  );
}
