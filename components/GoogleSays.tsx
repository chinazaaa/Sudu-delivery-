import Stars from "./Stars";
import SaysRail from "./SaysRail";
import type { GoogleQuote } from "@/lib/settings";

/**
 * What the campus says, on Volt.
 *
 * Every number and every word on this band is one the shop typed in off its
 * own Google profile. Nothing is fetched and nothing is generated: a review
 * somebody did not write is the one thing on this site that would be worth
 * taking the whole site down over.
 *
 * Which is why it disappears rather than degrades. No rating set and the
 * numbers go; no quotes pasted and the cards go; neither, and all that is
 * left is the button asking for the first one. The band itself only shows
 * once there is a profile to send anybody to.
 */
export default function GoogleSays({
  profile,
  review,
  rating,
  count,
  quotes,
}: {
  profile: string;
  review: string;
  /** Out of five. Zero means nothing is shown. */
  rating: number;
  count: number;
  quotes: GoogleQuote[];
}) {
  if (profile === "" && review === "") return null;
  const scored = rating > 0 && count >= ENOUGH_REVIEWS;

  return (
    <section className="bleed border-y-2 border-ink bg-volt">
      <div className="shell flex flex-col gap-8 py-12 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-3">
            <span className="ticket">Reviews on Google</span>
            <h2 className="section-title">What PAU says</h2>

            {scored && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-display text-[56px] font-black leading-none sm:text-[64px]">
                  {rating.toFixed(1)}
                </span>
                <Stars out={rating} size={26} />
                {count > 0 && (
                  <span className="font-semibold">
                    {count} Google review{count === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {review !== "" && (
              <a
                href={review}
                target="_blank"
                rel="noopener noreferrer"
                className="btn border-2 border-ink bg-ink text-white shadow-[4px_4px_0_#e5321d] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_#e5321d]"
              >
                Leave a review
              </a>
            )}
            {profile !== "" && (
              <a
                href={profile}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-quiet"
              >
                See us on Google
              </a>
            )}
          </div>
        </div>

        {/* One row that scrolls, rather than a grid that grows down the
            page. At three reviews there was no difference; at nine the grid
            was three rows of cards and the band stopped being something you
            glance at on the way past. */}
        <SaysRail quotes={quotes} />
      </div>
    </section>
  );
}

/**
 * The rating as one chip, for a row of badges at the top of a page.
 *
 * Nothing at all until there is a rating, because "★ on Google" with no
 * number is an advert for a thing nobody has said yet.
 */
/**
 * How many reviews a score needs before the score is worth saying.
 *
 * Four point nine from ten reads thinner than saying nothing: a number that
 * small invites the reader to work out that ten people have been asked, and
 * a shop that volunteers how few have spoken is arguing against itself. The
 * quotes underneath do not have this problem, because one person saying a
 * true thing is one person saying a true thing however many others did.
 *
 * It comes back on its own. Nothing to remember and nothing to undo: the
 * day the count passes this, the badge is there.
 */
export const ENOUGH_REVIEWS = 25;

export function GoogleChip({
  rating,
  count,
  href,
}: {
  rating: number;
  count: number;
  href: string;
}) {
  if (rating <= 0 || href === "") return null;
  // Too few to be worth quoting a score from. See ENOUGH_REVIEWS.
  if (count < ENOUGH_REVIEWS) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="ticket flex items-center gap-1.5 border-2 border-ink px-2.5 py-1.5"
    >
      <Stars out={rating} size={13} />
      {rating.toFixed(1)} on Google
      {count > 0 ? ` · ${count} reviews` : ""}
    </a>
  );
}
