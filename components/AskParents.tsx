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
 * A line at the top, not a card at the foot. It was under every box on the
 * shelf, which is after somebody has read a dozen prices and decided they
 * cannot afford any of them — and by then they have gone. The moment this
 * has to be on the screen is the moment they see the first price, so it
 * goes where the decision is still open, in the same shape as the line that
 * offers to split a delivery, for the same reason.
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
    <a
      href={`https://wa.me/?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-3 rounded-2xl border border-brand/25 bg-brand-tint px-4 py-2.5"
    >
      <span className="min-w-0 text-sm">
        <span className="font-bold text-brand-dark">
          Not paying for it yourself?
        </span>{" "}
        <span className="text-ink/75">
          We will write the message for your mum or dad.
        </span>
      </span>
      <span className="shrink-0 text-sm font-extrabold text-brand-dark">Ask</span>
    </a>
  );
}
