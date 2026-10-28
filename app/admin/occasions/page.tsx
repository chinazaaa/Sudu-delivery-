import Link from "next/link";

import { allBoxes, allOccasions, boxPrices, foodCatalogue } from "@/lib/box-admin";
import { readContents, readLines } from "@/lib/boxes";
import { openBatches } from "@/lib/batches";
import { runDateLabel, whenLabel } from "@/lib/time";
import { SLOT_LABEL } from "@/lib/config";
import { naira } from "@/lib/money";
import ActionButton from "@/components/ActionButton";
import OccasionForm from "@/components/admin/OccasionForm";
import BoxForm from "@/components/admin/BoxForm";
import { removeBox, removeOccasion } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Occasions and the boxes in them.
 *
 * Adding is at the top, because adding is the thing done most often and
 * scrolling past everything already there to reach it is the wrong way
 * round.
 */
export default async function AdminOccasionsPage() {
  const [occasions, boxes, catalogue] = await Promise.all([
    allOccasions(),
    allBoxes(),
    foodCatalogue(),
  ]);

  // What each box comes to, because the editor used to show the delivery
  // figure and nothing else: the one number anybody wants, what the
  // customer pays, was not on the screen at all.
  const prices = await boxPrices(boxes as any);

  const runs = (await openBatches(30)).map((one) => ({
    id: one.id,
    label: `${runDateLabel(one.run_date)} · ${
      one.delivery_window_text || SLOT_LABEL[one.slot]
    }`,
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold">Collections and occasions</h1>
        <p className="mt-0.5 text-sm text-muted">
          Boxes you have packed already, at one price with delivery in it. The
          standing ones are at{" "}
          <Link href="/collections" className="font-semibold text-brand">
            /collections
          </Link>{" "}
          and the ones with a date on them at{" "}
          <Link href="/collections" className="font-semibold text-brand">
            /collections
          </Link>
          . Each has its own card on the home page.
        </p>
      </div>

      <details className="card mb-4">
        <summary className="cursor-pointer font-bold text-brand">
          Add a collection or an occasion
        </summary>
        <div className="mt-3">
          <OccasionForm runs={runs} />
        </div>
      </details>

      <div className="space-y-4">
        {occasions.map((row: any) => {
          const mine = boxes.filter((box: any) => box.occasion_id === row.id);

          return (
            <article key={row.id} className="card">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 className="text-lg font-extrabold">{row.name}</h2>
                  <p className="text-sm text-muted">
                    /{row.kind === "occasion" ? "occasions" : "collections"}/
                    {row.slug} · {mine.length}{" "}
                    {mine.length === 1 ? "box" : "boxes"}
                    {row.happens_at &&
                      ` · ${row.when_word} ${whenLabel(row.happens_at)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="chip border-transparent bg-black/5 text-xs font-semibold text-muted">
                    {row.kind === "occasion" ? "occasion" : "collection"}
                  </span>
                  <span
                    className={`chip border-transparent text-xs font-semibold ${
                      row.active ? "bg-mint/20" : "bg-black/5 text-muted"
                    }`}
                  >
                    {row.active ? "on" : "off"}
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {mine.map((box: any) => (
                  <details key={box.id} className="rounded-xl bg-black/[0.03] p-3">
                    <summary className="cursor-pointer text-sm font-semibold">
                      {box.name}
                      <span className="font-normal text-muted">
                        {" "}
                        · {box.serves || "no size said"}
                        {box.active ? "" : " · off"}
                      </span>
                      {/* The sum, written out, because "delivery ₦4,400"
                          on its own answers no question anybody has. The
                          run price is the only one now: a box goes on a
                          run and is not offered a car of its own. */}
                      <span className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs font-normal">
                        <span className="text-muted">
                          {box.package_price == null ? "Food" : "Package"}{" "}
                          {naira(prices.get(box.id)?.food ?? 0)}
                        </span>
                        <span className="text-muted">
                          + delivery {naira(box.run_fee)}
                        </span>
                        <span className="font-bold text-ink">
                          = {naira(prices.get(box.id)?.onARun ?? 0)}
                        </span>
                      </span>
                      {/* A box with something off the menu in it cannot be
                          priced, so the whole shelf it sits on comes back
                          empty. That used to be invisible from here. */}
                      {(prices.get(box.id)?.gone.length ?? 0) > 0 && (
                        <span className="mt-1 block text-xs font-semibold text-red-700">
                          Not on sale: {prices.get(box.id)!.gone.join(", ")}. This box
                          cannot be priced, so the whole shelf hides until it is fixed.
                        </span>
                      )}
                    </summary>
                    <div className="mt-3">
                      <BoxForm
                        box={{
                          ...box,
                          lines: readLines(box.lines),
                          contents: readContents(box.contents),
                        }}
                        occasionId={row.id}
                        catalogue={catalogue}
                      />
                      <form action={removeBox} className="mt-3 border-t border-black/5 pt-3">
                        <input type="hidden" name="id" value={box.id} />
                        <ActionButton
                          className="text-sm font-semibold text-red-700"
                          doneClassName="text-mint"
                          busy="Deleting…"
                          done="Deleted ✓"
                        >
                          Delete this box
                        </ActionButton>
                      </form>
                    </div>
                  </details>
                ))}

                <details className="rounded-xl border border-dashed border-black/15 p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-brand">
                    Add a box to {row.name}
                  </summary>
                  <div className="mt-3">
                    <BoxForm occasionId={row.id} catalogue={catalogue} />
                  </div>
                </details>
              </div>

              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold text-brand">
                  Change this one
                </summary>
                <div className="mt-3">
                  <OccasionForm occasion={row} runs={runs} />
                  <form action={removeOccasion} className="mt-3 border-t border-black/5 pt-3">
                    <input type="hidden" name="id" value={row.id} />
                    <ActionButton
                      className="text-sm font-semibold text-red-700"
                      doneClassName="text-mint"
                      busy="Deleting…"
                      done="Deleted ✓"
                    >
                      Delete it, and every box in it
                    </ActionButton>
                  </form>
                </div>
              </details>
            </article>
          );
        })}

        {occasions.length === 0 && (
          <p className="card text-sm text-muted">
            Nothing yet. Add one above and it appears at /collections or
            /collections, whichever kind you put it on.
          </p>
        )}
      </div>
    </div>
  );
}
