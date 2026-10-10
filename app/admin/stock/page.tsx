import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import StockSearch from "@/components/admin/StockSearch";
import ActionButton from "@/components/admin/ActionButton";
import ConfirmButton from "@/components/admin/ConfirmButton";
import Thumb from "@/components/Thumb";
import Empty from "@/components/Empty";
import { db } from "@/lib/supabase";
import { naira } from "@/lib/money";
import { setItemStock } from "../actions";
import { putBackOnSale } from "./actions";

export const dynamic = "force-dynamic";

/** Enough to find what you meant without becoming a page to scroll. */
const MOST = 60;

type Row = {
  id: string;
  name: string;
  price_food: number;
  image_url: string | null;
  available: boolean;
  restaurant_id: string;
  restaurants: { name: string; kind: string | null } | null;
};

/**
 * The four things the board puts above the list, each with its own count.
 *
 * "Everything" carries no number on purpose: the design system says a count
 * there is only the total said twice.
 */
const VIEWS = [
  { key: "off", label: "Switched off", counted: true },
  { key: "on", label: "On sale", counted: true },
  { key: "nophoto", label: "No photo", counted: true },
  { key: "noprice", label: "No price", counted: true },
  { key: "all", label: "Everything", counted: false },
] as const;

type View = (typeof VIEWS)[number]["key"];

/**
 * One filter, applied to whichever query is being built.
 *
 * Written once and handed both the row query and the count queries, because
 * a filter whose pill counts one thing and whose list shows another is worse
 * than no count at all.
 *
 * "No photo" tests for the empty string rather than for null as well: the
 * column is declared `not null default ''`, so an item without a picture has
 * an empty one, and an `or` with a null arm would be a second thing to be
 * wrong.
 */
function onlyThe<
  Query extends {
    eq(column: string, value: boolean | number | string): Query;
    lte(column: string, value: number): Query;
  },
>(query: Query, view: View): Query {
  switch (view) {
    case "off":
      return query.eq("available", false);
    case "on":
      return query.eq("available", true);
    case "nophoto":
      return query.eq("image_url", "");
    case "noprice":
      return query.lte("price_food", 0);
    default:
      return query;
  }
}

/**
 * Switching one thing off, without knowing where it lives.
 *
 * Taking an item off sale used to mean: Restaurants, find the right
 * restaurant, open it, scroll or filter its menu, then tap. Four steps and a
 * guess, at the counter, with somebody waiting. And the guess is the hard
 * part: the person who knows the kitchen has run out of jollof is not
 * necessarily the person who remembers which of the kitchens it was.
 *
 * So this asks for the name and nothing else. Every kitchen, the shop and the
 * shelf, all searched together, each row carrying the restaurant it belongs to
 * and one tap to switch it.
 *
 * The search is done by the database rather than in the browser, because
 * there are thousands of items: pulling them all through to filter here would
 * hit the thousand-row cap and quietly search a sample of the menu, which is
 * worse than not searching at all. The filter counts are asked of the
 * database for the same reason, and they count inside whatever has been
 * typed, so a search for jollof is told how many jollofs are off rather than
 * how many items are off everywhere.
 *
 * The board gives the box the whole top of the screen rather than a corner of
 * it, because the box is the page: this is used standing at a counter with
 * one hand, and everything under it is the answer to what was typed.
 */
export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; changed?: string; show?: string; put?: string }>;
}) {
  const said = await searchParams;
  const asked = (said.q ?? "").trim();
  const changed = (said.changed ?? "").trim();
  const put = Number(said.put ?? "");

  // With nothing typed the page opens on the other half of the job: what is
  // switched off right now, which is the list somebody comes here to put back
  // on after a delivery lands. With something typed it opens on everything by
  // that name, because narrowing a search before seeing it hides the answer.
  const resting: View = asked === "" ? "off" : "all";
  const view: View =
    VIEWS.find((one) => one.key === said.show)?.key ?? resting;

  let rows$ = db()
    .from("menu_items")
    .select("id, name, price_food, image_url, available, restaurant_id, restaurants!inner(name, kind)");
  if (asked !== "") rows$ = rows$.ilike("name", `%${asked}%`);
  rows$ = onlyThe(rows$, view);

  // Off first inside a search, because that is the half of the list somebody
  // is usually hunting through. A single filter is already all one state, so
  // there it is only the name.
  const { data } =
    view === "all"
      ? await rows$.order("available", { ascending: true }).order("name").limit(MOST)
      : await rows$.order("name").limit(MOST);

  const rows = (data ?? []) as unknown as Row[];

  const [counts, restockable, offAll, justDone] = await Promise.all([
    // One head count per pill. They are counts rather than lengths because
    // the list itself stops at sixty, and a pill that says sixty when there
    // are two hundred is a lie the page tells every morning.
    Promise.all(
      VIEWS.filter((one) => one.counted).map(async (one) => {
        let count$ = db()
          .from("menu_items")
          .select("id", { count: "exact", head: true });
        if (asked !== "") count$ = count$.ilike("name", `%${asked}%`);
        const { count } = await onlyThe(count$, one.key);
        return [one.key, count ?? 0] as const;
      })
    ),

    // What the restock card can actually act on: off, and with a price, which
    // is the same test its button writes with.
    db()
      .from("menu_items")
      .select("id", { count: "exact", head: true })
      .eq("available", false)
      .gt("price_food", 0)
      .then(({ count }) => count ?? 0),

    // Everything off anywhere, ignoring the search, for the way out of one.
    db()
      .from("menu_items")
      .select("id", { count: "exact", head: true })
      .eq("available", false)
      .then(({ count }) => count ?? 0),

    // The thing the last tap changed, read by name rather than remembered, so
    // the page can say what happened to it and offer to put it back.
    changed
      ? db()
          .from("menu_items")
          .select("id, name, available, price_food, restaurant_id, restaurants!inner(name)")
          .eq("id", changed)
          .maybeSingle()
          .then(({ data: one }) => one)
      : Promise.resolve(null),
  ]);

  const counted = new Map<View, number>(counts);
  const last = justDone as unknown as Row | null;

  /** A filter, keeping whatever was typed. The resting view carries no
   *  parameter, so the plain address is still the plain page. */
  const link = (wanted: View): string => {
    const next = new URLSearchParams();
    if (asked !== "") next.set("q", asked);
    if (wanted !== resting) next.set("show", wanted);
    const query = next.toString();
    return query === "" ? "/admin/stock" : `/admin/stock?${query}`;
  };

  return (
    <div>
      <PageHeader
        title="Stock"
        detail="Anything on sale anywhere. Switch it off without opening its restaurant first."
        backHref="/admin/menu"
        backLabel="Restaurants"
      />

      {/* What the last tap did, in words, with the way back. There is no
          "are you sure" on this page on purpose: it is built to be fast, and
          a confirmation people tap through teaches nothing. Being told what
          you changed, and being able to undo it, is the thing that was
          actually missing. */}
      {last && (
        <div
          className={`card mb-3.5 flex flex-wrap items-center gap-3 border-l-[6px] p-3.5 sm:p-4 ${
            last.available ? "border-l-mint" : "border-l-amber"
          }`}
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">
              {last.available ? "Put back on sale" : "Taken off sale"}
            </span>
            <span className="block truncate text-sm text-muted">
              {last.name} · {last.restaurants?.name ?? ""}
            </span>
          </span>

          <form action={setItemStock} className="shrink-0">
            <input type="hidden" name="item_id" value={last.id} />
            <input type="hidden" name="q" value={asked} />
            <input type="hidden" name="show" value={view} />
            <input
              type="hidden"
              name="available"
              value={last.available ? "false" : "true"}
            />
            <ActionButton busy="…" done="Undone ✓" className="btn-admin">
              Undo
            </ActionButton>
          </form>
        </div>
      )}

      {/* The bulk one, which has no undo, so it is told plainly rather than
          offered a button that cannot do anything. */}
      {said.put !== undefined && (
        <div className="card mb-3.5 border-l-[6px] border-l-mint p-3.5 sm:p-4">
          <p className="text-sm font-bold">
            {put > 0 ? `${put} put back on sale` : "Nothing left to put back"}
          </p>
          <p className="hint mt-1">
            {put > 0
              ? "All at once, so there is nothing to undo in one tap. Anything that should still be off can be switched off in the list below."
              : "Everything that was off and had a price is already on sale, so this changed nothing."}
          </p>
        </div>
      )}

      <div className="card mb-3.5 space-y-3 p-3.5 sm:p-4">
        <StockSearch start={asked} />

        {/* The way out of a search, and the count of what is off right now
            in the same tap. Clearing the box by hand on a phone is four
            taps and a keyboard; this is one. It says "all" because the
            pills under this box count inside the search and this one
            counts the whole shop. */}
        {asked !== "" && (
          <Link href="/admin/stock" className="pill-admin min-h-[44px]">
            All switched off
            <span className="font-mono opacity-60">{offAll}</span>
          </Link>
        )}

        <p className="text-sm text-muted">
          {asked === "" ? (
            <>
              {offAll === 0
                ? "Nothing is switched off. Type a name to take something off sale."
                : `${offAll} item${offAll === 1 ? " is" : "s are"} switched off right now.` +
                  " Type a name to find anything else."}
            </>
          ) : (
            <>
              {rows.length === 0
                ? "Nothing by that name."
                : `${rows.length}${rows.length === MOST ? "+" : ""} match${
                    rows.length === 1 ? "" : "es"
                  }. Tap the switch to put one on or off.`}
            </>
          )}
        </p>
      </div>

      {/*
       * Sideways on a phone, wrapped from `sm`.
       *
       * Five of these do not fit three hundred and ninety pixels, and wrapped
       * they are two rows of pills above the first item, which is half the
       * screen gone before anything worth reading. The bleed is the page's
       * own padding undone, so the row scrolls to the edge of the glass
       * rather than stopping short and looking like it ended.
       */}
      <div className="no-scrollbar -mx-4 mb-3.5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        {VIEWS.map((one) => (
          <Link
            key={one.key}
            href={link(one.key)}
            aria-current={view === one.key ? "page" : undefined}
            className={`pill-admin shrink-0 ${view === one.key ? "pill-admin-on" : ""}`}
          >
            {one.label}
            {one.counted && (
              <span className="font-mono opacity-60">{counted.get(one.key) ?? 0}</span>
            )}
          </Link>
        ))}
      </div>

      {/*
       * The real job of the page: putting back what yesterday took off.
       *
       * The board's card says "4 switched off yesterday", and the table
       * cannot say that. `menu_items` records whether an item is available
       * and nothing about when that last changed, so "yesterday" would be a
       * date this page made up. It counts what is off right now instead, and
       * says so, which is the same morning job described honestly.
       *
       * The count is the priced ones only, because that is exactly what the
       * button can move: an item with no price may not go on sale at all.
       */}
      {asked === "" && restockable > 0 && (
        <div className="soft mb-3.5 flex flex-wrap items-center gap-3 border-volt-line bg-brand-tint p-3.5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">
              {restockable} switched off, ready to go back
            </p>
            <p className="hint mt-1">
              Kitchens restock overnight. Put them back before the run opens.
              Nothing records when an item went off, so this is everything off
              right now rather than only yesterday&apos;s. Turn on puts all{" "}
              {restockable} back on sale in one go, and there is no undo for
              the lot.
            </p>
            {view !== "off" && (
              <Link
                href={link("off")}
                className="hint mt-1 inline-block font-semibold text-ink underline"
              >
                See just those
              </Link>
            )}
          </div>

          {/* Asks first, because this is the one control on the page that
              changes hundreds of rows the customer can see. The sentence
              above is the warning; the button is only the second tap. */}
          <form action={putBackOnSale} className="shrink-0">
            <input type="hidden" name="q" value={asked} />
            <ConfirmButton tone="admin" confirm={`Yes, turn on ${restockable}`}>
              Turn on
            </ConfirmButton>
          </form>
        </div>
      )}

      {rows.length === 0 && asked !== "" && (
        <Empty icon="bag" title="Nothing by that name" href="/admin/menu" action="Open Restaurants">
          Try a shorter word. The search looks at the item&apos;s own name, not
          the restaurant&apos;s, so &quot;jollof&quot; finds it wherever it is
          cooked.
        </Empty>
      )}

      {rows.length === 0 && asked === "" && said.show !== undefined && (
        <Empty icon="bag" title="Nothing in here" href="/admin/menu" action="Open Restaurants">
          No item matches that filter. Try Everything, or type a name.
        </Empty>
      )}

      <ul className="space-y-2.5">
        {rows.map((item) => {
          // Nothing with no price may go on sale: the menu prints a zero
          // rather than hiding it, so that is free food on the website. Said
          // on the control rather than left as a tap that appears to do
          // nothing.
          const stuck = !item.available && item.price_food <= 0;

          return (
            <li
              key={item.id}
              /* Wraps on a phone and stays one line from `sm`. The board's row
                 is the picture, the name and the switch, and the owner's Edit
                 is a fourth thing in a space that was already only three
                 hundred and thirty pixels wide: side by side they left the
                 name about seven characters before the ellipsis. So on a
                 phone the two controls drop under the name, where both keep a
                 forty-four pixel target and the name keeps the row. */
              className="card flex min-h-[62px] flex-wrap items-center gap-x-3 gap-y-2 p-3"
            >
              <span className="size-[42px] shrink-0 overflow-hidden rounded-[9px] border-[1.5px] border-line">
                <Thumb src={item.image_url ?? ""} name={item.name} rounded="rounded-none" />
              </span>

              <span className="min-w-[8rem] flex-1">
                <span className="block truncate text-[14.5px] font-semibold leading-[1.25]">
                  {item.name}
                </span>
                <span className="hint block truncate">
                  {/* Which kitchen, because the whole point of this page is
                      not having to know that before you start. */}
                  {item.restaurants?.name ?? "—"}
                  {/* A price of nothing is said in words. A zero in the
                      money column reads as free, which is the one thing it
                      must not say. */}
                  {item.price_food > 0 ? ` · ${naira(item.price_food)}` : " · no price yet"}
                </span>
              </span>

              <span className="ml-auto flex shrink-0 items-center gap-2">
                {/* The owner's extra. Item editing already lives on the
                    restaurant's own page, with the price, the photograph and
                    the choices on it, so this opens that item there rather
                    than growing a second half-editor here. The anchor is a
                    name that page already draws, so it lands on the row and
                    not at the top of two hundred. */}
                <Link
                  href={`/admin/menu/${item.restaurant_id}#item-${item.id}`}
                  className="btn-admin btn-admin-sm px-2.5"
                >
                  Edit
                </Link>

                <form action={setItemStock}>
                  <input type="hidden" name="item_id" value={item.id} />
                  <input type="hidden" name="q" value={asked} />
                  {/* The cut being worked down, so switching one item off
                      lands back in the same list rather than the resting
                      one. */}
                  <input type="hidden" name="show" value={view} />
                  <input
                    type="hidden"
                    name="available"
                    value={item.available ? "false" : "true"}
                  />
                  {/*
                   * The board's switch, with the word kept.
                   *
                   * A switch whose only state is a colour fails the design
                   * system's fourth rule and fails in sunlight, which is
                   * where this page is used, so the state is also said in
                   * words beside it. The track is marked `aria-hidden` and
                   * the button carries `role="switch"` with `aria-checked`,
                   * so a screen reader hears the item's name, that it is a
                   * switch, and which way it is set, once rather than twice.
                   *
                   * Still one tap through the same server action as before:
                   * no save button and no going back to a list. That action
                   * hands back the search and the item it changed and not the
                   * filter, so a tap inside "No photo" lands back on the
                   * resting view; putting the filter back needs one line in
                   * the admin actions file, which this page may not edit.
                   */}
                  <ActionButton
                    busy="…"
                    done="Done ✓"
                    role="switch"
                    aria-checked={item.available}
                    aria-label={item.name}
                    disabled={stuck}
                    title={stuck ? "Give it a price before it can go on sale" : undefined}
                    className="btn-admin btn-admin-sm w-[108px] justify-end gap-2 border-transparent bg-transparent px-0 hover:bg-transparent disabled:opacity-40"
                  >
                    <span className="text-[13px] font-bold">
                      {item.available ? "On sale" : "Sold out"}
                    </span>
                    <span
                      aria-hidden
                      className={`relative block h-[27px] w-[46px] shrink-0 rounded-full transition-colors ${
                        item.available ? "bg-mint" : "bg-line"
                      }`}
                    >
                      <span
                        className={`absolute top-[3px] block size-[21px] rounded-full bg-paper transition-all ${
                          item.available ? "left-[22px]" : "left-[3px]"
                        }`}
                      />
                    </span>
                  </ActionButton>
                </form>
              </span>
            </li>
          );
        })}
      </ul>

      {rows.length > 0 && (
        <p className="hint mt-3 leading-[1.5]">
          Green is on sale. Toggling is instant, no save button and no going
          back to a list. Edit opens the item where it lives, for its price,
          its photograph and its choices.
        </p>
      )}
    </div>
  );
}
