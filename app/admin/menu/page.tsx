import Link from "next/link";
import Diagnostic from "@/components/Diagnostic";
import Reorder from "@/components/admin/Reorder";
import Thumb from "@/components/Thumb";
import SaveButton from "@/components/SaveButton";
import { db } from "@/lib/supabase";
import { diagnoseEmpty } from "@/lib/health";
import { addRestaurant, moveRestaurant, seedLaunchRestaurants } from "../actions";
import type { MenuItem, Restaurant } from "@/lib/types";
import { allAreas } from "@/lib/areas-server";

export const dynamic = "force-dynamic";

export default async function RestaurantsAdmin() {
  const { data: restaurants } = await db()
    .from("restaurants")
    .select("*")
    .order("sort_order")
    .order("name");
  const list = (restaurants ?? []) as Restaurant[];
  const areas = await allAreas();
  const problem = list.length === 0 ? await diagnoseEmpty() : null;

  // Counted by the database, one number per restaurant, rather than by
  // reading every item and measuring the pile. PostgREST hands back at most
  // a thousand rows, so the moment a shelf of two thousand products existed
  // the pile was a sample: it said Skincare had 246 items, which was simply
  // the part of it that fitted.
  const counted = await Promise.all(
    list.map(async (one) => {
      const { count } = await db()
        .from("menu_items")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", one.id);
      return [one.id, count ?? 0] as const;
    })
  );
  const counts = new Map(counted);
  const countFor = (id: string) => counts.get(id) ?? 0;

  // The gaps below are about the food menu, which is small enough to read
  // whole. The skincare shelf has its own page, and pulling two thousand
  // products through here to look for missing photographs would be the row
  // cap all over again.
  const foodIds = list
    .filter((one) => (one.kind ?? "food") !== "skincare")
    .map((one) => one.id);
  const { data: items } =
    foodIds.length > 0
      ? await db()
          .from("menu_items")
          .select("id, restaurant_id, name, image_url, description, available")
          .in("restaurant_id", foodIds)
      : { data: [] };
  const rows = (items ?? []) as MenuItem[];

  // A photo is the single biggest thing between an item and being ordered, and
  // a missing one is invisible from here: you would have to open every
  // restaurant to find it. Only items actually on sale count, because an item
  // switched off is nobody's problem.
  const onSale = rows.filter((item) => item.available);
  const noPhoto = onSale.filter((item) => !item.image_url);
  const noWords = onSale.filter((item) => !(item.description ?? "").trim());
  const nameOf = (id: string) =>
    list.find((one) => one.id === id)?.name ?? "";

  return (
    <div className="space-y-4">
      <section>
        <h1 className="text-xl font-extrabold tracking-tight">Restaurants</h1>
        <p className="text-sm text-muted">
          Each one holds its own categories, items and choices. Switch a restaurant off
          to take it off the site without losing its menu.
        </p>
        {/* The form is at the bottom, under however many restaurants there
            are, which is the right place for it and the wrong place to have
            to scroll to. */}
        <a href="#add" className="btn-quiet mt-2 inline-block px-4 py-2 text-sm">
          Add a restaurant
        </a>
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

      {(noPhoto.length > 0 || noWords.length > 0) && (
        <section className="card space-y-2">
          <div>
            <h2 className="font-bold">Gaps in the menu</h2>
            <p className="text-sm text-muted">
              Of {onSale.length} items on sale. A photo sells food better than
              anything else on the page.
            </p>
          </div>
          <ul className="space-y-2 text-sm">
            {[
              { label: "No photo", items: noPhoto },
              { label: "No description", items: noWords },
            ]
              .filter((gap) => gap.items.length > 0)
              .map((gap) => (
                <li key={gap.label}>
                  <p className="font-semibold">
                    {gap.items.length} with {gap.label.toLowerCase()}
                  </p>
                  <p className="text-muted">
                    {[...new Set(gap.items.map((item) => item.restaurant_id))].map(
                      (id, index, all) => (
                        <span key={id}>
                          <Link
                            href={`/admin/menu/${id}`}
                            className="font-semibold text-brand"
                          >
                            {nameOf(id)}
                          </Link>
                          <span>
                            {" "}
                            ({gap.items.filter((item) => item.restaurant_id === id).length})
                            {index < all.length - 1 ? ", " : ""}
                          </span>
                        </span>
                      )
                    )}
                  </p>
                </li>
              ))}
          </ul>
        </section>
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

      <form id="add" action={addRestaurant} className="card space-y-3">
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
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Address</label>
            <input name="address" placeholder="Novare Mall, Sangotedo" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="new_area">Which area</label>
            <select id="new_area" name="area" className="field" defaultValue="">
              <option value="">Sangotedo</option>
              {areas.map((one) => (
                <option key={one.id} value={one.id}>
                  {one.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted">
              {areas.length === 0
                ? "Add areas under Settings to put a restaurant further out."
                : "Decides what delivery costs from here, and whether a car of its own can go at all."}
            </p>
          </div>
        </div>
        <SaveButton>Add restaurant</SaveButton>
      </form>
    </div>
  );
}
