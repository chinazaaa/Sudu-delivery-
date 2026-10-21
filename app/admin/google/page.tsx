import Link from "next/link";

import ActionButton from "@/components/ActionButton";
import PageHeader from "@/components/admin/PageHeader";
import Panel from "@/components/admin/Panel";
import SaveButton from "@/components/SaveButton";
import Stars from "@/components/Stars";
import { getSettings, googleLinks } from "@/lib/settings";
import { bandSays, keyOf } from "@/lib/says";
import { addQuote, leadWith, lowerSay, raiseSay, removeQuote, saveQuote, saveScore } from "./actions";

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
  // One list, exactly as the home page draws it.
  const band = await bandSays(settings.google_quotes);
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
          <SaveButton look="btn-admin">Save</SaveButton>
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
            <ActionButton className="btn-admin" done="Added ✓">Add it</ActionButton>
          </div>
        </form>
      </Panel>

      {/* One list, in the band's own order, because the band is one row.
          Two panels could each be ordered and neither could put a review
          from the other half above its own. */}
      <Panel
        title={`On the site${band.length > 0 ? ` · ${band.length}` : ""}`}
        detail={
          <>
            Left to right on the home page, in this order. Reviews from{" "}
            <Link href="/admin/reviews" className="font-semibold text-brand">
              Reviews
            </Link>{" "}
            are shown first name only and are edited beside the order they
            came from; the ones you typed can be edited here.
          </>
        }
      >
        {band.length === 0 ? (
          <p className="text-sm text-muted">
            Nothing yet. Add one above, or open{" "}
            <Link href="/admin/reviews" className="font-semibold text-brand">
              Reviews
            </Link>{" "}
            and press &ldquo;Put on the site&rdquo; under one worth showing.
          </p>
        ) : (
          <ul className="space-y-3">
            {band.map((one, at) => {
              const key = keyOf(one);
              return (
                <li key={key} className="rounded-xl bg-black/[0.03] p-3">
                  {one.from === "typed" ? (
                    <form action={saveQuote} className="space-y-2">
                      <input type="hidden" name="at" value={one.at} />
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
                        <SaveButton look="btn-admin">Save</SaveButton>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-sm">{one.said}</p>
                      {one.who !== "" && (
                        <span className="text-xs text-muted">{one.who}</span>
                      )}
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-black/5 pt-2">
                    <Stars out={one.stars} size={13} />
                    <span className="ticket text-[10px] text-muted">
                      {one.from === "typed" ? "Typed in" : "From an order"}
                    </span>
                    {/* Up and down for a nudge, front for the one that
                        should lead: with nine reviews, getting the best one
                        to the top is eight presses otherwise. */}
                    <span className="ml-auto flex items-center gap-3">
                      {at > 0 && (
                        <form action={raiseSay}>
                          <input type="hidden" name="key" value={key} />
                          <ActionButton
                            className="text-xs font-semibold text-brand"
                            doneClassName="text-mint"
                            busy="…"
                            done="Moved"
                          >
                            Up
                          </ActionButton>
                        </form>
                      )}
                      {at < band.length - 1 && (
                        <form action={lowerSay}>
                          <input type="hidden" name="key" value={key} />
                          <ActionButton
                            className="text-xs font-semibold text-brand"
                            doneClassName="text-mint"
                            busy="…"
                            done="Moved"
                          >
                            Down
                          </ActionButton>
                        </form>
                      )}
                      {at > 0 && (
                        <form action={leadWith}>
                          <input type="hidden" name="key" value={key} />
                          <ActionButton
                            className="text-xs font-semibold text-muted"
                            doneClassName="text-mint"
                            busy="…"
                            done="Moved"
                          >
                            To the front
                          </ActionButton>
                        </form>
                      )}
                      {one.from === "typed" && (
                        <form action={removeQuote}>
                          <input type="hidden" name="at" value={one.at} />
                          <ActionButton
                            className="text-xs font-semibold text-red-700"
                            doneClassName="text-mint"
                            busy="…"
                            done="Deleted"
                          >
                            Delete
                          </ActionButton>
                        </form>
                      )}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
