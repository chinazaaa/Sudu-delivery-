import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import { feedback } from "@/lib/analytics";
import { runDateLabel } from "@/lib/time";

export const dynamic = "force-dynamic";

const RANGES = [28, 90, 365] as const;

/**
 * Everything customers said, in one place.
 *
 * Analytics shows the shape of it beside the other numbers. This is the page
 * for reading them: every answer, worst first, because a five star with
 * nothing written needs nothing from you and a two star with a sentence needs
 * you today.
 */
export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; only?: string }>;
}) {
  const params = await searchParams;
  const asked = Number(params.days);
  const days = RANGES.includes(asked as (typeof RANGES)[number]) ? asked : 28;
  const onlyWritten = params.only === "written";

  const said = await feedback(days);
  const rows = onlyWritten ? said.all.filter((one) => one.feedback.trim() !== "") : said.all;

  // Worst first. A page sorted by date buries the one thing that needed doing
  // under a week of people saying it was fine.
  const sorted = [...rows].sort(
    (a, b) => a.rating - b.rating || new Date(b.when).getTime() - new Date(a.when).getTime()
  );

  const unhappy = said.all.filter((one) => one.rating <= 2).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reviews"
        detail="What people said about their food, once it had arrived."
        actions={
          <span className="flex flex-wrap gap-2">
            {RANGES.map((range) => (
              <Link
                key={range}
                href={`/admin/reviews?days=${range}${onlyWritten ? "&only=written" : ""}`}
                className={`chip py-1.5 text-xs ${
                  range === days ? "border-ink bg-ink text-white" : "border-black/10 bg-white"
                }`}
              >
                {range === 365 ? "All time" : `${range} days`}
              </Link>
            ))}
            <Link
              href={`/admin/reviews?days=${days}${onlyWritten ? "" : "&only=written"}`}
              className={`chip py-1.5 text-xs ${
                onlyWritten ? "border-brand bg-brand text-white" : "border-black/10 bg-white"
              }`}
            >
              With a comment
            </Link>
          </span>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Average" value={said.average === null ? "—" : String(said.average)} hint="Out of 5" />
        <Stat label="Answers" value={said.count} hint={`Last ${days} days`} />
        <Stat
          label="Unhappy"
          value={unhappy}
          tone={unhappy > 0 ? "warn" : "good"}
          hint="Two stars or fewer"
        />
        <Stat
          label="With a comment"
          value={said.all.filter((one) => one.feedback.trim() !== "").length}
          hint="Worth reading"
        />
      </div>

      {sorted.length === 0 ? (
        <p className="card text-sm text-muted">
          Nothing yet. The stars appear on a customer&apos;s order page once their run
          has been marked handed out, so there is nothing to read until a run has
          been delivered.
        </p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((one) => (
            <li
              key={one.id}
              className={`card ${one.rating <= 2 ? "border-l-4 border-brand" : ""}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="flex items-baseline gap-2">
                  <span
                    className={`font-bold ${one.rating <= 2 ? "text-brand-dark" : "text-ink"}`}
                  >
                    {"★".repeat(one.rating)}
                    <span className="text-black/20">{"★".repeat(5 - one.rating)}</span>
                  </span>
                  <span className="font-semibold">{one.name}</span>
                </span>
                <span className="flex shrink-0 items-baseline gap-3 text-xs text-muted">
                  <span>{one.run}</span>
                  <span>{runDateLabel(one.when.slice(0, 10))}</span>
                  <Link
                    href={`/admin/orders/${one.id}`}
                    className="font-semibold text-brand"
                  >
                    {one.ref || "Open"}
                  </Link>
                </span>
              </div>
              {one.feedback.trim() !== "" && (
                <p className="mt-1 text-sm text-ink/80">{one.feedback}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
