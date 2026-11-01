import { naira } from "@/lib/money";
import { REFERRAL_REWARD, shareText } from "@/lib/referrals";

/**
 * Bring a friend, on the page somebody is actually looking at.
 *
 * The full card lives on their orders page, which is a page people open
 * when they already have a reason to. This is the one they refresh while
 * their dinner is on the road, and the one they land on the moment they
 * have ordered: the two moments in the whole shop when somebody is both
 * pleased and holding their phone.
 *
 * Slimmer than the card on purpose. That one has a balance and a list of
 * who they brought in, which is a thing to read; this is a thing to tap,
 * and it sits under an order somebody opened to find out where their food
 * is rather than over it.
 *
 * Only ever on their own order. The link is theirs to send, the reward is
 * theirs to earn, and a parent reading their son's order page is not the
 * person this is addressed to.
 */
export default function ReferralStrip({
  code,
  site,
  welcome = "",
}: {
  code: string;
  site: string;
  welcome?: string;
}) {
  if (code === "") return null;

  const message = `https://wa.me/?text=${encodeURIComponent(
    shareText(code, site, welcome)
  )}`;

  return (
    <div className="card flex flex-wrap items-center justify-between gap-3">
      <span className="min-w-0">
        <span className="block font-bold">Bring a friend</span>
        <span className="block text-sm text-muted">
          {welcome === "" ? "" : `They get ${welcome} on their first order. `}
          You get {naira(REFERRAL_REWARD)} off your food when it arrives.
        </span>
      </span>
      <a
        href={message}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary shrink-0"
      >
        Share
      </a>
    </div>
  );
}
