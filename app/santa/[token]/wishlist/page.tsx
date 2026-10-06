import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentCustomer } from "@/lib/customer-auth";
import { naira } from "@/lib/money";
import { runDateLabel } from "@/lib/time";
import SantaHero from "@/components/SantaHero";
import { MOST_WISHES, memberIn, roomByToken, wishesOf, type Wish } from "@/lib/santa";
import {
  addWishAction,
  editWishAction,
  hostelAction,
  removeWishAction,
} from "../../actions";
import { hostelNames } from "@/lib/hostels";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your wishlist",
  description: "What you would like, for whoever draws your name.",
  robots: { index: false, follow: false },
};

/**
 * Your own list, on its own page.
 *
 * It was a section on the room page, under the money and the list of who
 * had joined, which is the wrong place for the one thing somebody comes
 * back to four times. A room is read once a week; a wishlist is edited the
 * evening you remember the thing you actually wanted.
 *
 * It also lets the form breathe. Squeezed into the room it was a title, a
 * link, a price and a file picker stacked under three other cards, and a
 * picture nobody noticed they could add.
 */
export default async function WishlistPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ problem?: string }>;
}) {
  const { token } = await params;
  const { problem } = await searchParams;

  const room = await roomByToken(token);
  if (!room) notFound();

  const phone = await currentCustomer();
  if (!phone) redirect(`/orders?next=${encodeURIComponent(`/santa/${token}/wishlist`)}`);

  const me = await memberIn(room.id, phone);
  // Not in this room: there is nothing here for them, and the room page is
  // where joining happens.
  if (!me || me.leftAt) redirect(`/santa/${token}`);

  const [mine, hostels] = await Promise.all([wishesOf(me.id), hostelNames()]);
  const shut = room.status !== "open";

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      {/* At the top as well as the bottom. The way out of a page should not
        * be something you scroll a list of five things to reach. */}
      <p className="mb-3">
        <Link className="text-sm font-semibold text-brand" href={`/santa/${token}`}>
          ‹ Back to the room
        </Link>
      </p>

      <SantaHero
        kicker={room.name}
        title="Your wishlist"
        chips={[
          `${mine.length} of ${MOST_WISHES}`,
          shut ? "locked" : `edit until ${runDateLabel(room.closeDate)}`,
          `${naira(room.budget)} budget`,
        ]}
      />

      {problem ? (
        <p className="card mt-4 border-brand/30 bg-brand/5 font-semibold text-brand">
          {problem}
        </p>
      ) : null}

      {!me.hostel ? (
        <p className="card mt-4 border-brand/30 bg-brand/5 text-sm font-semibold text-brand">
          <a href="#where">Say which block your gift goes to</a>, or we cannot
          deliver it.
        </p>
      ) : null}

      <p className="mt-4 text-muted">
        Three to five things, so whoever draws you has a choice. Keep them near{" "}
        {naira(room.budget)}: anything over and they have to pay the difference,
        so they will probably pick something else.
      </p>

      {shut ? (
        <p className="card mt-5 text-muted">
          The room has closed, so lists cannot change now.
        </p>
      ) : mine.length < MOST_WISHES ? (
        <form id="add" action={addWishAction} className="card mt-5 space-y-4">
          <input type="hidden" name="token" value={token} />
          <h2 className="font-bold">Add something</h2>

          <div>
            <label className="label" htmlFor="title">
              What is it?
            </label>
            <input
              id="title"
              name="title"
              className="field"
              placeholder="Maison Margiela perfume"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="photo">
              A picture
            </label>
            <input id="photo" name="photo" className="field" type="file" accept="image/*" />
            <p className="mt-1.5 text-sm text-muted">
              A screenshot is usually the clearest way to say which one.
            </p>
          </div>

          <div>
            <label className="label" htmlFor="note">
              A link, or how to know it is the right one
            </label>
            <input
              id="note"
              name="note"
              className="field"
              placeholder="Replica, Jazz Club. 30ml is fine"
            />
          </div>

          <div>
            <label className="label" htmlFor="estPrice">
              What you think it costs
            </label>
            <input
              id="estPrice"
              name="estPrice"
              className="field"
              type="number"
              min={0}
              step={500}
            />
          </div>

          <button type="submit" className="btn-primary w-full">
            Add to my list
          </button>
        </form>
      ) : (
        <p className="card mt-5 text-muted">
          That is {MOST_WISHES}, which is plenty. Remove one to add another.
        </p>
      )}

      {mine.length > 0 ? (
        <ul id="list" className="mt-5 space-y-3">
          {mine.map((one: Wish) => (
            <li key={one.id} className="card">
              <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {one.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={one.photoUrl}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-shell text-xl">
                    🎁
                  </span>
                )}
                <div>
                  <p className="font-bold">{one.title}</p>
                  {one.note ? <p className="text-sm text-muted">{one.note}</p> : null}
                  {one.estPrice > 0 ? (
                    <p className="text-sm text-muted">
                      about {naira(one.estPrice)}
                      {one.estPrice > room.budget ? (
                        <span className="font-semibold text-brand">
                          {" "}
                          · over the {naira(room.budget)} budget
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                </div>
              </div>

              {shut ? null : (
                <form action={removeWishAction}>
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="wishId" value={one.id} />
                  <button type="submit" className="text-sm font-semibold text-brand">
                    Remove
                  </button>
                </form>
              )}
              </div>

              {/* Changing it, rather than removing and starting again:
                * that loses the picture and the place in the list, and "I
                * typed the wrong size" should not cost somebody both. */}
              {shut ? null : (
                <details className="mt-3 border-t pt-3">
                  <summary className="cursor-pointer text-sm font-semibold text-muted">
                    Edit
                  </summary>
                  <form action={editWishAction} className="mt-3 space-y-3">
                    <input type="hidden" name="token" value={token} />
                    <input type="hidden" name="wishId" value={one.id} />
                    <div>
                      <label className="label">What is it?</label>
                      <input
                        name="title"
                        className="field"
                        defaultValue={one.title}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">A link, or how to know it is right</label>
                      <input name="note" className="field" defaultValue={one.note} />
                    </div>
                    <div>
                      <label className="label">What you think it costs</label>
                      <input
                        name="estPrice"
                        className="field"
                        type="number"
                        min={0}
                        step={500}
                        defaultValue={one.estPrice || ""}
                      />
                    </div>
                    <div>
                      <label className="label">
                        {one.photoUrl ? "Replace the picture" : "Add a picture"}
                      </label>
                      <input name="photo" className="field" type="file" accept="image/*" />
                      {one.photoUrl ? (
                        <p className="mt-1.5 text-sm text-muted">
                          Leave it empty to keep the one you have.
                        </p>
                      ) : null}
                    </div>
                    <button type="submit" className="btn-primary w-full">
                      Save changes
                    </button>
                  </form>
                </details>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="card mt-5 text-muted">
          Nothing on your list yet. Whoever draws you has to pick from it, so
          it is worth writing before the room closes.
        </p>
      )}

      {/* Where their own gift is delivered. Nothing anywhere said this,
        * which is a hole that only shows up on the day: ten gifts in a car
        * and no block written against any of them. */}
      <form id="where" action={hostelAction} className="card mt-5 space-y-3">
        <input type="hidden" name="token" value={token} />
        <h2 className="font-bold">Where your gift goes</h2>
        <p className="text-sm text-muted">
          Only read when we are driving your gift to you, and never shown to
          whoever drew you. If they choose to hand it over themselves we take
          it to them instead, so your block is not used at all.
        </p>
        <div>
          <label className="label" htmlFor="hostel">
            Your block
          </label>
          {/* The real list, the same as checkout uses. Free text was
            * letting people invent a block nobody drives to. The text box
            * stays only for a shop that has not filled its hostels in. */}
          {hostels.length > 0 ? (
            <select id="hostel" name="hostel" className="field" defaultValue={me.hostel}>
              <option value="">Pick your block</option>
              {hostels.map((one) => (
                <option key={one} value={one}>
                  {one}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="hostel"
              name="hostel"
              className="field"
              defaultValue={me.hostel}
              placeholder="Queen Mary"
            />
          )}
        </div>
        <button type="submit" className="btn-quiet w-full">
          {me.hostel ? "Change it" : "Save"}
        </button>
        {!me.hostel ? (
          <p className="text-sm font-semibold text-brand">
            We cannot deliver your gift without this.
          </p>
        ) : null}
      </form>

      <p className="mt-6">
        <Link className="font-semibold text-brand" href={`/santa/${token}`}>
          Back to the room
        </Link>
      </p>
    </div>
  );
}
