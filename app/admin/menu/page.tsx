import { db } from "@/lib/supabase";
import { addMenuItem, updateMenuItem } from "../actions";
import type { MenuItem, Restaurant } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MenuAdmin() {
  const { data: restaurants } = await db()
    .from("restaurants")
    .select("*")
    .order("sort_order");
  const { data: items } = await db().from("menu_items").select("*").order("sort_order");

  return (
    <div className="space-y-4">
      <section className="card">
        <h1 className="text-lg font-semibold">Menu</h1>
        <p className="text-sm text-ink/60">
          Prices are in naira, food only — the {"₦"}4,000 is added at checkout. Untick
          an item the branch has actually run out of.
        </p>
      </section>

      {((restaurants ?? []) as Restaurant[]).map((restaurant) => (
        <section key={restaurant.id} className="card space-y-3">
          <h2 className="font-semibold">{restaurant.name}</h2>

          {((items ?? []) as MenuItem[])
            .filter((i) => i.restaurant_id === restaurant.id)
            .map((item) => (
              <form
                key={item.id}
                action={updateMenuItem}
                className="flex flex-wrap items-end gap-2 border-t border-black/5 pt-2"
              >
                <input type="hidden" name="item_id" value={item.id} />
                <div className="grow">
                  <label className="label">Item</label>
                  <input name="name" defaultValue={item.name} className="field" />
                </div>
                <div className="w-28">
                  <label className="label">Price</label>
                  <input
                    name="price_food"
                    inputMode="numeric"
                    defaultValue={item.price_food}
                    className="field"
                  />
                </div>
                <label className="flex items-center gap-2 pb-2 text-sm">
                  <input type="checkbox" name="available" defaultChecked={item.available} />
                  On
                </label>
                <button className="btn-quiet">Save</button>
              </form>
            ))}

          <form action={addMenuItem} className="flex flex-wrap items-end gap-2 border-t border-black/10 pt-3">
            <input type="hidden" name="restaurant_id" value={restaurant.id} />
            <div className="grow">
              <label className="label">Add item</label>
              <input name="name" placeholder="8pc bucket" className="field" />
            </div>
            <div className="w-28">
              <label className="label">Price</label>
              <input name="price_food" inputMode="numeric" className="field" />
            </div>
            <button className="btn-primary">Add</button>
          </form>
        </section>
      ))}
    </div>
  );
}
