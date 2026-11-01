import { naira } from "@/lib/money";
import { REFERRAL_REWARD, shareText, type Wallet } from "@/lib/referrals";

/**
 * Telling a friend, on the page they already open.
 *
 * One button. The link carries the code, so there is nothing to copy and
 * nothing for anybody to type at a checkout: the friend taps it, orders,
 * and the money lands here. Anything with more steps in it than that is a
 * thing people mean to do and then do not.
 *
 * The balance is one number, because that is the question. Somebody who
 * brought ten people in has twenty thousand to spend, not ten codes to
 * use one order at a time.
 *
 * The moves underneath because the question after the number is always
 * "did Tolu's count". First names only: they did the introducing, they do
 * not own anybody's phone book.
 */
export default function ReferralCard({
  code,
  wallet,
  site,
}: {
  code: string;
  wallet: Wallet;
  site: string;
}) {
  if (code === "") return null;

  const link = `${site}/s/${code.toLowerCase()}`;
  const message = `https://wa.me/?text=${encodeURIComponent(shareText(code, site))}`;
  const brought = wallet.moves.filter((one) => one.reason === "referral");

  return (
    <div className="card space-y-3">
      <div>
        <h2 className="font-display text-2xl font-black uppercase leading-none">
          Bring a friend
        </h2>
        <p className="mt-1 text-[15px] leading-relaxed text-ink/75">
          Send them your link. When they pay for their first order you get{" "}
          {naira(REFERRAL_REWARD)} off your own food. No limit on how many.
        </p>
      </div>

      {wallet.balance > 0 && (
        <p className="ticket text-brand-dark">
          {naira(wallet.balance)} waiting for your next order
        </p>
      )}

      <a
        href={message}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary block w-full text-center"
      >
        Share on WhatsApp
      </a>

      {/* The link in full underneath, for anywhere that is not WhatsApp.
          Shown rather than hidden behind a copy button that half the
          browsers on campus will not do anything with. */}
      <p className="break-all text-center text-xs text-muted">{link}</p>

      {brought.length > 0 && (
        <div className="border-t border-black/10 pt-3">
          <p className="ticket mb-2 text-muted">
            {brought.length} {brought.length === 1 ? "friend" : "friends"} so far
          </p>
          <ul className="space-y-1 text-sm">
            {brought.map((one, at) => (
              <li key={`${one.at}-${at}`} className="flex justify-between gap-3">
                <span className="truncate">{one.friend}</span>
                <span className="shrink-0 font-semibold">
                  +{naira(one.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
