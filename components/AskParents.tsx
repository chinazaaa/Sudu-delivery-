/**
 * "Ask your parents" — a student's own message to their mother, written for
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
 * they cannot afford any of them — and by then they have gone. The moment
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
  const message = encodeURIComponent(
    `Mum, there is a service that delivers food and foodstuff to the hostels ` +
      `here at school.\n\nPlease can you get me one of these?\n${what}\n\n` +
      `They bring it to my hostel and send you a photo when it is handed ` +
      `over. They have been on the PAU campus since 2018.\n\n${href}`
  );

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-ink p-6 text-shell shadow-[8px_8px_0_#e5321d]">
      <span className="ticket text-volt">Someone else paying?</span>
      <h2 className="font-display text-[30px] font-black uppercase leading-none">
        Send it to a parent
      </h2>
      <p className="leading-relaxed text-rail-text">
        Get a ready-made WhatsApp message with the link, so they can pay from
        anywhere.
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
