import Link from "next/link";
import { naira } from "@/lib/money";
import type { Slot } from "@/lib/same-day";

/**
 * "Order now, get it by four."
 *
 * The thing worth saying at the top of a shop is when the food arrives. A run
 * is cheaper and still there underneath, but somebody hungry now wants a time,
 * not a timetable, so the soonest time we can actually hit leads the page.
 *
 * The hour is worked out on the server from the real clock: it takes three
 * hours to fetch food and drive it over, so the soonest is three hours out,
 * and nothing goes out after six.
 */
export default function SameDayStrip({
  soonest,
  from,
}: {
  soonest: Slot;
  /** The cheapest it can be, as the admin has priced it. */
  from: number;
}) {
  const hours = Math.round((new Date(soonest.at).getTime() - Date.now()) / 3_600_000);

  return (
    <Link
      href="/checkout"
      className="block rounded-2xl border-2 border-brand/30 bg-brand-tint px-4 py-3 transition active:scale-[0.99]"
    >
      <p className="text-xs font-extrabold uppercase tracking-wide text-brand-dark">
        {soonest.day === "today" ? "Want it today?" : "Everything today has gone"}
      </p>
      <p className="mt-0.5 text-lg font-extrabold text-ink">
        Order now, get it by {soonest.label}
      </p>
      <p className="mt-0.5 text-sm text-ink/75">
        {soonest.day === "today"
          ? `About ${hours} hour${hours === 1 ? "" : "s"} from now, to your block.`
          : "Nothing goes out after 6pm, so the soonest is tomorrow."}{" "}
        From <span className="font-bold">{naira(from)}</span> for a
        car to yourself, or wait for a run and share one.
      </p>
    </Link>
  );
}
