import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import { board, type Badge } from "@/lib/achievements";
import { naira } from "@/lib/money";
import { lagosStamp } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * What the shop has done, as a board of things to beat.
 *
 * Every other page in admin is about the thing in front of you: the run
 * that closes at two, the order nobody has paid for. This is the only one
 * about the whole of it, and it is here because a shop that is three years
 * in looks exactly like a shop that is three weeks in from the inside, and
 * that is a lie worth correcting on a bad Tuesday.
 *
 * Nothing is stored. Every figure is counted off the orders when the page
 * is opened, so a refund takes a badge back the way it should.
 */
export default async function AchievementsPage() {
  const { badges, earned, next } = await board();
  const got = (one: Badge) => one.when !== "";

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Achievements"
        detail={
          next
            ? `${earned} of ${badges.length}. Next up: ${next.name}.`
            : `All ${badges.length}. There is nothing left on this board.`
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Earned" value={`${earned}/${badges.length}`} hint="On the board" />
        <Stat
          label="Next"
          value={next ? say(next.goal, next.unit) : "—"}
          hint={next ? next.name : "All done"}
        />
        <Stat
          label="Closest"
          value={next ? `${Math.floor((next.got / next.goal) * 100)}%` : "100%"}
          hint={next ? `${say(next.got, next.unit)} so far` : ""}
        />
      </div>

      <ul className="space-y-2">
        {badges.map((one) => {
          const done = got(one);
          const part = Math.min(1, one.goal === 0 ? 1 : one.got / one.goal);

          return (
            <li
              key={one.id}
              className={`card ${done ? "border-l-4 border-mint" : ""}`}
            >
              {/* The family stays on the right beside the name rather than
                  wrapping under it: it is a label, and a label that takes a
                  line to itself reads as a heading. */}
              <div className="flex items-baseline justify-between gap-2">
                <span className="flex min-w-0 items-baseline gap-2">
                  {/* Earned or not, said with a mark rather than a colour
                      alone: the board is read on a phone in daylight. */}
                  <span
                    className={`grid size-5 flex-none place-items-center rounded-full text-[11px] font-black ${
                      done ? "bg-mint text-ink" : "bg-black/10 text-muted"
                    }`}
                    aria-hidden
                  >
                    {done ? "✓" : "🔒"}
                  </span>
                  <span className={`font-bold ${done ? "" : "text-muted"}`}>
                    {one.name}
                  </span>
                </span>
                <span className="ticket flex-none text-[10px] text-muted">
                  {one.group}
                </span>
              </div>

              <p className="mt-0.5 pl-7 text-sm text-muted">{one.what}</p>

              {/* The day it happened, which is the part worth keeping. Said
                  as a date alone where the books only hold the day: profit
                  is a run's takings less what that run cost, settled later,
                  so it has no minute of its own and pretending otherwise
                  would be inventing one. */}
              {done && (
                <p className="mt-1 pl-7 text-xs font-semibold text-ink/70">
                  Earned {lagosStamp(one.when, one.exact)}
                </p>
              )}

              {/* The bar is the whole point of a locked one, and noise on an
                  earned one, which has already said what it took. */}
              {!done && (
                <div className="mt-2 pl-7">
                  <div className="h-2 overflow-hidden rounded-full bg-black/10">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${Math.max(2, part * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {say(one.got, one.unit)} of {say(one.goal, one.unit)} ·{" "}
                    {say(one.goal - one.got, one.unit)} to go
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** A figure in the unit it was counted in. */
function say(many: number, unit: Badge["unit"]): string {
  if (unit === "money") return naira(many);
  return many.toLocaleString("en-NG");
}
