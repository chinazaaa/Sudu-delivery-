import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import Figure from "@/components/admin/Figure";
import { inbox, senderName, snippet, READS_AT } from "@/lib/mail";
import { agoLabel } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * The post.
 *
 * Mail to the shop arrived at Resend and could only be read there, which is
 * a second place to remember to look and no way to answer from the screen
 * where everything else about that person already is.
 *
 * Waiting leads, because an unanswered letter is the only thing on this
 * page that is a job. Everything else is a record, and a record reads
 * newest first.
 */
export default async function InboxPage() {
  const post = await inbox();
  const waiting = post.filter((one) => !one.repliedAt && !one.doneAt);
  const dealt = post.filter((one) => one.repliedAt || one.doneAt);

  return (
    <div>
      <PageHeader
        title="Inbox"
        detail={`Everything sent to ${READS_AT}. Replies go back from here and land in the same conversation.`}
      />

      {post.length === 0 && (
        <div className="soft mb-3.5 border-volt-line bg-brand-tint p-3.5">
          <p className="text-sm font-bold">Nothing here yet</p>
          <p className="hint mt-1">
            Mail appears the moment it arrives at {READS_AT}. If you are
            expecting something and this stays empty, the webhook in Resend is
            the thing to check.
          </p>
        </div>
      )}

      {post.length > 0 && (
        <div className="mb-3.5 grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-4">
          <Figure
            label="Waiting"
            value={String(waiting.length)}
            tone={waiting.length > 0 ? "brand" : "mint"}
            detail={waiting.length === 1 ? "Letter needing you" : "Letters needing you"}
          />
          <Figure label="All of it" value={String(post.length)} detail="Newest first" />
        </div>
      )}

      {waiting.length > 0 && (
        <>
          <p className="ticket mb-2 text-muted">Waiting on you</p>
          <ul className="mb-3.5 space-y-2.5">
            {waiting.map((letter) => (
              <Row key={letter.id} letter={letter} />
            ))}
          </ul>
        </>
      )}

      {dealt.length > 0 && (
        <>
          <p className="ticket mb-2 text-muted">Dealt with</p>
          <ul className="space-y-2.5">
            {dealt.map((letter) => (
              <Row key={letter.id} letter={letter} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** One letter in the list: who, what, when, and how far it has got. */
function Row({ letter }: { letter: Awaited<ReturnType<typeof inbox>>[number] }) {
  const done = Boolean(letter.repliedAt || letter.doneAt);
  return (
    <li>
      <Link
        href={`/admin/inbox/${letter.id}`}
        className={`card flex items-start gap-2.5 p-3.5 transition hover:border-brand/40 sm:p-4 ${
          done ? "opacity-80" : ""
        }`}
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <strong className="text-[15px]">{senderName(letter.from)}</strong>
            {/* Unread is a dot rather than bold type: the list is already
                two weights and a third is a list nobody can scan. */}
            {!letter.readAt && (
              <span aria-label="Not read yet" className="size-2 rounded-full bg-brand" />
            )}
            <span className="hint">{agoLabel(letter.receivedAt)}</span>
          </span>
          <span className="mt-0.5 block text-[14.5px] font-semibold">
            {letter.subject || "No subject"}
          </span>
          <span className="hint mt-0.5 block">{snippet(letter.text || letter.subject)}</span>
        </span>

        <span className="flex shrink-0 flex-col items-end gap-1.5">
          {letter.repliedAt && <span className="tag bg-mint-tint text-mint">answered</span>}
          {!letter.repliedAt && letter.doneAt && (
            <span className="tag bg-wash text-ink">put aside</span>
          )}
          {letter.attachments.length > 0 && (
            <span className="hint">
              {letter.attachments.length} file
              {letter.attachments.length === 1 ? "" : "s"}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}
