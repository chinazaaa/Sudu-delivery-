import Link from "next/link";

import { liveOccasions, boxesOf, isTimed } from "@/lib/boxes";
import { whenLabel } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * Everything the shop has already packed for you.
 *
 * The home page is the only signpost this shop has: no footer, no menu bar,
 * nobody arriving by search. So this page has to be reachable from there and
 * has to say what it is in its first line.
 */
export default async function OccasionsPage() {
  const occasions = await liveOccasions();
  const counts = await Promise.all(
    occasions.map(async (one) => (await boxesOf(one.id)).filter((b) => !b.is_extra).length)
  );

  const worth = occasions.filter((_, index) => counts[index] > 0);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Ordering for something</h1>
        <p className="mt-1 text-muted">
          Food for a room full of people, already worked out. One price with
          delivery in it, and nothing to decide but when you want it.
        </p>
      </div>

      {worth.length === 0 ? (
        <p className="card text-sm text-muted">
          Nothing is packed just now. The menu is where everything lives in the
          meantime.{" "}
          <Link href="/" className="font-semibold text-brand">
            See what is on
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-3">
          {worth.map((one) => (
            <li key={one.id}>
              <Link
                href={`/occasions/${one.slug}`}
                className="card block transition active:scale-[0.99]"
              >
                <p className="text-lg font-extrabold">{one.name}</p>
                {one.blurb !== "" && (
                  <p className="mt-0.5 text-sm text-muted">{one.blurb}</p>
                )}
                {isTimed(one) && one.happens_at && (
                  <p className="mt-1 text-sm font-semibold text-brand">
                    {one.when_word} {whenLabel(one.happens_at)}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Where the builder goes when it exists. Named now so the shape of
          the page does not have to change to make room for it later. */}
      <p className="text-sm text-muted">
        None of these quite right? Everything on the menu is still there, and
        you can put your own together.{" "}
        <Link href="/" className="font-semibold text-brand">
          Order normally
        </Link>
        .
      </p>
    </div>
  );
}
