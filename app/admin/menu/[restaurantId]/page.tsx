import Link from "next/link";
import { notFound } from "next/navigation";
import AdminItemFilter from "@/components/AdminItemFilter";
import Thumb from "@/components/Thumb";
import ActionButton from "@/components/admin/ActionButton";
import ConfirmButton from "@/components/admin/ConfirmButton";
import SaveButton from "@/components/SaveButton";
import { db } from "@/lib/supabase";
import { optionGroupsFor } from "@/lib/menu";
import { naira } from "@/lib/money";
import {
  addCategory,
  addOption,
  addOptionGroup,
  deleteCategory,
  renameCategory,
  deleteMenuItem,
  deleteOption,
  deleteOptionGroup,
  updateMenuItem,
  updateOption,
  applyGroupToCategory,
  toggleItemAvailable,
  importMenu,
  updateRestaurant,
} from "../../actions";
import type { MenuCategory, MenuItem, Restaurant } from "@/lib/types";
import { allAreas } from "@/lib/areas-server";
import ImportCatalogue from "@/components/admin/ImportCatalogue";

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

  const areas = await allAreas();

  const [{ data: siblings }, { data: categories }, { data: items }] = await Promise.all([
    db().from("restaurants").select("id, name").order("name"),
    db().from("menu_categories").select("*").eq("restaurant_id", restaurantId).order("sort_order"),
    db().from("menu_items").select("*").eq("restaurant_id", restaurantId).order("sort_order"),
  ]);

  const categoryList = (categories ?? []) as MenuCategory[];
  const itemList = (items ?? []) as MenuItem[];
  const groupsByItem = await optionGroupsFor(itemList.map((i) => i.id));
  const withPhotos = itemList.filter((item) => item.image_url).length;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Link href="/admin/menu" className="text-sm font-semibold text-muted hover:text-brand">
          ← All restaurants
        </Link>
        {/* Jump straight to another menu rather than going back out first. */}
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {((siblings ?? []) as { id: string; name: string }[]).map((other) => (
            <Link
              key={other.id}
              href={`/admin/menu/${other.id}`}
              className={`chip ${
                other.id === restaurant.id
                  ? "border-ink bg-ink text-white"
                  : "border-black/10 bg-white hover:border-ink/30"
              }`}
            >
              {other.name}
            </Link>
          ))}
        </div>
      </div>

      <Link
        href={`/admin/menu/${restaurant.id}/photos`}
        className="card flex items-center justify-between gap-3 hover:border-brand"
      >
        <span>
          <span className="block font-extrabold">Photos</span>
          <span className="block text-sm text-muted">
            {withPhotos} of {itemList.length} item
            {itemList.length === 1 ? "" : "s"} have one. Do the whole menu in one
            go, or drop in a folder named after the items.
          </span>
        </span>
        <span className="text-xl">→</span>
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
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Address</label>
            <input name="address" defaultValue={restaurant.address} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="area">Which area</label>
            <select
              id="area"
              name="area"
              defaultValue={restaurant.area ?? ""}
              className="field"
            >
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
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="logo">Logo photo</label>
            <input id="logo" name="logo" type="file" accept="image/*" className="field" />
            <input
              name="logo_url"
              defaultValue={restaurant.logo_url}
              placeholder="or paste an image link"
              className="field mt-2 text-sm"
            />
          </div>
          <div>
            <label className="label" htmlFor="banner">Banner photo</label>
            <input id="banner" name="banner" type="file" accept="image/*" className="field" />
            <input
              name="banner_url"
              defaultValue={restaurant.banner_url}
              placeholder="or paste an image link"
              className="field mt-2 text-sm"
            />
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
        <SaveButton quiet>Save restaurant</SaveButton>
      </form>

      <section className="card space-y-3">
        <div>
          <h2 className="font-bold">Categories</h2>
          <p className="text-sm text-muted">
            How the menu is grouped on the site: Pizzas, Chicken, Sides, Drinks.
            Type over a name to rename it, which keeps every item where it is.
          </p>
        </div>
        <ul className="flex flex-wrap gap-2">
          {categoryList.map((category) => (
            <li key={category.id}>
              {/* The name is the field. Type over it and press Enter, or use
                  the tick. Renaming in place matters because deleting a
                  category and adding it back leaves every item in it with no
                  category at all. Two forms rather than one, because a form
                  cannot be nested inside another. */}
              <div className="chip border-black/10 bg-white">
                <form
                  action={renameCategory}
                  className="flex items-center gap-1"
                  id={`rename-${category.id}`}
                >
                  <input type="hidden" name="category_id" value={category.id} />
                  <input
                    name="name"
                    defaultValue={category.name}
                    aria-label={`Rename ${category.name}`}
                    size={Math.max(category.name.length, 6)}
                    className="min-w-0 rounded bg-transparent px-1 py-0.5 font-semibold outline-none focus:bg-black/[0.04] focus:ring-2 focus:ring-brand/30"
                  />
                  <SaveButton quiet className="px-1.5 py-0.5 text-xs">
                    ✓
                  </SaveButton>
                </form>
                <form action={deleteCategory} className="flex">
                  <input type="hidden" name="category_id" value={category.id} />
                  <ConfirmButton
                    tone="bare"
                    className="text-ink/35 hover:text-brand"
                    confirm={`Delete ${category.name}? Items in it lose their category.`}
                  >
                    ✕
                  </ConfirmButton>
                </form>
              </div>
            </li>
          ))}
          {categoryList.length === 0 && (
            <li className="text-sm text-muted">None yet. Items will show under All.</li>
          )}
        </ul>
        {categoryList.length > 0 && (
          <details className="rounded-xl border border-black/10 p-3">
            <summary className="cursor-pointer text-sm font-semibold">
              Give a whole category the same choices
            </summary>
            <form action={applyGroupToCategory} className="mt-3 space-y-2">
              <p className="text-sm text-muted">
                Every pizza needs Small, Medium and Large. Do it once here instead of
                item by item. Items that already have this group are left alone.
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-40">
                  <label className="label">Category</label>
                  <select name="category_id" className="field">
                    {categoryList.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-32">
                  <label className="label">Choice name</label>
                  <input name="group_name" placeholder="Size" className="field" />
                </div>
                <div className="w-24">
                  <label className="label">Pick up to</label>
                  <input name="max_select" inputMode="numeric" defaultValue={1} className="field" />
                </div>
                <label className="flex items-center gap-2 pb-2 text-sm">
                  <input type="checkbox" name="required" defaultChecked />
                  Required
                </label>
              </div>
              <div>
                <label className="label">Options</label>
                <input
                  name="options"
                  placeholder="Small, Medium +2000, Large +5500"
                  className="field"
                />
                <p className="mt-1 text-xs text-muted">
                  Separate with commas. Add +amount or -amount for a price difference.
                </p>
              </div>
              <SaveButton quiet>Apply to every item in that category</SaveButton>
            </form>
          </details>
        )}

        <ImportCatalogue
        restaurantId={restaurant.id}
        items={(items ?? []).length}
        photosHref={`/admin/menu/${restaurant.id}/photos`}
      />

      <form action={addCategory} className="flex items-end gap-2">
          <input type="hidden" name="restaurant_id" value={restaurant.id} />
          <div className="grow">
            <label className="label">Add category</label>
            <input name="name" required placeholder="Pizzas" className="field" />
          </div>
          <SaveButton quiet className="shrink-0">Add</SaveButton>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-bold">Items</h2>
            <span className="text-sm text-muted">
              {itemList.length} on the menu, {itemList.filter((i) => i.available).length}{" "}
              on sale
            </span>
          </div>

          <Link
            href={`/admin/menu/${restaurant.id}/new`}
            className="btn-primary px-4 py-2 text-sm"
          >
            + Add item
          </Link>
        </div>

        <AdminItemFilter
          categories={categoryList.map((c) => ({ id: c.id, name: c.name }))}
          counts={{
            total: itemList.length,
            soldOut: itemList.filter((item) => !item.available).length,
            noPhoto: itemList.length - withPhotos,
          }}
        >
        {itemList.map((item) => {
          const groups = groupsByItem.get(item.id) ?? [];
          return (
            <div
              key={item.id}
              data-item
              data-name={item.name.toLowerCase()}
              data-category={
                categoryList.find((c) => c.id === item.category_id)?.name ?? ""
              }
              data-stock={item.available ? "on" : "off"}
              data-photo={item.image_url ? "yes" : "no"}
              className="card"
            >
              <div className="flex items-center gap-3">
                <span className="size-12 shrink-0 overflow-hidden rounded-xl">
                  <Thumb src={item.image_url} name={item.name} rounded="rounded-none" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{item.name}</span>
                  <span className="block text-sm text-muted">
                    {item.price_food > 0 ? naira(item.price_food) : "no price yet"}
                    {groups.length > 0 && ` · ${groups.map((g) => g.name).join(", ")}`}
                  </span>
                </span>

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
                      item.available
                        ? "bg-mint/15 text-mint"
                        : "bg-black/[0.06] text-muted"
                    }`}
                    title={
                      item.price_food === 0
                        ? "Set a price before this can go on sale"
                        : undefined
                    }
                  >
                    {item.available ? "On sale" : "Sold out"}
                  </ActionButton>
                </form>
              </div>

              <details className="mt-3 space-y-4 border-t border-black/5 pt-3">
                <summary className="cursor-pointer text-sm font-semibold text-muted">
                  Edit this item
                </summary>
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
                    <label className="label">Photo</label>
                    <input name="photo" type="file" accept="image/*" className="field" />
                    <input
                      name="image_url"
                      defaultValue={item.image_url}
                      placeholder="or paste an image link"
                      className="field mt-2 text-sm"
                    />
                  </div>
                  <SaveButton quiet>Save item</SaveButton>
                </form>

                <div className="space-y-3 rounded-xl bg-black/[0.03] p-3">
                  <div>
                    <h3 className="font-semibold">Choices</h3>
                    <p className="text-sm text-muted">
                      Size, flavour, extras. Each choice can add to the price, and what
                      the customer picks is printed on the counter sheet.
                    </p>
                  </div>

                  {groups.map((group) => (
                    <div key={group.id} className="rounded-xl border border-black/10 bg-white p-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <h4 className="font-semibold">
                          {group.name}
                          <span className="ml-2 text-xs font-normal text-muted">
                            {group.required ? "required" : "optional"}
                            {group.maxSelect > 1 && `, up to ${group.maxSelect}`}
                          </span>
                        </h4>
                        <form action={deleteOptionGroup}>
                          <input type="hidden" name="group_id" value={group.id} />
                          <ConfirmButton
                            tone="bare"
                            className="text-sm text-ink/40 hover:text-brand"
                            confirm={`Yes, remove ${group.name}`}
                          >
                            Remove
                          </ConfirmButton>
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
                              <SaveButton quiet className="px-2 py-1 text-xs">
                                Save
                              </SaveButton>
                            </form>
                            <form action={deleteOption}>
                              <input type="hidden" name="option_id" value={option.id} />
                              <ConfirmButton
                                tone="bare"
                                className="px-1 pb-1 text-xs text-ink/40 hover:text-brand"
                                confirm="Delete?"
                              >
                                ✕
                              </ConfirmButton>
                            </form>
                          </li>
                        ))}
                      </ul>

                      <form action={addOption} className="mt-2 flex flex-wrap items-end gap-2">
                        <input type="hidden" name="group_id" value={group.id} />
                        <div className="grow">
                          <label className="label">Add choice</label>
                          <input name="name" required placeholder="Large" className="field py-1 text-sm" />
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
                        <ActionButton className="btn-quiet px-3 py-1 text-sm" done="Added ✓">
                          Add
                        </ActionButton>
                      </form>
                    </div>
                  ))}

                  <form action={addOptionGroup} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="item_id" value={item.id} />
                    <div className="grow">
                      <label className="label">Add a choice group</label>
                      <input name="name" required placeholder="Size" className="field" />
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
                    <SaveButton quiet>Add group</SaveButton>
                  </form>
                </div>

                <form action={deleteMenuItem}>
                  <input type="hidden" name="item_id" value={item.id} />
                  <ConfirmButton
                    tone="bare"
                    className="text-sm text-muted hover:text-brand"
                    confirm={`Yes, delete ${item.name}`}
                  >
                    Delete this item
                  </ConfirmButton>
                </form>
              </details>
            </div>
          );
        })}
        </AdminItemFilter>

        <details className="card">
          <summary className="cursor-pointer font-semibold">
            Paste a whole menu
          </summary>
          <form action={importMenu} className="mt-3 space-y-2">
            <input type="hidden" name="restaurant_id" value={restaurant.id} />
            <p className="text-sm text-muted">
              One item per line, as{" "}
              <code className="rounded bg-black/5 px-1">
                Category | Item | Price | Description
              </code>
              . Categories are created as they appear. Add photos and choices
              afterwards by opening each item.
            </p>
            <textarea
              name="menu_text"
              rows={8}
              className="field font-mono text-sm"
              placeholder={`Classic | Pepperoni | 11000 | Hand tossed, cut into eight
Classic | Margherita | 9500
Premium | Meat Lovers | 17500
Favourites | BBQ Chicken | 12000
Sides | Garlic Bread | 3000`}
            />
            <SaveButton quiet>Import these</SaveButton>
          </form>
        </details>

      </section>
    </div>
  );
}
