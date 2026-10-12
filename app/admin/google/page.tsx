import Link from "next/link";

import PageHeader from "@/components/admin/PageHeader";
import Panel from "@/components/admin/Panel";
import Stars from "@/components/Stars";
import { getSettings, googleLinks, googleQuotes } from "@/lib/settings";
import { addQuote, raiseQuote, removeQuote, saveQuote, saveScore } from "./actions";

export const dynamic = "force-dynamic";

/**
 * The reviews on Google, as the shop copies them across.
 *
 * Their own page rather than three slots buried in Settings. There is no
 * longer a fixed number of them: the shop has more than three and will have
 * more than that, and a page where adding one is a box at the top beats a
 * form where adding a fourth means finding a developer.
 *
 * Nothing here is fetched. Every word is typed in off the profile, which is
 * the whole point: a review nobody wrote is the one thing on this site worth
 * taking the whole site down over.
 */
export default async function GoogleReviewsAdmin() {
  const settings = await getSettings();
  const quotes = googleQuotes(settings.google_quotes);
  const google = googleLinks(settings);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        title="Google reviews"
        detail={
          <>
            The score and the words that go on the home page and on Parents.
            Copied off your profile by hand, word for word. The profile link
            itself lives in{" "}
            <Link href="/admin/settings#find-us" className="font-semibold text-brand">
              Settings
            </Link>
            .
          </>
        }
        actions={
          google.profile ? (
            <a
              href={google.profile}
              target="_blank"
              rel="noopener noreferrer"
              className="chip py-1.5 text-xs"
            >
              Open your profile
            </a>
          ) : null
        }
      />

      <Panel
        title="The score"
        detail="What the profile says today. Empty or 0 and no rating is shown anywhere on the site."
      >
        <form action={saveScore} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <label className="label" htmlFor="google_rating">
              Rating out of 5
            </label>
            <input
              id="google_rating"
              name="google_rating"
              type="number"
              min={0}
              max={5}
              step={0.1}
              defaultValue={settings.google_rating || ""}
              placeholder="4.9"
              className="field"
            />
          </div>
          <div>
            <label className="label" htmlFor="google_reviews">
              How many reviews
            </label>
            <input
              id="google_reviews"
              name="google_reviews"
              type="number"
              min={0}
              defaultValue={settings.google_reviews || ""}
              placeholder="0"
              className="field"
            />
          </div>
          <button className="btn-admin">Save</button>
        </form>
        {settings.google_rating > 0 && (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted">
            <Stars out={settings.google_rating} size={15} />
            Shown as {settings.google_rating.toFixed(1)}
            {settings.google_reviews > 0
              ? ` from ${settings.google_reviews} review${
                  settings.google_reviews === 1 ? "" : "s"
                }`
              : ""}
            .
          </p>
        )}
      </Panel>

      {/* Adding is at the top, because adding is the thing done most often
          and scrolling past everything already there to reach it is the
          wrong way round. */}
      <Panel
        title="Add a review"
        detail="Paste it exactly as they wrote it. Change nothing, not even a typo."
      >
        <form action={addQuote} className="space-y-3">
          <div>
            <label className="label" htmlFor="said">
              What they wrote
            </label>
            <textarea
              id="said"
              name="said"
              rows={3}
              required
              placeholder="Paste it exactly as they wrote it"
              className="field"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
            <div>
              <label className="label" htmlFor="who">
                Who said it
              </label>
              <input id="who" name="who" placeholder="Temi" className="field" />
            </div>
            <div>
              <label className="label" htmlFor="stars">
                Stars
              </label>
              <select id="stars" name="stars" defaultValue="5" className="field">
                {[5, 4, 3, 2, 1].map((many) => (
                  <option key={many} value={many}>
                    {many} star{many === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn-admin">Add it</button>
          </div>
        </form>
      </Panel>

      <Panel
        title={`On the site${quotes.length > 0 ? ` · ${quotes.length}` : ""}`}
        detail="In this order, top left first. Every one of them shows; there is no limit."
      >
        {quotes.length === 0 ? (
          <p className="text-sm text-muted">
            None yet. Add one above and it appears on the home page and on
            Parents, under the score.
          </p>
        ) : (
          <ul className="space-y-3">
            {quotes.map((one, at) => (
              <li key={`${at}-${one.said}`} className="rounded-xl bg-black/[0.03] p-3">
                <form action={saveQuote} className="space-y-2">
                  <input type="hidden" name="at" value={at} />
                  <textarea
                    name="said"
                    rows={2}
                    defaultValue={one.said}
                    className="field"
                    aria-label={`Review ${at + 1}`}
                  />
                  <div className="grid gap-2 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
                    <input
                      name="who"
                      defaultValue={one.who}
                      placeholder="Who said it"
                      className="field"
                      aria-label="Who said it"
                    />
                    <select
                      name="stars"
                      defaultValue={String(one.stars)}
                      className="field"
                      aria-label="Stars"
                    >
                      {[5, 4, 3, 2, 1].map((many) => (
                        <option key={many} value={many}>
                          {many} star{many === 1 ? "" : "s"}
                        </option>
                      ))}
                    </select>
                    <button className="btn-admin">Save</button>
                  </div>
                </form>
                <div className="mt-2 flex items-center gap-4 border-t border-black/5 pt-2">
                  <Stars out={one.stars} size={13} />
                  {at > 0 && (
                    <form action={raiseQuote}>
                      <input type="hidden" name="at" value={at} />
                      <button className="text-xs font-semibold text-brand">Move up</button>
                    </form>
                  )}
                  <form action={removeQuote} className="ml-auto">
                    <input type="hidden" name="at" value={at} />
                    <button className="text-xs font-semibold text-red-700">Delete</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
