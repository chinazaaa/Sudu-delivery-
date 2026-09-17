import Link from "next/link";
import Diagnostic from "@/components/Diagnostic";
import Reorder from "@/components/admin/Reorder";
import Thumb from "@/components/Thumb";
import SaveButton from "@/components/SaveButton";
import { db } from "@/lib/supabase";
import { diagnoseEmpty } from "@/lib/health";
import { addRestaurant, moveRestaurant, seedLaunchRestaurants } from "../actions";
import type { MenuItem, Restaurant } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RestaurantsAdmin() {
  const { data: restaurants } = await db()
    .from("restaurants")
    .select("*")
    .order("sort_order")
    .order("name");
  const { data: items } = await db().from("menu_items").select("id, restaurant_id");

  const list = (restaurants ?? []) as Restaurant[];
  const problem = list.length === 0 ? await diagnoseEmpty() : null;
  const countFor = (id: string) =>
    ((items ?? []) as MenuItem[]).filter((i) => i.restaurant_id === id).length;

  return (
    <div className="space-y-4">
      <section>
        <h1 className="text-xl font-extrabold tracking-tight">Restaurants</h1>
        <p className="text-sm text-muted">
          Each one holds its own categories, items and choices. Switch a restaurant off
          to take it off the site without losing its menu.
        </p>
      </section>

      {problem && !problem.ok && (
        <>
          <Diagnostic title={problem.title} detail={problem.detail} />
          <form action={seedLaunchRestaurants} className="card space-y-2">
            <h2 className="font-semibold">Start with the launch two</h2>
            <p className="text-sm text-muted">
              Adds KFC Novare and Domino&apos;s with their usual items at placeholder
              prices.
            </p>
            <SaveButton className="w-full">Add KFC and Domino&apos;s</SaveButton>
          </form>
        </>
      )}

      <p className="text-sm text-muted">
        The order here is the order a customer sees on the home page.
      </p>

      <ul className="grid gap-3 sm:grid-cols-2">
        {list.map((restaurant, index) => (
          <li key={restaurant.id} className="flex items-stretch gap-2">
            <Reorder
              action={moveRestaurant}
              field="restaurant_id"
              id={restaurant.id}
              first={index === 0}
              last={index === list.length - 1}
              label={restaurant.name}
            />
            <Link
              href={`/admin/menu/${restaurant.id}`}
              className="card flex grow items-center gap-3 transition hover:border-brand"
            >
              <span className="size-14 shrink-0 overflow-hidden rounded-xl">
                <Thumb
                  src={restaurant.logo_url}
                  name={restaurant.name}
                  rounded="rounded-none"
                />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{restaurant.name}</span>
                <span className="block text-sm text-muted">
                  {countFor(restaurant.id)} item
                  {countFor(restaurant.id) === 1 ? "" : "s"} · closes{" "}
                  {restaurant.closes_at.slice(0, 5)}
                </span>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    restaurant.active
                      ? "bg-green-100 text-green-800"
                      : "bg-black/[0.06] text-muted"
                  }`}
                >
                  {restaurant.active ? "On the site" : "Hidden"}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <form action={addRestaurant} className="card space-y-3">
        <h2 className="font-semibold">Add a restaurant</h2>
        <div className="flex flex-wrap items-end gap-2">
          <div className="grow">
            <label className="label">Name</label>
            <input name="name" required placeholder="Chicken Republic" className="field" />
          </div>
          <div className="w-32">
            <label className="label">Closes</label>
            <input name="closes_at" type="time" defaultValue="21:00" className="field" />
          </div>
        </div>
        <div>
          <label className="label">Address</label>
          <input name="address" placeholder="Novare Mall, Sangotedo" className="field" />
        </div>
        <SaveButton>Add restaurant</SaveButton>
      </form>
    </div>
  );
}
