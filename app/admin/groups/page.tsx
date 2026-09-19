import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import { db } from "@/lib/supabase";
import { cartValues, groupCarts, countCartItems } from "@/lib/group-carts";
import { naira } from "@/lib/money";
import { formatPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

/**
 * Shared deliveries that are still filling up.
 *
 * Not orders, and deliberately not on the orders page. Nobody in one has a
 * delivery fee yet, so there is nothing to buy, nothing to collect and
 * nothing to ask anybody to pay. Mixed in with real orders it would only
 * cause somebody to act on food that is not settled.
 *
 * It is worth seeing though, because it is the next twenty minutes of the
 * kitchen. This is what is coming, with how long is left on each.
 */
export default async function GroupsPage() {
  const { data: rows } = await db()
    .from("order_groups")
    .select("id, leader_name, closes_at, closed_at, created_at, batch_id")
    .is("closed_at", null)
    .not("closes_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(30);

  const groups = await Promise.all(
    (rows ?? []).map(async (row) => {
      const carts = await groupCarts(row.id as string);
      const worth = await cartValues(carts);
      const { data: batch } = await db()
        .from("batches")
        .select("delivery_window_text")
        .eq("id", row.batch_id as string)
        .maybeSingle();

      return {
        id: row.id as string,
        leader: String(row.leader_name ?? ""),
        closesAt: row.closes_at as string,
        when: (batch?.delivery_window_text as string) ?? "",
        carts,
        items: countCartItems(carts),
        food: [...worth.values()].reduce((sum, one) => sum + one, 0),
        worth,
      };
    })
  );

  const filling = groups.filter((one) => one.carts.length > 0);

  return (
    <div>
      <PageHeader
        title="Groups filling up"
        detail="Food on its way into a shared delivery. Not orders yet: nobody in one has a delivery fee until the group closes."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Groups with food in" value={filling.length} />
        <Stat label="People waiting" value={filling.reduce((n, g) => n + g.carts.length, 0)} />
        <Stat
          label="Food so far"
          value={filling.reduce((n, g) => n + g.food, 0)}
          money
        />
      </div>

      {filling.length === 0 ? (
        <p className="card text-sm text-muted">
          Nothing filling up right now. When somebody starts a group and puts food
          in, it appears here until the group closes, and then it becomes ordinary
          orders on the Orders page.
        </p>
      ) : (
        <div className="space-y-3">
          {filling.map((group) => (
            <article key={group.id} className="card space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold">{group.leader}&apos;s group</h3>
                  <p className="text-sm text-muted">
                    {group.carts.length} {group.carts.length === 1 ? "person" : "people"} ·{" "}
                    {group.items} item{group.items === 1 ? "" : "s"} · {naira(group.food)} of food
                    {group.when && ` · arriving ${group.when}`}
                  </p>
                </div>
                <span className="chip border-black/10 bg-paper text-xs">
                  closes {new Date(group.closesAt).toLocaleTimeString("en-NG", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <ul className="divide-y divide-black/5 text-sm">
                {group.carts.map((cart) => (
                  <li key={cart.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="font-semibold">{cart.name}</span>
                      <span className="block text-xs text-muted">
                        {formatPhone(cart.phone)} · {cart.hostel || "no block given"}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-xs text-muted">
                        {cart.lines.reduce((n, line) => n + (line.qty ?? 0), 0)} items
                      </span>
                      <span className="font-bold">{naira(group.worth.get(cart.id) ?? 0)}</span>
                      {cart.done_at ? (
                        <span className="text-xs font-bold text-mint">Ready</span>
                      ) : (
                        <span className="text-xs text-muted">Still adding</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="text-xs text-muted">
                Delivery is worked out when this closes, split evenly between them.
                Nothing here is an order yet, so nothing needs buying or collecting.
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
