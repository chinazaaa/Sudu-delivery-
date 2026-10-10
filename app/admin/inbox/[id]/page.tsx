import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/admin/PageHeader";
import Panel from "@/components/admin/Panel";
import ReplyBox from "@/components/admin/ReplyBox";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { oneLetter, repliesTo, senderName, addressOf, vouchedFor } from "@/lib/mail";
import { deleteMail, markMailRead, setMailDone } from "../../actions";
import { agoLabel, whenLabel } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * One letter, and the box to answer it in.
 *
 * The plain text is what is shown. A shop's inbox is mostly people writing
 * sentences, and rendering somebody else's HTML inside admin means running
 * their markup in the page where the money is: the words are the point and
 * the original is still at Resend for the rare letter that needs its
 * layout.
 */
export default async function LetterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const letter = await oneLetter(id);
  if (!letter) notFound();

  const answers = await repliesTo(letter.id);
  const to = addressOf(letter.from);
  const vouched = vouchedFor(letter.checks);
  const checked = letter.checks.spf !== "" || letter.checks.dkim !== "";

  return (
    <div>
      <PageHeader
        backHref="/admin/inbox"
        backLabel="Inbox"
        title={letter.subject || "No subject"}
        detail={
          <>
            {senderName(letter.from)}
            {to !== "" && ` · ${to}`} · {whenLabel(letter.receivedAt)}
          </>
        }
        actions={
          <>
            {/* Read is a thing that has happened rather than a thing to do,
                so it is only offered while it has not. */}
            {!letter.readAt && (
              <form action={markMailRead}>
                <input type="hidden" name="mail_id" value={letter.id} />
                <button className="btn-admin btn-admin-sm">Mark read</button>
              </form>
            )}
            <form action={setMailDone}>
              <input type="hidden" name="mail_id" value={letter.id} />
              <input
                type="hidden"
                name="done"
                value={String(!letter.doneAt)}
              />
              <button className="btn-admin btn-admin-sm">
                {letter.doneAt ? "Put it back" : "Nothing needed"}
              </button>
            </form>
          </>
        }
      />

      {/* Only where it failed, and only as a fact. Admin is not a spam
          filter and should not pretend to be one, but a letter claiming to
          be a bank whose own domain will not vouch for it is worth a line
          before anybody acts on what it says. */}
      {checked && !vouched && (
        <div className="soft mb-3.5 border-brand bg-brand-wash p-3.5">
          <p className="text-sm font-bold text-brand-dark">
            The sending domain did not vouch for this
          </p>
          <p className="hint mt-1">
            SPF {letter.checks.spf || "not said"} · DKIM{" "}
            {letter.checks.dkim || "not said"} · DMARC{" "}
            {letter.checks.dmarc || "not said"}. Anybody can write any name in
            a From line, so treat what it asks for accordingly.
          </p>
        </div>
      )}

      <div className="grid items-start gap-[18px] lg:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0 space-y-[18px]">
          <Panel title="What they wrote" size="sm">
            {/* Their words as they typed them, line breaks and all. */}
            <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed">
              {letter.text.trim() ||
                "Nothing in plain text. The original is in Resend, laid out as they sent it."}
            </p>
          </Panel>

          {answers.length > 0 && (
            <Panel title={answers.length === 1 ? "What you said" : "What you said back"} size="sm">
              <div className="mt-1">
                {answers.map((reply) => (
                  <div key={reply.id} className="border-t-[1.5px] border-rule py-3">
                    <p className="hint">{agoLabel(reply.sentAt)}</p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                      {reply.body}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <Panel
            title={answers.length > 0 ? "Say something else" : "Reply"}
            size="sm"
            detail={
              to === ""
                ? undefined
                : "Goes out as an answer to their own email, so it lands in the same conversation."
            }
          >
            <div className="mt-2">
              {to === "" ? (
                <p className="hint">
                  There is no address on this one to reply to. It can still be
                  put aside.
                </p>
              ) : (
                <ReplyBox
                  mailId={letter.id}
                  to={to}
                  subject={letter.subject || "your email"}
                />
              )}
            </div>
          </Panel>
        </div>

        <div className="min-w-0 space-y-[18px]">
          <Panel title="The envelope" size="sm">
            <dl className="mt-2 text-[14.5px]">
              <Line label="From" value={letter.from} />
              <Line label="To" value={letter.to} />
              {letter.cc !== "" && <Line label="Cc" value={letter.cc} />}
              <Line label="Arrived" value={whenLabel(letter.receivedAt)} />
              {checked && (
                <Line
                  label="Vouched for"
                  value={vouched ? "Yes, SPF and DKIM pass" : "No"}
                />
              )}
            </dl>
          </Panel>

          {letter.attachments.length > 0 && (
            <Panel title="Attached" size="sm">
              {/* Named, not kept. The files stay at Resend behind a link
                  that expires, so copying them here would be a second copy
                  of somebody's documents with nothing watching it. */}
              <ul className="mt-2 space-y-1.5 text-[14.5px]">
                {letter.attachments.map((file) => (
                  <li key={file.id} className="border-t-[1.5px] border-rule pt-1.5">
                    <span className="font-semibold">{file.filename || "A file"}</span>
                    <span className="hint block">
                      {file.content_type || "unknown type"}
                      {file.size ? ` · ${Math.max(1, Math.round(file.size / 1024))} KB` : ""}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="hint mt-2.5">
                Open the letter in Resend to download these. They are not
                copied here.
              </p>
            </Panel>
          )}

          <Panel title="Done with it" size="sm">
            <form action={setMailDone} className="mt-2 flex items-center gap-2.5">
              <input type="hidden" name="mail_id" value={letter.id} />
              <input type="hidden" name="done" value={String(!letter.doneAt)} />
              <p className="hint flex-1">
                {letter.doneAt
                  ? "Put aside. It is out of the waiting list."
                  : "Most of what arrives needs no answer. This takes it off the waiting list without sending anything."}
              </p>
              <ConfirmButton
                tone="admin"
                className="min-h-[44px] shrink-0"
                confirm={letter.doneAt ? "Yes, put it back" : "Yes, nothing needed"}
              >
                {letter.doneAt ? "Put it back" : "Nothing needed"}
              </ConfirmButton>
            </form>
          </Panel>

          {/*
            Gone, rather than put aside.

            "Nothing needed" is the ordinary answer and keeps the letter,
            because a record of what the shop was asked is worth having.
            This is for the rest: spam, a test, a newsletter nobody signed
            up for. It is written into the deleted log with its words, and
            the original is still at Resend, so this is the shop's copy and
            not the last one.
          */}
          <Panel title="Delete it" size="sm">
            <form action={deleteMail} className="mt-2 flex items-center gap-2.5">
              <input type="hidden" name="mail_id" value={letter.id} />
              <p className="hint flex-1">
                Forever here. It stays in the deleted log, and the original is
                still in Resend.
              </p>
              <ConfirmButton
                tone="bad"
                className="min-h-[44px] shrink-0"
                confirm="Yes, delete it"
              >
                Delete
              </ConfirmButton>
            </form>
          </Panel>

          <Link href="/admin/inbox" className="btn-admin btn-admin-sm">
            ← Back to the inbox
          </Link>
        </div>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2.5 border-t-[1.5px] border-rule py-2">
      <dt className="hint shrink-0">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-right font-medium">{value}</dd>
    </div>
  );
}
