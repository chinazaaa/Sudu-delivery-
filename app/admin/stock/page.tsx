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
    <div className="space-y-4">
      <PageHeader
        title="Stock"
        detail="Find anything on sale anywhere and switch it off, without opening its restaurant first."
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
          className={`card flex flex-wrap items-center gap-3 border-l-4 ${
            last.available ? "border-l-mint" : "border-l-amber-500"
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
            <ActionButton busy="…" done="✓" className="btn-quiet px-4 py-2 text-sm">
              Undo
            </ActionButton>
          </form>
        </div>
      )}

      <div className="card space-y-3">
        <StockSearch start={asked} />
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

      {rows.length === 0 && asked !== "" && (
        <Empty icon="bag" title="Nothing by that name" href="/admin/menu" action="Open Restaurants">
          Try a shorter word. The search looks at the item&apos;s own name, not
          the restaurant&apos;s, so &quot;jollof&quot; finds it wherever it is
          cooked.
        </Empty>
      )}

      <ul className="space-y-2">
        {rows.map((item) => (
          <li key={item.id} className="card flex items-center gap-3">
            <span className="size-12 shrink-0 overflow-hidden rounded-xl">
              <Thumb src={item.image_url ?? ""} name={item.name} rounded="rounded-none" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{item.name}</span>
              <span className="block truncate text-sm text-muted">
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
              className="shrink-0 text-xs font-semibold text-muted underline hover:text-ink"
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
                done="✓"
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
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition disabled:opacity-40 ${
                  item.available ? "bg-mint/15 text-mint" : "bg-black/[0.06] text-muted"
                }`}
              >
                {item.available ? "On sale" : "Sold out"}
              </ActionButton>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
