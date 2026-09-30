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
    <div className="card space-y-2 bg-brand-tint p-4">
      <p className="font-bold">Not paying for it yourself?</p>
      <p className="text-sm text-ink/90">
        We will write the message. Send it to your mum or dad and they can
        order it for you — they do not need you to do anything else.
      </p>
      <a
        href={`https://wa.me/?text=${message}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary inline-block px-6"
      >
        Ask your parents
      </a>
    </div>
  );
}
