import Link from "next/link";

import PageHeader from "@/components/admin/PageHeader";
import Jump from "@/components/admin/Jump";
import Stat from "@/components/admin/Stat";
import { board, type Badge } from "@/lib/achievements";
import { naira } from "@/lib/money";
import { lagosStamp, lagosToday } from "@/lib/time";

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
export default async function AchievementsPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; show?: string; when?: string }>;
}) {
  const asked = await searchParams;
  const { badges, earned, next } = await board();
  const got = (one: Badge) => one.when !== "";

  // The families, in the order the board puts them, so the chips read the
  // same way round as the list under them. Eighteen of them is more than a
  // page anybody scans, and "how is the kitchen money doing" should not
  // mean reading past the hostels to find out.
  const families = [...new Set(badges.map((one) => one.group))];
  const family = families.includes(asked.group ?? "") ? asked.group! : "";
  const show = asked.show === "locked" || asked.show === "earned" ? asked.show : "";

  // Which month a badge was earned in, on the shop's clock rather than the
  // browser's: somebody reading this at half midnight is still in the day
  // the shop is in.
  const monthOf = (iso: string) => (iso === "" ? "" : lagosToday(new Date(iso)).slice(0, 7));
  const thisMonth = lagosToday().slice(0, 7);

  // Every month that has anything in it, newest first, each carrying its
  // own count. "Ten in September, twenty in October" is the question, so
  // the answer is on the chips rather than behind them.
  // The month we are in is always on the list, even with nothing in it yet.
  // Built only from months that have something, the first of November shows
  // October at the top and no way to ask "what have we done this month",
  // which is the question.
  const months = [
    ...new Set([
      thisMonth,
      ...badges.map((one) => monthOf(one.when)).filter(Boolean),
    ]),
  ]
    .sort()
    .reverse()
    .map((key) => ({
      key,
      many: badges.filter((one) => monthOf(one.when) === key).length,
      said: new Date(`${key}-01T12:00:00Z`).toLocaleDateString("en-NG", {
        month: "short",
        year: "numeric",
      }),
    }));

  const when = months.some((one) => one.key === asked.when) ? asked.when! : "";
  const wanted = when;

  const thisCount = badges.filter((one) => monthOf(one.when) === thisMonth).length;

  const shown = badges
    .filter((one) => family === "" || one.group === family)
    .filter((one) =>
      show === "" ? true : show === "earned" ? got(one) : !got(one)
    )
    // A month is a question about what was earned, so a locked badge has no
    // answer to it and is not shown while one is picked.
    .filter((one) => wanted === "" || monthOf(one.when) === wanted);

  // Every chip keeps whatever else is set, so picking a family does not
  // silently drop "locked only".
  const to = (next: { group?: string; show?: string; when?: string }) => {
    const bits = new URLSearchParams();
    const g = next.group ?? family;
    const h = next.show ?? show;
    const w = next.when ?? when;
    if (g) bits.set("group", g);
    if (h) bits.set("show", h);
    if (w) bits.set("when", w);
    const query = bits.toString();
    return query === "" ? "/admin/achievements" : `/admin/achievements?${query}`;
  };

  const Chip = ({
    href,
    on,
    children,
  }: {
    href: string;
    on: boolean;
    children: React.ReactNode;
  }) => (
    <Link
      href={href}
      className={`chip py-1.5 text-xs ${
        on ? "border-ink bg-ink text-white" : "border-black/10 bg-white"
      }`}
    >
      {children}
    </Link>
  );

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

      {/* Earned and locked first, because "what is left" is the question
          this page gets asked most, then the families. */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Chip href={to({ show: "" })} on={show === ""}>
          All
        </Chip>
        <Chip href={to({ show: "earned" })} on={show === "earned"}>
          Earned
        </Chip>
        <Chip href={to({ show: "locked" })} on={show === "locked"}>
          Still to get
        </Chip>
      </div>

      {/* Two dropdowns rather than two dozen chips. Eighteen families drew
          eight rows of buttons above the thing they were filtering, which
          is a menu pretending to be a toolbar. The month keeps its count in
          the option, because that is the answer and not a step towards it. */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Jump
          label="Family"
          value={to({ group: family })}
          options={[
            { href: to({ group: "" }), said: "Everything" },
            ...families.map((one) => ({ href: to({ group: one }), said: one })),
          ]}
        />
        <Jump
          label="Month"
          value={to({ when })}
          options={[
            { href: to({ when: "" }), said: "Any month" },
            ...months.map((one) => ({
              href: to({ when: one.key }),
              said: `${one.said} · ${one.many}`,
            })),
          ]}
        />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Earned" value={`${earned}/${badges.length}`} hint="On the board" />
        <Stat label="This month" value={thisCount} hint="Badges earned" />
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

      {shown.length === 0 ? (
        <p className="card text-sm text-muted">
          {when === ""
            ? "Nothing here under that filter."
            : `Nothing was earned in ${
                months.find((one) => one.key === when)?.said ?? "that month"
              }${family === "" ? "" : ` under ${family}`}.`}
        </p>
      ) : (
      <ul className="space-y-2">
        {shown.map((one) => {
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
                    {one.peak ? (
                      <>
                        Best so far {say(one.got, one.unit)} ·{" "}
                        {say(one.goal - one.got, one.unit)} more in one
                      </>
                    ) : (
                      <>
                        {say(one.got, one.unit)} of {say(one.goal, one.unit)} ·{" "}
                        {say(one.goal - one.got, one.unit)} to go
                      </>
                    )}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      )}
    </div>
  );
}

/** A figure in the unit it was counted in. */
function say(many: number, unit: Badge["unit"]): string {
  if (unit === "money") return naira(many);
  return many.toLocaleString("en-NG");
}
