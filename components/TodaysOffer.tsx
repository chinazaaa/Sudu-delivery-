import Link from "next/link";

/**
 * The promotion that is on today, where the eye already is.
 *
 * A flyer goes out on a Friday morning saying pizza and ice cream, two
 * thousand delivery, order before seven. Somebody reads it, taps through,
 * and lands on a headline about outside food and a button that says start
 * an order: nothing on the screen is the thing they came for, and the one
 * line along the very top of the page is a line nobody looks at.
 *
 * So it goes directly above the button, at the size the promise was made
 * at. The counters are named because the offer is pinned to a few of them
 * and a figure on its own reads as the price from anywhere.
 *
 * Only on the days it actually runs, which the server decides. A Friday
 * offer on the screen on a Thursday is the same broken promise pointing
 * the other way.
 */
export default function TodaysOffer({
  badge,
  where,
  said = "",
  href = "/deals",
}: {
  /** "₦2,000 delivery". */
  badge: string;
  /** The counters, already shortened: "Domino's Pizza, Panarottis and 2 more". */
  where: string;
  /** The day it is about: "today", "tomorrow", "on Saturday". The run it
   *  belongs to, not the clock: once tonight's has closed the soonest
   *  food anybody can order is tomorrow's, and saying today sells
   *  something nobody can buy. */
  said?: string;
  href?: string;
}) {
  if (badge === "") return null;

  return (
    <Link
      href={href}
      className="group block rounded-2xl border-2 border-ink bg-volt p-3.5 shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:-translate-y-0.5"
    >
      <span className="ticket block text-ink/70">
        {said === "today" ? "Today only" : said === "" ? "On offer" : said}
      </span>
      <span className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-display text-[min(8vw,2rem)] font-black uppercase leading-none text-ink">
          {badge}
        </span>
      </span>
      {where !== "" && (
        <span className="block pt-1 text-[15px] font-semibold leading-snug text-ink/80">
          {where}
          <span aria-hidden className="pl-1.5 text-ink/50 group-hover:text-ink">
            →
          </span>
        </span>
      )}
    </Link>
  );
}
