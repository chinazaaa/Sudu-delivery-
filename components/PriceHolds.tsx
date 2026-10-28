import { weekdayLabel, runDateLabel } from "@/lib/time";

/**
 * "Today's price holds until the 30th."
 *
 * The one reason to buy a hamper now that costs the shop nothing and is
 * true: rice, oil and milk climb through December in Lagos every year, and
 * a hamper bought in November is packed at November prices. Saying so is
 * worth more than any discount, because a discount comes off a hamper that
 * was going to sell anyway.
 *
 * It is a promise, so it is only ever shown where one has been made: no
 * date set, nothing said. And it stops the moment the day passes, rather
 * than sitting there in January still promising November.
 */
export default function PriceHolds({
  until,
  today,
}: {
  /** The last day the price is promised, as YYYY-MM-DD. Null says nothing. */
  until: string | null;
  /** Today in Lagos, worked out on the server: a phone's clock is anybody's
   *  guess and this one decides whether a promise is still open. */
  today: string;
}) {
  if (!until) return null;
  const day = until.slice(0, 10);
  if (day < today) return null;

  // How many days are left, so the last week reads as the last week. Both
  // are plain Lagos dates, so this is calendar days and not hours.
  const left = Math.round(
    (new Date(`${day}T12:00:00Z`).getTime() - new Date(`${today}T12:00:00Z`).getTime()) /
      86_400_000
  );

  const when =
    left === 0
      ? "today"
      : left === 1
        ? "tomorrow"
        : `${weekdayLabel(day)}, ${runDateLabel(day)}`;

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border-2 border-ink bg-volt px-3 py-2.5 text-[15px] font-semibold text-ink">
      <span>
        Today&apos;s price holds until {when}. Order before then and this is
        what you pay, whatever the market does in December.
      </span>
      {left <= 7 && left > 1 && (
        <span className="ticket bg-ink px-2 py-1 text-volt">
          {left} days left
        </span>
      )}
    </p>
  );
}
