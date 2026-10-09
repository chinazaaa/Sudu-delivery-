import { whatsappLink } from "@/lib/settings";

/**
 * "Something not right? Message us."
 *
 * The number was plain text, so anybody who wanted help had to copy it out
 * and find it in WhatsApp themselves. It is a link now, and it opens a chat
 * with the message half written, because somebody who has hit a problem
 * should not also have to explain where they were.
 */
export default function HelpLine({
  number,
  about,
  page,
  card = false,
}: {
  number: string;
  /** What they were doing, so the chat opens knowing it. */
  about: string;
  /** The page they are on. Without it the message says there is a problem and
   *  leaves us asking which group, which is the one thing they cannot easily
   *  tell us from their phone. */
  page?: string;
  /** The board's card in a sidebar, rather than one small line under a
   *  page. Same words, same link. */
  card?: boolean;
}) {
  if (!number) return null;
  const link = whatsappLink(
    number,
    `Hi Sudu, something is not right with ${about}.` + (page ? `\n\n${page}` : "")
  );

  if (card) {
    return (
      <section className="card space-y-2">
        <h2 className="text-lg font-bold">Something wrong with a box?</h2>
        <p className="text-[15px] text-ink/70">
          Call or WhatsApp us and we will sort it.
        </p>
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="block font-mono text-xl font-semibold text-brand-dark"
          >
            {number}
          </a>
        ) : (
          <span className="block font-mono text-xl font-semibold">{number}</span>
        )}
      </section>
    );
  }

  return (
    <p className="text-center text-xs text-muted">
      Something not right? Message us on{" "}
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-brand underline"
        >
          {number}
        </a>
      ) : (
        number
      )}
      .
    </p>
  );
}
