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
}: {
  number: string;
  /** What they were doing, so the chat opens knowing it. */
  about: string;
}) {
  if (!number) return null;
  const link = whatsappLink(number, `Hi Sudu, something is not right with ${about}.`);

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
