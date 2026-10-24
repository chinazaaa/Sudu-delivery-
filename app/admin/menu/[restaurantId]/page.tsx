import Link from "next/link";
import { DAY_NAMES, openDays } from "@/lib/open-days";
import { notFound } from "next/navigation";
import AdminItemFilter from "@/components/AdminItemFilter";
import Thumb from "@/components/Thumb";
import ActionButton from "@/components/ActionButton";
import ConfirmButton from "@/components/admin/ConfirmButton";
import SaveButton from "@/components/SaveButton";
import { db } from "@/lib/supabase";
import { optionGroupsFor } from "@/lib/menu";
import { naira } from "@/lib/money";
import { keptOn } from "@/lib/cost-price";
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
  setCategoryStock,
  toggleItemAvailable,
  importMenu,
  updateRestaurant,
} from "../../actions";
import type { MenuCategory, MenuItem, Restaurant } from "@/lib/types";
import { allAreas } from "@/lib/areas-server";
import ImportCatalogue from "@/components/admin/ImportCatalogue";
import ValueBandEditor from "@/components/admin/ValueBandEditor";
import StepFeeEditor from "@/components/admin/StepFeeEditor";
import { parseStepFee } from "@/lib/step-fee";
import { parseValueBands } from "@/lib/value-bands";
import PhotoField from "@/components/admin/PhotoField";
import { Picking, Tick, Bar, Done } from "@/components/admin/BulkStock";
import { aislesFrom } from "@/lib/aisles";
import Drawing, { DRAWINGS } from "@/components/Drawing";
import { drawingFor } from "@/lib/drawing";
import { safeSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function RestaurantAdmin({
  params,
  searchParams,
}: {
  params: Promise<{ restaurantId: string }>;
  searchParams: Promise<{ did?: string; didon?: string; asked?: string }>;
}) {
  const { restaurantId } = await params;
  const said = await searchParams;

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
    // By name within a sort order, because nearly everything shares the one
    // sort order and ties came back in whatever order the database felt
    // like: a new item appeared in a different place on every load, which
    // reads as it not being there at all.
    db()
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("sort_order")
      .order("name"),
  ]);

  const categoryList = (categories ?? []) as MenuCategory[];
  const aisles = aislesFrom((await safeSettings()).menu_aisles);
  // Which item is the bag of ice block itself, so its own tick shows as
  // ticked. One in the whole shop, so it is a setting rather than a column.
  const iceItemId = (await safeSettings()).ice_item_id ?? "";
  const itemList = (items ?? []) as MenuItem[];
  const groupsByItem = await optionGroupsFor(
    itemList.map((i) => i.id),
    Object.fromEntries(itemList.map((i) => [i.id, i.price_food])),
    Object.fromEntries(itemList.map((i) => [i.id, i.name]))
  );
  const withPhotos = itemList.filter((item) => item.image_url).length;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Link href="/admin/menu" className="text-sm font-semibold text-muted hover:text-brand">
          ← All restaurants
        </Link>
        {/* Jump straight to another menu rather than going back out first. */}
        {/* Wrapped, not scrolled sideways: the tap after a fling is
            spent stopping the fling, so a row somebody has to scroll is a
            row whose buttons sometimes do nothing. */}
        <div className="flex flex-wrap gap-2">
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

      {/*
        Keyed on what is saved, so every box shows what was saved.

        Every field in here is uncontrolled: React sets a defaultValue
        once when the element appears and then leaves the DOM alone. The
        save works, the page re-renders with the new values, and the boxes
        go on showing the old ones until a full reload. Saving Burger King
        to Ajah and watching it say Sangotedo reads as the save having
        failed and quietly undone itself, so somebody saves again, or
        gives up and believes the shop has the wrong area for a kitchen.

        One key on the form rather than twenty-five on the fields: the
        signature changes when anything saved changes, the form is a new
        form, and every box inside it takes its new default.
      */}
      <form
        key={`${restaurant.area ?? ""}|${restaurant.name}|${restaurant.active}|${
          restaurant.value_bands ?? ""
        }`}
        action={updateRestaurant}
        className="card space-y-3"
      >
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
            <input
              type="checkbox"
              name="suggest_in_chat"
              defaultChecked={restaurant.suggest_in_chat !== false}
            />
            {/* Whether Sudu Bot may put this counter forward when somebody
                says they do not know what to order. A shelf of cooking oil
                and a shelf of serums both cost about what a party platter
                does, and neither is dinner. */}
            A kitchen the chat can suggest
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" name="melts" defaultChecked={restaurant.melts === true} />
            {/* Ice cream bought first is ice cream handed over as soup. The
                route is arranged once and then another order comes in, so
                remembering on the night is not a plan: ticked here, this
                counter is the last stop on every run by itself. */}
            It melts, so buy it last
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={restaurant.active} />
            On the site
          </label>
        </div>
        {/* Which days it opens at all. Nearly every restaurant is all
            seven, so all seven ticked is stored as "every day" and nothing
            has to be set for the ones that never close. D.O Bowls is the
            reason this exists: Monday to Friday, and a Saturday run used to
            take the order anyway. */}
        <div>
          <p className="label mb-1">Open on</p>
          <div className="flex flex-wrap gap-3">
            {DAY_NAMES.map((name, day) => (
              <label key={name} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  name="open_days"
                  value={day}
                  defaultChecked={openDays(restaurant.open_days).includes(day)}
                />
                {name.slice(0, 3)}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">
            Nothing from a restaurant can go on a car that drives on a day it
            is shut. Leave all seven ticked unless it really closes.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Address</label>
            <input name="address" defaultValue={restaurant.address} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="phone">Their number</label>
            <input
              id="phone"
              name="phone"
              inputMode="tel"
              defaultValue={restaurant.phone ?? ""}
              placeholder="080…"
              className="field"
            />
            <p className="mt-1 text-xs text-muted">
              Where tonight&apos;s list goes before the car leaves, so the food
              is being cooked while it is still on the road.
            </p>
          </div>
          <div>
            <label className="label" htmlFor="orders_ahead">
              How they take an order ahead
            </label>
            <select
              id="orders_ahead"
              name="orders_ahead"
              defaultValue={restaurant.orders_ahead ?? ""}
              className="field"
            >
              <option value="">Nobody has said yet</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="call">A phone call</option>
              <option value="no">Only at the counter</option>
            </select>
            <p className="mt-1 text-xs text-muted">
              A list sent to a WhatsApp nobody watches is worse than no list:
              the stop becomes a wait for food that was never started. Say
              which works and the run sheet offers only that.
            </p>
          </div>
          <div>
            <label className="label" htmlFor="pay_by">Who pays, and how</label>
            <select
              id="pay_by"
              name="pay_by"
              defaultValue={restaurant.pay_by ?? ""}
              className="field"
            >
              <option value="">Card at the counter</option>
              <option value="card">Card at the counter</option>
              <option value="transfer">We transfer it before collection</option>
            </select>
            <p className="mt-1 text-xs text-muted">
              A transfer counter is a different stop: nothing to pay, collect
              and leave. The run sheet stops saying &ldquo;the card should
              be&rdquo; there, because somebody will otherwise stand at a
              settled counter trying to pay it.
            </p>
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
          <div>
            {/* The drawing on the tile, where there is no photograph. The
                shop guesses one off the name, which works for Dodo Pizza
                and not for Uncle Stan's: a name says what a kitchen sells
                only when the name is about food. */}
            <label className="label" htmlFor="drawing">
              Drawing on the tile
            </label>
            <select
              id="drawing"
              name="drawing"
              defaultValue={restaurant.drawing ?? ""}
              className="field"
            >
              <option value="">Guess it from the name</option>
              {DRAWINGS.map((one) => (
                <option key={one} value={one}>
                  {one.charAt(0).toUpperCase() + one.slice(1)}
                </option>
              ))}
            </select>
            <p className="mt-1 flex items-center gap-2 text-xs text-muted">
              <Drawing
                name={
                  (DRAWINGS as string[]).includes(restaurant.drawing ?? "")
                    ? (restaurant.drawing as (typeof DRAWINGS)[number])
                    : drawingFor(restaurant.name)
                }
                size={26}
              />
              Only on the front page tile, and only until there is a logo.
            </p>
          </div>
        </div>
        <div className="border-t border-black/5 pt-3">
          <p className="label mb-0">What delivery costs from here</p>
          <p className="mb-2 text-xs text-muted">
            The ordinary ladder counts containers, which is right for a
            kitchen and wrong for a market: eleven peppers and a bag of rice
            is one trip and two bags, not eleven containers. Where bulk is
            what costs, price it by what the shopping comes to.
          </p>
          <ValueBandEditor initial={parseValueBands(restaurant.value_bands)} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="logo">Logo photo</label>
            <PhotoField id="logo" name="logo" />
            <input
              name="logo_url"
              defaultValue={restaurant.logo_url}
              placeholder="or paste an image link"
              className="field mt-2 text-sm"
            />
          </div>
          <div>
            <label className="label" htmlFor="banner">Banner photo</label>
            <PhotoField id="banner" name="banner" />
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
        <SaveButton>Save restaurant</SaveButton>
      </form>

      <section className="card space-y-3">
        <div>
          <h2 className="font-bold">Categories</h2>
          <p className="text-sm text-muted">
            How the menu is grouped on the site: Pizzas, Chicken, Sides, Drinks.
            Type over a name to rename it, which keeps every item where it is.
            The aisle beside it is where this section shows up on the
            everything list, where one word has to work across every kitchen.
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
                  {/* Where this section lands on the everything list.
                      "Dodsters & pockets" stays what Dodo Pizza calls them
                      on its own menu, and is found under Pizza by somebody
                      who has never heard the word. */}
                  <select
                    name="aisle"
                    defaultValue={category.aisle ?? ""}
                    aria-label={`Aisle for ${category.name}`}
                    className="min-w-0 rounded bg-transparent py-0.5 text-xs font-semibold text-muted outline-none focus:bg-black/[0.04]"
                  >
                    <option value="">Unfiled</option>
                    {aisles.map((one) => (
                      <option key={one} value={one}>
                        {one}
                      </option>
                    ))}
                  </select>
                  <SaveButton className="px-1.5 py-0.5 text-xs">
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
              Put a whole category on sale, or take it off
            </summary>
            <form action={setCategoryStock} className="mt-3 space-y-2">
              <p className="text-sm text-muted">
                A shelf goes off the day there is no cold bag and back the day
                there is one. Fifteen items, one decision, rather than fifteen
                taps through a list of sixty-seven.
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-48">
                  <label className="label" htmlFor="stock_category">
                    Category
                  </label>
                  <select id="stock_category" name="category_id" className="field">
                    {categoryList.map((category) => {
                      const on = itemList.filter(
                        (item) => item.category_id === category.id && item.available
                      ).length;
                      const all = itemList.filter(
                        (item) => item.category_id === category.id
                      ).length;
                      return (
                        <option key={category.id} value={category.id}>
                          {category.name} · {on} of {all} on sale
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="w-36">
                  <label className="label" htmlFor="stock_available">
                    Put them
                  </label>
                  <select id="stock_available" name="available" className="field">
                    <option value="true">On sale</option>
                    <option value="false">Sold out</option>
                  </select>
                </div>
                <SaveButton>Apply</SaveButton>
              </div>
              <p className="text-xs text-muted">
                Putting a shelf on sale skips anything with no price on it, because
                an item selling at nothing is the one mistake this must not make.
              </p>
            </form>
          </details>
        )}

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
              <SaveButton>Apply to every item in that category</SaveButton>
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
          <SaveButton className="shrink-0">Add</SaveButton>
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

        {said.did !== undefined && (
          <Done
            did={Number(said.did ?? "0")}
            asked={Number(said.asked ?? "0")}
            on={said.didon === "1"}
          />
        )}

        <Picking>
        {/*
         * Stock is the daily job, so it is the one thing on this page that
         * can be done to several items at once.
         *
         * Filter above, tick below, switch the lot. The filter is done in
         * the browser, so "tick everything showing" means exactly the rows
         * on screen: pick Desserts, tick all showing, take them off sale.
         */}
        <Bar back={`/admin/menu/${restaurant.id}`} />

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
              // Named, so somewhere else in admin can send you straight at
              // this one rather than at a page of two hundred to scroll.
              // The margin is what stops the sticky header landing on it.
              id={`item-${item.id}`}
              data-item
              data-id={item.id}
              data-name={item.name.toLowerCase()}
              data-category={
                categoryList.find((c) => c.id === item.category_id)?.name ?? ""
              }
              data-stock={item.available ? "on" : "off"}
              data-photo={item.image_url ? "yes" : "no"}
              className="card scroll-mt-24"
            >
              <div className="flex items-center gap-3">
                <Tick id={item.id} name={item.name} />
                <span className="size-12 shrink-0 overflow-hidden rounded-xl">
                  <Thumb src={item.image_url} name={item.name} rounded="rounded-none" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{item.name}</span>
                  <span className="block text-sm text-muted">
                    {item.price_food > 0 ? naira(item.price_food) : "no price yet"}
                    {/*
                      What the shop keeps, where there is a cost to compare
                      against, and whether that cost is worth believing.

                      Four thousand of them were worked back from the menu
                      rather than read off a receipt, so a margin shown
                      without saying which kind it is would be a figure
                      that looks checked and is not. The guesses say so
                      until somebody confirms them.
                    */}
                    {(() => {
                      const kept = keptOn(item.price_food, item.price_cost);
                      if (!kept) return null;
                      return (
                        <span className={item.cost_confirmed ? "text-mint" : ""}>
                          {" · "}
                          {naira(kept.kept)} kept ({kept.share}%)
                          {!item.cost_confirmed && " · cost is a guess"}
                        </span>
                      );
                    })()}
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
                    {/*
                      Cost first, then what it sells for, in the order
                      somebody with a receipt in their hand works.

                      Both are typed rather than one being computed from
                      the other, because a counter's own price is not
                      always the markup away from what this shop should
                      charge: a round number beats arithmetic on a menu
                      card. The line underneath says what the markup would
                      make it, so the difference is visible without being
                      forced.
                    */}
                    <div className="w-28">
                      <label className="label">Cost</label>
                      <input
                        name="price_cost"
                        inputMode="numeric"
                        defaultValue={item.price_cost ?? ""}
                        placeholder="at the counter"
                        className="field"
                      />
                    </div>
                    <div className="w-28">
                      <label className="label">Sells for</label>
                      <input
                        name="price_food"
                        inputMode="numeric"
                        defaultValue={item.price_food}
                        className="field"
                      />
                    </div>
                    <label className="flex items-center gap-2 pb-2.5 text-[13px] font-semibold">
                      <input
                        type="checkbox"
                        name="cost_confirmed"
                        defaultChecked={item.cost_confirmed === true}
                      />
                      Cost checked
                    </label>
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
                    <div className="w-32">
                      {/* Room in the car, not a count of lines. A bottle of
                          Coke used to cost as much to carry as a pizza box. */}
                      <label className="label">Room</label>
                      <select
                        name="container_pct"
                        defaultValue={String(item.container_pct ?? 100)}
                        className="field"
                      >
                        <option value="25">A drink · 4 make one</option>
                        <option value="50">Half a container</option>
                        <option value="100">One container</option>
                        <option value="200">2 containers</option>
                        <option value="300">3 containers</option>
                        <option value="400">4 containers</option>
                        <option value="600">6 containers</option>
                      </select>
                    </div>
                    <label className="flex items-center gap-2 pb-2 text-sm">
                      <input type="checkbox" name="available" defaultChecked={item.available} />
                      Available
                    </label>
                  </div>
                  {/* Ice cream bought at four and handed over at seven is
                      soup. The route puts the counter last; this puts a bag
                      of ice block in the boot with it. Ticked item by item,
                      because Domino's sells one dessert among forty pizzas
                      and the small ice creams in the shop ride along in a
                      cool box and need nothing. */}
                  <div className="flex flex-wrap gap-x-5 gap-y-1">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="needs_ice"
                        defaultChecked={item.needs_ice === true}
                      />
                      Has to travel on ice
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="hidden" name="is_ice__asked" value="1" />
                      <input
                        type="checkbox"
                        name="is_ice"
                        defaultChecked={iceItemId === item.id}
                      />
                      This <em>is</em> the bag of ice block
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
                  <div className="rounded-xl bg-shell p-2.5">
                    <p className="label mb-0">Delivery, where room is not the measure</p>
                    <p className="mb-2 text-xs text-muted">
                      For something small that people buy a lot of. Fifteen
                      Fantasy ice creams is one cool box and thirty is two, and
                      the room setting above would call fifteen of them fifteen
                      containers. This is the floor the trip cannot go under
                      rather than something added on top: it rides along, so
                      three pizzas and an ice cream pays for the pizzas.
                    </p>
                    <StepFeeEditor initial={parseStepFee(item.step_fee ?? "")} />
                  </div>
                  {/* The back of the product, never the front. Half of what a
                      collection holds is not on anybody's menu, and when the
                      order comes in whoever packs it needs to know where that
                      cake or those flowers came from. */}
                  <div>
                    <label className="label">Where to get it (only we see this)</label>
                    <input
                      name="source"
                      defaultValue={(item as { source?: string }).source ?? ""}
                      placeholder="Tasty Bakes, Sangotedo · 0803 123 4567 · was ₦9,500"
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="label">Photo</label>
                    <PhotoField name="photo" />
                    <input
                      name="image_url"
                      defaultValue={item.image_url}
                      placeholder="or paste an image link"
                      className="field mt-2 text-sm"
                    />
                  </div>
                  <SaveButton>Save item</SaveButton>
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
                            {/* Said out loud, because the figures beside the
                                choices below are not what this group costs:
                                a half is worth the pizza it names, and the
                                dearer of the two is the price. */}
                            {group.dearest && ", halves · charged at the dearer one"}
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
                                {option.asItemName ? (
                                  /* Tied to a real item, so its price is that
                                     item's price today and a figure typed
                                     here would be a second price nobody
                                     reads. */
                                  <p className="pb-1 text-xs text-muted">
                                    is the {option.asItemName}
                                  </p>
                                ) : (
                                  <input
                                    name="price_delta"
                                    inputMode="numeric"
                                    defaultValue={option.priceDelta}
                                    className="field py-1 text-sm"
                                    aria-label="Extra cost"
                                  />
                                )}
                              </div>
                              <label className="flex items-center gap-1 pb-1 text-xs">
                                <input type="checkbox" name="available" defaultChecked={option.available} />
                                On
                              </label>
                              <SaveButton className="px-2 py-1 text-xs">
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
                    <SaveButton>Add group</SaveButton>
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
        </Picking>

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
            <SaveButton>Import these</SaveButton>
          </form>
        </details>

      </section>
    </div>
  );
}
