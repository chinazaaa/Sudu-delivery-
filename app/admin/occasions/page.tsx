import Link from "next/link";

import { allBoxes, allOccasions, foodCatalogue } from "@/lib/box-admin";
import { readLines } from "@/lib/boxes";
import { openBatches } from "@/lib/batches";
import { runDateLabel, whenLabel } from "@/lib/time";
import { SLOT_LABEL } from "@/lib/config";
import { naira } from "@/lib/money";
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
          <Link href="/occasions" className="font-semibold text-brand">
            /occasions
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
                        · {box.serves || "no size said"} · delivery{" "}
                        {naira(box.run_fee)} / {naira(box.car_fee)}
                        {box.active ? "" : " · off"}
                      </span>
                    </summary>
                    <div className="mt-3">
                      <BoxForm
                        box={{ ...box, lines: readLines(box.lines) }}
                        occasionId={row.id}
                        catalogue={catalogue}
                      />
                      <form action={removeBox} className="mt-3 border-t border-black/5 pt-3">
                        <input type="hidden" name="id" value={box.id} />
                        <button className="text-sm font-semibold text-red-700">
                          Delete this box
                        </button>
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
                    <button className="text-sm font-semibold text-red-700">
                      Delete it, and every box in it
                    </button>
                  </form>
                </div>
              </details>
            </article>
          );
        })}

        {occasions.length === 0 && (
          <p className="card text-sm text-muted">
            Nothing yet. Add one above and it appears at /collections or
            /occasions, whichever shelf you put it on.
          </p>
        )}
      </div>
    </div>
  );
}
