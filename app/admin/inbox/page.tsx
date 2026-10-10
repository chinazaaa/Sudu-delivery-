import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import Figure from "@/components/admin/Figure";
import { alerts, inbox, senderName, snippet, type Letter, ALERTS_AT, READS_AT } from "@/lib/mail";
import { agoLabel } from "@/lib/time";
import AlertCard from "@/components/admin/AlertCard";
import { likelyOrders, readAlert } from "@/lib/alerts";
import { unpaidOrdersForMatching } from "@/lib/admin-data";
import { markPaid, setMailDone } from "../actions";

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
export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const query = await searchParams;
  const onAlerts = query.view === "alerts";

  const [post, banked] = await Promise.all([inbox(), alerts()]);

  /*
   * What each alert says, and the orders it could be about.
   *
   * Only read on the alerts tab, because it costs a query and the letters
   * tab has no use for it.
   */
  const unpaid = onAlerts ? await unpaidOrdersForMatching() : [];
  const read = banked.map((letter) => {
    const said = readAlert(letter.subject, letter.text);
    return {
      letter,
      amount: said?.amount ?? null,
      payer: said?.payer ?? "",
      candidates: said ? likelyOrders(said, unpaid, Date.parse(letter.receivedAt)) : [],
    };
  });
  const waiting = post.filter((one) => !one.repliedAt && !one.doneAt);
  const dealt = post.filter((one) => one.repliedAt || one.doneAt);

  return (
    <div>
      <PageHeader
        title="Inbox"
        detail={
          onAlerts
            ? `Forwarded to ${ALERTS_AT}. Read only: nothing here marks anything paid.`
            : `Everything sent to ${READS_AT}. Replies go back from here and land in the same conversation.`
        }
      />

      {/*
        Two piles, one page.

        Both arrive through the same webhook, because the domain receives
        for every address, and both are worth reading in the same place.
        They are not worth reading in the same list: a shop gets a handful
        of letters a week and an alert per payment, so mixed together the
        letters are buried by the end of a Saturday.
      */}
      {banked.length > 0 && (
        <div className="mb-3.5 flex rounded-full border-2 border-ink bg-wash p-[3px]">
          <Link
            href="/admin/inbox"
            aria-current={onAlerts ? undefined : "page"}
            className={`flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-full text-[14.5px] font-bold ${
              onAlerts ? "text-muted" : "bg-ink text-shell"
            }`}
          >
            Letters
            {waiting.length > 0 && (
              <span
                className={`rounded-full px-[7px] py-px font-mono text-[11px] ${
                  onAlerts ? "bg-brand text-white" : "bg-paper text-brand"
                }`}
              >
                {waiting.length}
              </span>
            )}
          </Link>
          <Link
            href="/admin/inbox?view=alerts"
            aria-current={onAlerts ? "page" : undefined}
            className={`flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-full text-[14.5px] font-bold ${
              onAlerts ? "bg-ink text-shell" : "text-muted"
            }`}
          >
            Bank alerts
            <span className="hint">{banked.length}</span>
          </Link>
        </div>
      )}

      {onAlerts && (
        <>
          {/* Said plainly, because this is the screen where somebody will
              eventually expect it to do the work for them. */}
          <div className="soft mb-3.5 border-volt-line bg-brand-tint p-3.5">
            <p className="text-sm font-bold">These do not mark anything paid</p>
            <p className="hint mt-1">
              An alert is a message, and anybody who learns this address can
              send one. Forwarding also breaks the check that would tell a
              real one from a forgery. Marking an order paid stays yours.
            </p>
          </div>
          <ul className="space-y-2.5">
            {read.map((one) => (
              <li key={one.letter.id}>
                <AlertCard
                  letter={one.letter}
                  amount={one.amount}
                  payer={one.payer}
                  candidates={one.candidates}
                  markPaid={markPaid}
                  setMailDone={setMailDone}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      {!onAlerts && post.length === 0 && (
        <div className="soft mb-3.5 border-volt-line bg-brand-tint p-3.5">
          <p className="text-sm font-bold">Nothing here yet</p>
          <p className="hint mt-1">
            Mail appears the moment it arrives at {READS_AT}. If you are
            expecting something and this stays empty, the webhook in Resend is
            the thing to check.
          </p>
        </div>
      )}

      {!onAlerts && post.length > 0 && (
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

      {!onAlerts && waiting.length > 0 && (
        <>
          <p className="ticket mb-2 text-muted">Waiting on you</p>
          <ul className="mb-3.5 space-y-2.5">
            {waiting.map((letter) => (
              <Row key={letter.id} letter={letter} />
            ))}
          </ul>
        </>
      )}

      {!onAlerts && dealt.length > 0 && (
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
function Row({ letter }: { letter: Letter }) {
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
