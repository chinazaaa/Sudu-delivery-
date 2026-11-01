import PageHeader from "@/components/admin/PageHeader";
import { formatPhone } from "@/lib/phone";
import { naira } from "@/lib/money";
import { referrers, waitingReferrals } from "@/lib/referrals";
import { approveReferralMove, rejectReferralMove } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

/**
 * Referrals waiting on somebody.
 *
 * A customer who brings a friend in earns money off their own food, and
 * none of it reaches a wallet until this page says so. The reward is
 * recorded when the friend's food is actually delivered, which keeps out
 * the order that was paid for and cancelled; what it cannot keep out is
 * two accounts on one phone, a cousin with a second number, or a name
 * that looks exactly like the one above it. Those are easier to see than
 * to write a rule against, which is the whole reason this screen exists.
 *
 * Both numbers, both names and the order are on the row, because that is
 * what the judgement is made from: a referrer and a friend with one digit
 * between them is the thing to look for.
 */
export default async function ReferralsPage() {
  const [waiting, people] = await Promise.all([
    waitingReferrals(),
    referrers(),
  ]);

  return (
    <div className="pb-[76px] lg:pb-0">
      <PageHeader
        title="Referrals"
        detail="Somebody brought a friend in. Nothing reaches their wallet until you say so."
        backHref="/admin/more"
        backLabel="More"
      />

      {waiting.length === 0 ? (
        /* Admin's own empty state rather than the shop's: that one carries
           a button into the menu, which is no use to somebody standing in
           a car park. */
        <div className="card">
          <p className="text-[15px] font-bold">Nothing waiting</p>
          <p className="hint mt-1">
            A referral turns up here once the friend&apos;s food has been
            delivered. Until somebody pays it, it is worth nothing.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {waiting.map((one) => (
            <li key={one.id} className="card space-y-3">
              <div>
                <p className="text-[15px] font-bold leading-tight">
                  {one.name || "Somebody"} brought in{" "}
                  {one.friendName || "a friend"}
                </p>
                {/* Both numbers in full. The question this page is here to
                    answer is whether they are the same person, and that is
                    a question about digits. */}
                <p className="hint">
                  {formatPhone(one.phone)} → {formatPhone(one.friendPhone)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="ticket text-brand-dark">
                  {naira(one.amount)}
                </span>
                {one.orderId !== "" && (
                  <a
                    href={`/admin/orders/${one.orderId}`}
                    className="text-sm font-semibold text-brand underline-offset-4 hover:underline"
                  >
                    The order they placed
                  </a>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <form action={approveReferralMove}>
                  <input type="hidden" name="move_id" value={one.id} />
                  <button type="submit" className="btn-admin-go">
                    Pay it
                  </button>
                </form>
                {/* The reason is kept, because somebody will ask why, and
                    "we decided not to" is not an answer anybody can act
                    on. */}
                <form action={rejectReferralMove} className="flex gap-2">
                  <input type="hidden" name="move_id" value={one.id} />
                  <input
                    name="said"
                    className="field field-admin min-h-[42px]"
                    placeholder="Why not"
                    aria-label="Why not"
                  />
                  <button type="submit" className="btn-admin">
                    No
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Who is actually doing this, under the thing that needs doing.
          The promoter page is for people the shop recruited and pays in
          cash; this is the same idea done by customers, and all it is
          about is who brought whom in and what is sitting in a wallet. */}
      {people.length > 0 && (
        <section className="mt-[18px] space-y-3">
          <h2 className="ticket text-muted">Who has brought somebody in</h2>
          <ul className="space-y-2">
            {people.map((one) => (
              <li
                key={one.phone}
                className="card flex flex-wrap items-center justify-between gap-x-4 gap-y-2"
              >
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold leading-tight">
                    {one.name || formatPhone(one.phone)}
                  </span>
                  <span className="hint">
                    {one.code === "" ? formatPhone(one.phone) : `/s/${one.code}`}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span>
                    <span className="font-bold">{one.brought}</span> in
                  </span>
                  {one.waiting > 0 && (
                    <span className="text-brand-dark">
                      {one.waiting} waiting
                    </span>
                  )}
                  <span className="text-muted">{naira(one.earned)} earned</span>
                  {/* What is left is the number that matters at a
                      checkout, and the one that is not the same as what
                      they earned the moment they spend any of it. */}
                  <span className="font-bold">{naira(one.balance)} left</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
