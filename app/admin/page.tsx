import Link from "next/link";
import Diagnostic from "@/components/Diagnostic";
import { batchOverview } from "@/lib/admin";
import { diagnoseEmpty, keyKind } from "@/lib/health";
import { ensureUpcomingBatches, closeExpiredBatches } from "@/lib/batches";
import { createBatch } from "./actions";
import { BATCH_MINIMUM, SLOT_LABEL } from "@/lib/config";
import { clockLabel, runDateLabel } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  let problem: Awaited<ReturnType<typeof diagnoseEmpty>> | null = null;
  let batches: Awaited<ReturnType<typeof batchOverview>> = [];

  try {
    await ensureUpcomingBatches();
    await closeExpiredBatches();
    batches = await batchOverview();
    if (batches.length === 0) problem = await diagnoseEmpty();
  } catch (error) {
    // A blocked write usually means the wrong key, so say that rather than
    // repeating a Postgres permission message at someone deploying a site.
    problem =
      keyKind() === "public"
        ? await diagnoseEmpty()
        : {
            ok: false,
            title: "Could not reach the database",
            detail: error instanceof Error ? error.message : String(error),
          };
  }

  const thisWeek = batches.filter((b) => b.status !== "cancelled");
  const weekTotal = thisWeek.reduce((total, b) => total + b.orderCount, 0);

  return (
    <div className="space-y-4">
      <section className="card">
        <h1 className="text-lg font-semibold">Runs</h1>
        <p className="text-sm text-ink/60">
          {weekTotal} order{weekTotal === 1 ? "" : "s"} across the batches below.
          Minimum is {BATCH_MINIMUM} per batch.
        </p>
      </section>

      <details className="card">
        <summary className="cursor-pointer font-semibold">Create a run</summary>
        <p className="mt-1 text-sm text-ink/60">
          Fridays open themselves. Use this for any other day, including exam week
          and late-night runs.
        </p>
        <form action={createBatch} className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="grow">
              <label className="label" htmlFor="run_date">Day</label>
              <input id="run_date" name="run_date" type="date" required className="field" />
            </div>
            <div className="w-36">
              <label className="label" htmlFor="cut_off_time">Orders close</label>
              <input
                id="cut_off_time"
                name="cut_off_time"
                type="time"
                defaultValue="12:00"
                required
                className="field"
              />
            </div>
            <div className="w-40">
              <label className="label" htmlFor="slot">Which batch</label>
              <select id="slot" name="slot" className="field" defaultValue="afternoon">
                <option value="afternoon">Afternoon</option>
                <option value="night">Night</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="delivery_window_text">
              What customers are told
            </label>
            <input
              id="delivery_window_text"
              name="delivery_window_text"
              placeholder="On campus ~2:00pm"
              className="field"
            />
          </div>
          <button className="btn-primary">Create run</button>
          <p className="text-xs text-ink/50">
            Times are Lagos time. A day can hold one afternoon and one night batch;
            creating the same one again updates it.
          </p>
        </form>
      </details>

      <ul className="space-y-2">
        {batches.map((batch) => {
          const short = batch.paidCount < BATCH_MINIMUM;
          return (
            <li key={batch.id}>
              <Link
                href={`/admin/batch/${batch.id}`}
                className="card flex items-center justify-between hover:border-brand"
              >
                <div>
                  <p className="font-medium">
                    {runDateLabel(batch.run_date)} · {SLOT_LABEL[batch.slot]}
                  </p>
                  <p className="text-sm text-ink/60">
                    Cut-off {clockLabel(batch.cut_off_at)} · {batch.status}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${short ? "text-brand" : "text-green-700"}`}>
                    {batch.paidCount}/{BATCH_MINIMUM}
                  </p>
                  <p className="text-xs text-ink/50">
                    {batch.orderCount - batch.paidCount} unpaid
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {problem && !problem.ok && (
        <Diagnostic title={problem.title} detail={problem.detail} />
      )}
    </div>
  );
}
