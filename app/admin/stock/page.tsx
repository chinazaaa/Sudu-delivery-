import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import StockSearch from "@/components/admin/StockSearch";
import ActionButton from "@/components/admin/ActionButton";
import Thumb from "@/components/Thumb";
import Empty from "@/components/Empty";
import { db } from "@/lib/supabase";
import { naira } from "@/lib/money";
import { toggleItemAvailable } from "../actions";

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
  searchParams: Promise<{ q?: string }>;
}) {
  const asked = ((await searchParams).q ?? "").trim();

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

            <form action={toggleItemAvailable} className="shrink-0">
              <input type="hidden" name="item_id" value={item.id} />
              <input
                type="hidden"
                name="available"
                value={item.available ? "false" : "true"}
              />
              <ActionButton
                busy="…"
                done="✓"
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
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
