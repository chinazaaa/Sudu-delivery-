import Diagnostic from "@/components/Diagnostic";
import { db } from "@/lib/supabase";
import { diagnoseEmpty } from "@/lib/health";
import {
  addMenuItem,
  addRestaurant,
  seedLaunchRestaurants,
  updateMenuItem,
  updateRestaurant,
} from "../actions";
import type { MenuItem, Restaurant } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MenuAdmin() {
  const { data: restaurants } = await db()
    .from("restaurants")
    .select("*")
    .order("sort_order");
  const { data: items } = await db().from("menu_items").select("*").order("sort_order");

  const list = (restaurants ?? []) as Restaurant[];
  const problem = list.length === 0 ? await diagnoseEmpty() : null;

  return (
    <div className="space-y-4">
      <section className="card">
        <h1 className="text-lg font-semibold">Menu</h1>
        <p className="text-sm text-ink/60">
          Prices are in naira, food only. Delivery is added at checkout. Untick an item
          the branch has actually run out of.
        </p>
      </section>

      {problem && !problem.ok && (
        <>
          <Diagnostic title={problem.title} detail={problem.detail} />
          <form action={seedLaunchRestaurants} className="card space-y-2">
            <h2 className="font-semibold">Or start the menu here</h2>
            <p className="text-sm text-ink/60">
              Adds KFC Novare and Domino&apos;s with their usual items at placeholder
              prices. Correct the prices at the counter on the first run.
            </p>
            <button className="btn-primary w-full">Add KFC and Domino&apos;s</button>
          </form>
        </>
      )}

      {list.map((restaurant) => (
        <section key={restaurant.id} className="card space-y-3">
          <form action={updateRestaurant} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="restaurant_id" value={restaurant.id} />
            <div className="grow">
              <label className="label">Restaurant</label>
              <input name="name" defaultValue={restaurant.name} className="field" />
            </div>
            <div className="w-28">
              <label className="label">Closes</label>
              <input
                name="closes_at"
                type="time"
                defaultValue={restaurant.closes_at.slice(0, 5)}
                className="field"
              />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" name="active" defaultChecked={restaurant.active} />
              On the site
            </label>
            <input type="hidden" name="address" value={restaurant.address} />
            <button className="btn-quiet">Save</button>
          </form>

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

          <form
            action={addMenuItem}
            className="flex flex-wrap items-end gap-2 border-t border-black/10 pt-3"
          >
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

      <form action={addRestaurant} className="card space-y-2">
        <h2 className="font-semibold">Add a restaurant</h2>
        <div className="flex flex-wrap items-end gap-2">
          <div className="grow">
            <label className="label">Name</label>
            <input name="name" placeholder="Panarottis" className="field" />
          </div>
          <div className="w-28">
            <label className="label">Closes</label>
            <input name="closes_at" type="time" defaultValue="21:00" className="field" />
          </div>
        </div>
        <div>
          <label className="label">Address</label>
          <input name="address" placeholder="Novare Mall, Sangotedo" className="field" />
        </div>
        <button className="btn-primary">Add restaurant</button>
      </form>
    </div>
  );
}
