import Link from "next/link";
import { notFound } from "next/navigation";
import Thumb from "@/components/Thumb";
import { db } from "@/lib/supabase";
import { optionGroupsFor } from "@/lib/menu";
import { naira } from "@/lib/money";
import {
  addCategory,
  addMenuItem,
  addOption,
  addOptionGroup,
  deleteCategory,
  deleteMenuItem,
  deleteOption,
  deleteOptionGroup,
  updateMenuItem,
  updateOption,
  updateRestaurant,
} from "../../actions";
import type { MenuCategory, MenuItem, Restaurant } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RestaurantAdmin({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;

  const { data } = await db()
    .from("restaurants")
    .select("*")
    .eq("id", restaurantId)
    .maybeSingle();
  const restaurant = data as Restaurant | null;
  if (!restaurant) notFound();

  const [{ data: categories }, { data: items }] = await Promise.all([
    db().from("menu_categories").select("*").eq("restaurant_id", restaurantId).order("sort_order"),
    db().from("menu_items").select("*").eq("restaurant_id", restaurantId).order("sort_order"),
  ]);

  const categoryList = (categories ?? []) as MenuCategory[];
  const itemList = (items ?? []) as MenuItem[];
  const groupsByItem = await optionGroupsFor(itemList.map((i) => i.id));

  return (
    <div className="space-y-5">
      <Link href="/admin/menu" className="text-sm font-medium text-brand hover:underline">
        ← All restaurants
      </Link>

      <form action={updateRestaurant} className="card space-y-3">
        <input type="hidden" name="restaurant_id" value={restaurant.id} />
        <div className="flex items-center gap-3">
          <span className="size-14 shrink-0 overflow-hidden rounded-xl">
            <Thumb src={restaurant.logo_url} name={restaurant.name} rounded="rounded-none" />
          </span>
          <h1 className="text-xl font-extrabold">{restaurant.name}</h1>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="grow">
            <label className="label">Name</label>
            <input name="name" defaultValue={restaurant.name} className="field" />
          </div>
          <div className="w-32">
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
        </div>
        <div>
          <label className="label">Address</label>
          <input name="address" defaultValue={restaurant.address} className="field" />
        </div>
        <p className="rounded-xl bg-brand-tint px-3 py-2 text-sm text-brand-dark">
          The banner is the big slide at the top of the shop and the logo is the
          circle beside the name. Without them the storefront falls back to plain
          colour, so paste image links here: upload to Supabase Storage, or use any
          public image URL.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="label">Logo image URL</label>
            <input name="logo_url" defaultValue={restaurant.logo_url} className="field" />
          </div>
          <div>
            <label className="label">Banner image URL</label>
            <input name="banner_url" defaultValue={restaurant.banner_url} className="field" />
          </div>
        </div>
        <div className="h-28 overflow-hidden rounded-xl">
          <Thumb
            src={restaurant.banner_url}
            name={restaurant.name}
            rounded="rounded-none"
            variant="banner"
          />
        </div>
        <button className="btn-quiet">Save restaurant</button>
      </form>

      <section className="card space-y-3">
        <div>
          <h2 className="font-bold">Categories</h2>
          <p className="text-sm text-ink/55">
            How the menu is grouped on the site: Pizzas, Chicken, Sides, Drinks.
          </p>
        </div>
        <ul className="flex flex-wrap gap-2">
          {categoryList.map((category) => (
            <li key={category.id}>
              <form action={deleteCategory} className="chip border-black/10 bg-white">
                <input type="hidden" name="category_id" value={category.id} />
                {category.name}
                <button className="text-ink/35 hover:text-brand" aria-label={`Delete ${category.name}`}>
                  ✕
                </button>
              </form>
            </li>
          ))}
          {categoryList.length === 0 && (
            <li className="text-sm text-ink/55">None yet. Items will show under All.</li>
          )}
        </ul>
        <form action={addCategory} className="flex items-end gap-2">
          <input type="hidden" name="restaurant_id" value={restaurant.id} />
          <div className="grow">
            <label className="label">Add category</label>
            <input name="name" placeholder="Pizzas" className="field" />
          </div>
          <button className="btn-quiet shrink-0">Add</button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">Items</h2>

        {itemList.map((item) => {
          const groups = groupsByItem.get(item.id) ?? [];
          return (
            <details key={item.id} className="card">
              <summary className="flex cursor-pointer items-center gap-3">
                <span className="size-12 shrink-0 overflow-hidden rounded-xl">
                  <Thumb src={item.image_url} name={item.name} rounded="rounded-none" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{item.name}</span>
                  <span className="block text-sm text-ink/55">
                    {naira(item.price_food)}
                    {groups.length > 0 && ` · ${groups.map((g) => g.name).join(", ")}`}
                    {!item.available && " · sold out"}
                  </span>
                </span>
              </summary>

              <div className="mt-3 space-y-4 border-t border-black/5 pt-3">
                <form action={updateMenuItem} className="space-y-2">
                  <input type="hidden" name="item_id" value={item.id} />
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="grow">
                      <label className="label">Name</label>
                      <input name="name" defaultValue={item.name} className="field" />
                    </div>
                    <div className="w-28">
                      <label className="label">Base price</label>
                      <input
                        name="price_food"
                        inputMode="numeric"
                        defaultValue={item.price_food}
                        className="field"
                      />
                    </div>
                    <div className="w-40">
                      <label className="label">Category</label>
                      <select
                        name="category_id"
                        defaultValue={item.category_id ?? ""}
                        className="field"
                      >
                        <option value="">None</option>
                        {categoryList.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 pb-2 text-sm">
                      <input type="checkbox" name="available" defaultChecked={item.available} />
                      Available
                    </label>
                  </div>
                  <div>
                    <label className="label">Description</label>
                    <input
                      name="description"
                      defaultValue={item.description}
                      placeholder="Two pieces, chips and a drink"
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="label">Photo URL</label>
                    <input name="image_url" defaultValue={item.image_url} className="field" />
                  </div>
                  <button className="btn-quiet">Save item</button>
                </form>

                <div className="space-y-3 rounded-xl bg-black/[0.03] p-3">
                  <div>
                    <h3 className="font-semibold">Choices</h3>
                    <p className="text-sm text-ink/55">
                      Size, flavour, extras. Each choice can add to the price, and what
                      the customer picks is printed on the counter sheet.
                    </p>
                  </div>

                  {groups.map((group) => (
                    <div key={group.id} className="rounded-xl border border-black/10 bg-white p-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <h4 className="font-semibold">
                          {group.name}
                          <span className="ml-2 text-xs font-normal text-ink/50">
                            {group.required ? "required" : "optional"}
                            {group.maxSelect > 1 && `, up to ${group.maxSelect}`}
                          </span>
                        </h4>
                        <form action={deleteOptionGroup}>
                          <input type="hidden" name="group_id" value={group.id} />
                          <button className="text-sm text-ink/40 hover:text-brand">
                            Remove
                          </button>
                        </form>
                      </div>

                      <ul className="mt-2 space-y-2">
                        {group.options.map((option) => (
                          <li key={option.id} className="flex flex-wrap items-end gap-2">
                            <form action={updateOption} className="flex grow flex-wrap items-end gap-2">
                              <input type="hidden" name="option_id" value={option.id} />
                              <div className="grow">
                                <input name="name" defaultValue={option.name} className="field py-1 text-sm" />
                              </div>
                              <div className="w-28">
                                <input
                                  name="price_delta"
                                  inputMode="numeric"
                                  defaultValue={option.priceDelta}
                                  className="field py-1 text-sm"
                                  aria-label="Extra cost"
                                />
                              </div>
                              <label className="flex items-center gap-1 pb-1 text-xs">
                                <input type="checkbox" name="available" defaultChecked={option.available} />
                                On
                              </label>
                              <button className="btn-quiet px-2 py-1 text-xs">Save</button>
                            </form>
                            <form action={deleteOption}>
                              <input type="hidden" name="option_id" value={option.id} />
                              <button className="px-1 pb-1 text-xs text-ink/40 hover:text-brand">
                                ✕
                              </button>
                            </form>
                          </li>
                        ))}
                      </ul>

                      <form action={addOption} className="mt-2 flex flex-wrap items-end gap-2">
                        <input type="hidden" name="group_id" value={group.id} />
                        <div className="grow">
                          <label className="label">Add choice</label>
                          <input name="name" placeholder="Large" className="field py-1 text-sm" />
                        </div>
                        <div className="w-28">
                          <label className="label">Extra cost</label>
                          <input
                            name="price_delta"
                            inputMode="numeric"
                            defaultValue={0}
                            className="field py-1 text-sm"
                          />
                        </div>
                        <button className="btn-quiet px-3 py-1 text-sm">Add</button>
                      </form>
                    </div>
                  ))}

                  <form action={addOptionGroup} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="item_id" value={item.id} />
                    <div className="grow">
                      <label className="label">Add a choice group</label>
                      <input name="name" placeholder="Size" className="field" />
                    </div>
                    <div className="w-24">
                      <label className="label">Pick up to</label>
                      <input
                        name="max_select"
                        inputMode="numeric"
                        defaultValue={1}
                        className="field"
                      />
                    </div>
                    <label className="flex items-center gap-2 pb-2 text-sm">
                      <input type="checkbox" name="required" defaultChecked />
                      Required
                    </label>
                    <button className="btn-quiet">Add group</button>
                  </form>
                </div>

                <form action={deleteMenuItem}>
                  <input type="hidden" name="item_id" value={item.id} />
                  <button className="text-sm text-ink/40 hover:text-brand">
                    Delete this item
                  </button>
                </form>
              </div>
            </details>
          );
        })}

        <form action={addMenuItem} className="card space-y-3">
          <h3 className="font-semibold">Add an item</h3>
          <input type="hidden" name="restaurant_id" value={restaurant.id} />
          <div className="flex flex-wrap items-end gap-2">
            <div className="grow">
              <label className="label">Name</label>
              <input name="name" placeholder="Medium pizza" className="field" />
            </div>
            <div className="w-28">
              <label className="label">Base price</label>
              <input name="price_food" inputMode="numeric" className="field" />
            </div>
            <div className="w-40">
              <label className="label">Category</label>
              <select name="category_id" className="field">
                <option value="">None</option>
                {categoryList.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <input name="description" className="field" />
          </div>
          <div>
            <label className="label">Photo URL</label>
            <input name="image_url" className="field" />
          </div>
          <button className="btn-primary">Add item</button>
          <p className="text-xs text-ink/50">
            Add the item first, then open it to give it sizes and flavours.
          </p>
        </form>
      </section>
    </div>
  );
}
