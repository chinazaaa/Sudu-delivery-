import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import { naira } from "@/lib/money";
import { runDateLabel } from "@/lib/time";
import { rooms, wishLines, type WishLine } from "@/lib/santa-admin";
import { saveWishPlan } from "../actions";

export const dynamic = "force-dynamic";

/**
 * Every wishlist, on one page.
 *
 * Pricing is a sitting, not something done a line at a time while reading a
 * room: an hour with all of it in front of you, filtered down to what still
 * has no price against it. That is what this page is for, and it is why the
 * room page no longer carries the form.
 *
 * What is chosen comes first, because somebody is already waiting on it.
 * Then what has no price. A wish nobody drew is still worth pricing: it is
 * on four other lists in spirit, and the things that take a week to find
 * are knowable in November.
 */

type Show = "" | "toprice" | "priced" | "picked" | "unpicked" | "over" | "nosource";

const LABELS: { key: Show; label: string }[] = [
  { key: "", label: "Everything" },
  { key: "toprice", label: "No price yet" },
  { key: "priced", label: "Priced" },
  { key: "picked", label: "Somebody chose it" },
  { key: "unpicked", label: "Nobody chose it" },
  { key: "over", label: "Over the budget" },
  { key: "nosource", label: "No shop written down" },
];

function keep(one: WishLine, show: Show): boolean {
  if (show === "toprice") return !one.priced;
  if (show === "priced") return one.priced;
  if (show === "picked") return one.chosenBy !== "";
  if (show === "unpicked") return one.chosenBy === "";
  if (show === "over") return one.overBudget;
  if (show === "nosource") return one.source.trim() === "";
  return true;
}

export default async function SantaWishlistsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; room?: string; show?: string }>;
}) {
  const query = await searchParams;
  const [all, open] = await Promise.all([wishLines(), rooms()]);

  const q = (query.q ?? "").trim().toLowerCase();
  const room = (query.room ?? "").trim();
  const show = (query.show ?? "") as Show;

  // One box for everything somebody might type: the thing, the person, their
  // number, their block, or the shop it comes from. Nobody remembers which
  // box a word belongs in.
  const shown = all.filter((one) => {
    if (room !== "" && one.roomId !== room) return false;
    if (!keep(one, show)) return false;
    if (q === "") return true;
    return [one.title, one.note, one.owner, one.ownerPhone, one.ownerHostel, one.source, one.chosenBy]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  const priced = shown.filter((one) => one.priced);
  const margin = priced.reduce((sum, one) => sum + (one.sellPrice - one.costPrice), 0);
  const filtered = q !== "" || room !== "" || show !== "";

  return (
    <div>
      <PageHeader
        title="Wishlists"
        detail="Every line of every list, with what it costs us, what we charge and where it comes from. Price the chosen ones first."
        backHref="/admin/santa"
        backLabel="Secret Santa"
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Lines" value={shown.length} />
        <Stat label="Priced" value={priced.length} tone="good" />
        <Stat label="Still to price" value={shown.length - priced.length} />
        <Stat label="Margin on priced" value={margin} money />
      </div>

      <form className="mb-4 flex flex-wrap gap-2" action="/admin/santa/wishlists">
        <input
          name="q"
          defaultValue={query.q ?? ""}
          placeholder="Thing, person, number, block or shop"
          className="field grow py-2 text-sm sm:max-w-xs"
        />
        {open.length > 1 ? (
          <select name="room" defaultValue={room} className="field py-2 text-sm sm:w-56">
            <option value="">Every room</option>
            {open.map((one) => (
              <option key={one.id} value={one.id}>
                {one.name}
              </option>
            ))}
          </select>
        ) : null}
        <select name="show" defaultValue={show} className="field py-2 text-sm sm:w-56">
          {LABELS.map((one) => (
            <option key={one.key} value={one.key}>
              {one.label}
            </option>
          ))}
        </select>
        <button className="btn-quiet px-4 py-2 text-sm">Search</button>
        {filtered ? (
          <a href="/admin/santa/wishlists" className="btn-quiet px-4 py-2 text-sm">
            Clear
          </a>
        ) : null}
      </form>

      {shown.length === 0 ? (
        <p className="card text-muted">
          {all.length === 0
            ? "Nobody has written a list yet. They appear here the moment somebody adds something."
            : "Nothing matches that."}
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((one) => (
            <li key={one.id} className="card">
              <div className="flex items-start gap-3">
                {one.photos.length > 0 ? (
                  <span className="flex shrink-0 gap-1">
                    {one.photos.map((shot) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={shot}
                        src={shot}
                        alt=""
                        className="h-20 w-20 rounded-xl object-cover"
                      />
                    ))}
                  </span>
                ) : (
                  <span className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-shell text-2xl">
                    🎁
                  </span>
                )}

                <div className="min-w-0 grow">
                  <p className="font-bold">
                    {one.title}
                    {one.itemId ? (
                      <span className="ml-2 chip border-mint/40 bg-mint/10 py-0.5 text-xs text-mint">
                        ours
                      </span>
                    ) : null}
                  </p>
                  {one.note ? (
                    <p className="break-words text-sm text-muted">{one.note}</p>
                  ) : null}

                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                    <span className="font-semibold text-ink">{one.owner}</span>
                    <span>{one.ownerPhone}</span>
                    {one.ownerHostel ? (
                      <span>{one.ownerHostel}</span>
                    ) : (
                      <span className="font-semibold text-brand">no block</span>
                    )}
                    <span>·</span>
                    <Link className="underline" href={`/santa/${one.shareToken}`}>
                      {one.roomName}
                    </Link>
                    <span>{naira(one.budget)} budget</span>
                    <span>exchanged {runDateLabel(one.exchangeDate)}</span>
                  </p>

                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    {one.estPrice > 0 ? (
                      <span className={one.overBudget ? "font-semibold text-brand" : "text-muted"}>
                        they guessed {naira(one.estPrice)}
                        {one.overBudget ? " · over budget" : ""}
                      </span>
                    ) : (
                      <span className="text-muted">no guess at the price</span>
                    )}
                    {one.chosenBy ? (
                      <span className="chip border-mint/40 bg-mint/10 py-0.5 text-mint">
                        {one.chosenBy} chose this
                      </span>
                    ) : null}
                    {!one.ownerPaid ? (
                      <span className="chip border-brand/40 bg-brand/10 py-0.5 text-brand">
                        not paid
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>

              {/* The shop's side. One row, wide, with room to type the shop:
                * "Balogun, second floor" is the half of this that saves an
                * afternoon, and it was in a box too narrow to read. */}
              <form action={saveWishPlan} className="mt-3 border-t pt-3">
                <input type="hidden" name="wishId" value={one.id} />
                <div className="grid gap-3 sm:grid-cols-[8rem_8rem_1fr_auto] sm:items-end">
                  <div>
                    <label className="label text-xs">Costs us</label>
                    <input
                      name="costPrice"
                      className="field py-1.5 text-sm"
                      type="number"
                      min={0}
                      defaultValue={one.costPrice || ""}
                    />
                  </div>
                  <div>
                    <label className="label text-xs">We charge</label>
                    <input
                      name="sellPrice"
                      className="field py-1.5 text-sm"
                      type="number"
                      min={0}
                      defaultValue={one.sellPrice || ""}
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Where from</label>
                    <input
                      name="source"
                      className="field py-1.5 text-sm"
                      defaultValue={one.source}
                      placeholder="Balogun, second floor"
                    />
                  </div>
                  <button className="btn-quiet px-4 py-1.5 text-sm">Save</button>
                </div>
                {one.priced ? (
                  <p
                    className={
                      one.sellPrice - one.costPrice >= 0
                        ? "mt-2 text-xs font-semibold text-mint"
                        : "mt-2 text-xs font-semibold text-brand"
                    }
                  >
                    {naira(one.sellPrice - one.costPrice)} margin
                    {one.sellPrice > one.budget
                      ? ` · ${naira(one.sellPrice - one.budget)} over what they paid, so the buyer is asked`
                      : ""}
                  </p>
                ) : null}
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
