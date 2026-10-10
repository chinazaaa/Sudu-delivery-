import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import StockSearch from "@/components/admin/StockSearch";
import ActionButton from "@/components/admin/ActionButton";
import Thumb from "@/components/Thumb";
import Empty from "@/components/Empty";
import { db } from "@/lib/supabase";
import { naira } from "@/lib/money";
import { setItemStock } from "../actions";

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
 * worse than not searching at all.
 *
 * The board gives the box the whole top of the screen rather than a corner of
 * it, because the box is the page: this is used standing at a counter with
 * one hand, and everything under it is the answer to what was typed.
 */
export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; changed?: string }>;
}) {
  const said = await searchParams;
  const asked = (said.q ?? "").trim();
  const changed = (said.changed ?? "").trim();

  const picked = db()
    .from("menu_items")
    .select("id, name, price_food, image_url, available, restaurant_id, restaurants!inner(name, kind)");

  // Nothing typed yet, so the page opens on the other half of the job: what
  // is switched off right now, which is the list somebody comes here to put
  // back on after a delivery lands.
  const { data } = asked
    ? await picked
        .ilike("name", `%${asked}%`)
        .order("available", { ascending: true })
        .order("name")
        .limit(MOST)
    : await picked
        .eq("available", false)
        .order("name")
        .limit(MOST);

  const rows = (data ?? []) as unknown as Row[];

  // The thing the last tap changed, read by name rather than remembered, so
  // the page can say what happened to it and offer to put it back.
  const { data: justDone } = changed
    ? await db()
        .from("menu_items")
        .select("id, name, available, price_food, restaurant_id, restaurants!inner(name)")
        .eq("id", changed)
        .maybeSingle()
    : { data: null };
  const last = justDone as unknown as Row | null;

  const { count: offNow } = await db()
    .from("menu_items")
    .select("id", { count: "exact", head: true })
    .eq("available", false);

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

      <div className="card mb-3.5 space-y-3 p-3.5 sm:p-4">
        <StockSearch start={asked} />

        {/* The way out of a search, and the count of what is off right now
            in the same tap. Clearing the box by hand on a phone is four
            taps and a keyboard; this is one. */}
        {asked !== "" && (
          <Link href="/admin/stock" className="pill-admin min-h-[44px]">
            Switched off
            <span className="font-mono opacity-60">{offNow ?? 0}</span>
          </Link>
        )}

        <p className="text-sm text-muted">
          {asked === "" ? (
            <>
              {offNow === 0
                ? "Nothing is switched off. Type a name to take something off sale."
                : `${offNow} item${offNow === 1 ? " is" : "s are"} switched off right now.` +
                  " Type a name to find anything else."}
            </>
          ) : (
            <>
              {rows.length === 0
                ? "Nothing by that name."
                : `${rows.length}${rows.length === MOST ? "+" : ""} match${
                    rows.length === 1 ? "" : "es"
                  }. Tap the pill to switch one over.`}
            </>
          )}
        </p>
      </div>

      {/* Why the empty list is the useful one: kitchens restock overnight,
          so the first job of the morning is putting back what yesterday
          took off. */}
      {asked === "" && (offNow ?? 0) > 0 && (
        <div className="soft mb-3.5 border-volt-line bg-brand-tint p-3.5">
          <p className="text-sm font-bold">
            {offNow} switched off right now
          </p>
          <p className="hint mt-1">
            Kitchens restock overnight. Put back whatever is in again before
            the run opens, and the shop stops showing it as sold out.
          </p>
        </div>
      )}

      {rows.length === 0 && asked !== "" && (
        <Empty icon="bag" title="Nothing by that name" href="/admin/menu" action="Open Restaurants">
          Try a shorter word. The search looks at the item&apos;s own name, not
          the restaurant&apos;s, so &quot;jollof&quot; finds it wherever it is
          cooked.
        </Empty>
      )}

      <ul className="space-y-2.5">
        {rows.map((item) => (
          <li key={item.id} className="card flex min-h-[62px] items-center gap-3 p-3">
            <span className="size-[42px] shrink-0 overflow-hidden rounded-[9px] border-[1.5px] border-line">
              <Thumb src={item.image_url ?? ""} name={item.name} rounded="rounded-none" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14.5px] font-semibold leading-[1.25]">
                {item.name}
              </span>
              <span className="hint block truncate">
                {/* Which kitchen, because the whole point of this page is not
                    having to know that before you start. */}
                {item.restaurants?.name ?? "—"}
                {item.price_food > 0 ? ` · ${naira(item.price_food)}` : " · no price yet"}
              </span>
            </span>

            {/* The way back to everything else about this item: its price, its
                photograph, its choices. One tap is the common case, not the
                only one. */}
            <Link
              href={`/admin/menu/${item.restaurant_id}#item-${item.id}`}
              className="btn-admin btn-admin-sm shrink-0 px-2.5"
            >
              Edit
            </Link>

            <form action={setItemStock} className="shrink-0">
              <input type="hidden" name="item_id" value={item.id} />
              <input type="hidden" name="q" value={asked} />
              <input
                type="hidden"
                name="available"
                value={item.available ? "false" : "true"}
              />
              <ActionButton
                busy="…"
                done="Switched ✓"
                // Nothing with no price may go on sale: the menu prints a
                // zero rather than hiding it, so that is free food on the
                // website. Said here rather than left as a tap that appears
                // to do nothing.
                disabled={!item.available && item.price_food <= 0}
                title={
                  !item.available && item.price_food <= 0
                    ? "Give it a price before it can go on sale"
                    : undefined
                }
                // Stays a word and not only a colour, because this is read
                // in sunlight at a counter, which is where colour alone
                // fails. Mint is on sale, the neutral wash is off.
                className={`btn-admin w-[94px] shrink-0 px-2.5 text-[13px] disabled:opacity-40 ${
                  item.available
                    ? "bg-mint-tint text-mint hover:bg-mint-tint"
                    : "bg-wash text-muted hover:bg-wash"
                }`}
              >
                {item.available ? "On sale" : "Sold out"}
              </ActionButton>
            </form>
          </li>
        ))}
      </ul>

      {rows.length > 0 && (
        <p className="hint mt-3 leading-[1.5]">
          Switching is instant: there is no save button and no going back to a
          list. Edit opens the item where it lives, for its price, its
          photograph and its choices.
        </p>
      )}
    </div>
  );
}
