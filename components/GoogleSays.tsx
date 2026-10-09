import Stars from "./Stars";
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
  const scored = rating > 0;

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

        {quotes.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quotes.map((one) => (
              <li
                key={one.said}
                className="flex flex-col gap-3 rounded-2xl border-2 border-ink bg-paper p-5"
              >
                <Stars />
                <blockquote className="text-[17px] leading-relaxed">
                  &ldquo;{one.said}&rdquo;
                </blockquote>
                {one.who !== "" && (
                  <span className="ticket mt-auto text-muted">{one.who}</span>
                )}
              </li>
            ))}
          </ul>
        )}
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
