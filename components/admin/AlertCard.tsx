import Link from "next/link";
import ConfirmButton from "./ConfirmButton";
import { naira } from "@/lib/money";
import { agoLabel } from "@/lib/time";
import type { Candidate } from "@/lib/alerts";

/**
 * One payment alert, with the orders it could be about.
 *
 * Catlog says an amount and the name on the paying account, and no
 * narration, so nothing here knows which order this is. It offers the
 * orders of exactly that amount, nearest name first, and a person decides.
 *
 * The button marks an order paid, which is the same thing the order's own
 * page does and goes through the same door. What it never does is mark
 * anything by itself.
 */
export default function AlertCard({
  letter,
  amount,
  payer,
  candidates,
  markPaid,
  setMailDone,
}: {
  letter: { id: string; receivedAt: string; subject: string; doneAt: string | null };
  amount: number | null;
  payer: string;
  candidates: Candidate[];
  markPaid: (form: FormData) => Promise<void>;
  setMailDone: (form: FormData) => Promise<void>;
}) {
  const done = Boolean(letter.doneAt);

  return (
    <article className={`card space-y-2.5 p-3.5 sm:p-4 ${done ? "opacity-70" : ""}`}>
      <div className="flex items-baseline justify-between gap-2.5">
        <div className="min-w-0">
          <strong className="text-[15.5px]">{payer || "Somebody"}</strong>
          <p className="hint">{agoLabel(letter.receivedAt)}</p>
        </div>
        <span className="shrink-0 font-display text-[24px] font-black leading-none text-mint sm:text-[28px]">
          {amount === null ? "—" : naira(amount)}
        </span>
      </div>

      {/* An alert this could not read at all. Shown rather than hidden: a
          wording Catlog changed is a thing to know about, and the words are
          one tap away on the letter itself. */}
      {amount === null && (
        <p className="hint">
          Could not read an amount out of this one.{" "}
          <Link href={`/admin/inbox/${letter.id}`} className="font-semibold underline">
            Open it
          </Link>{" "}
          and mark the order paid by hand.
        </p>
      )}

      {amount !== null && candidates.length === 0 && (
        <p className="hint">
          No unpaid order for {naira(amount)}. Either it is already marked
          paid, or this is money for something else.
        </p>
      )}

      {!done &&
        candidates.map((one) => (
          <form
            key={one.id}
            action={markPaid}
            className="soft flex flex-wrap items-center gap-2.5 bg-shell p-2.5"
          >
            <input type="hidden" name="order_id" value={one.id} />
            {/* What the alert said, kept on the order so the books can say
                where the figure came from. */}
            <input type="hidden" name="payment_ref" value={`Catlog · ${payer}`} />
            <span className="min-w-0 flex-1">
              <Link
                href={`/admin/orders/${one.id}`}
                className="text-[14.5px] font-semibold hover:text-brand"
              >
                #{one.orderNo ?? "?"} · {one.name || "No name"}
              </Link>
              <span className="hint block">
                {naira(one.total)} · ordered {agoLabel(one.createdAt)}
                {one.shared > 0
                  ? ` · ${one.shared} name word${one.shared === 1 ? "" : "s"} match`
                  : " · no name in common"}
              </span>
            </span>
            <ConfirmButton
              tone="admin"
              className={`min-h-[44px] shrink-0 ${one.shared > 0 ? "btn-admin-go" : ""}`}
              confirm={`Yes, #${one.orderNo ?? "?"} is paid`}
            >
              Mark paid
            </ConfirmButton>
          </form>
        ))}

      <div className="flex flex-wrap items-center gap-2.5 border-t-[1.5px] border-rule pt-2.5">
        <Link href={`/admin/inbox/${letter.id}`} className="hint underline">
          The email itself
        </Link>
        <form action={setMailDone} className="ml-auto">
          <input type="hidden" name="mail_id" value={letter.id} />
          <input type="hidden" name="done" value={String(!done)} />
          <button className="btn-admin btn-admin-sm">
            {done ? "Put it back" : "Dealt with"}
          </button>
        </form>
      </div>
    </article>
  );
}
