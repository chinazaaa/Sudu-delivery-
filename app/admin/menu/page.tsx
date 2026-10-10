import PageHeader from "@/components/admin/PageHeader";
import Link from "next/link";
import Diagnostic from "@/components/Diagnostic";
import Panel from "@/components/admin/Panel";
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

  // The two gaps, drawn as one pair of tiles. A bar needs something to be a
  // share of, and the only honest denominator is the items actually on sale:
  // seventy missing photographs out of eighty is a different morning from
  // seventy out of eight hundred.
  const gaps = [
    {
      key: "photo",
      count: noPhoto.length,
      said: "with no photo",
      items: noPhoto,
      // Tomato Deep rather than Tomato, because this is a number being read
      // on a light ground rather than a button being pressed.
      number: "text-brand-dark",
      bar: "bg-brand-dark",
      fix: "Add the photos",
    },
    {
      key: "words",
      count: noWords.length,
      said: "with no description",
      items: noWords,
      // Amber rather than Tomato Deep, because the point is that the two
      // gaps are not worth the same: a missing description costs less than
      // a missing photograph, and the board draws this one in the amber the
      // palette carries for exactly that, the middle severity.
      number: "text-amber-deep",
      bar: "bg-amber",
      fix: "Write the descriptions",
    },
  ].filter((gap) => gap.count > 0);

  return (
    <div>
      <PageHeader
        title="Restaurants"
        detail="Each one holds its own categories, items and choices. Switch one off to take it off the site without losing its menu."
        actions={
          <>
            {/* Taking one thing off sale does not need any of this page. It
                needs a search box, and that is somewhere else. */}
            <Link href="/admin/stock" className="btn-admin">
              Something sold out?
            </Link>
            {/* A jump down to the form, which is at the bottom under however
                many restaurants there are: the right place for it and the
                wrong place to have to scroll to. An outline, because it adds
                nothing by itself. The red one on this screen is that form's
                own save, which is the thing that actually writes a
                restaurant. */}
            <a href="#add" className="btn-admin">
              Add a restaurant
            </a>
          </>
        }
      />

      {problem && !problem.ok && (
        <div className="mb-[18px] space-y-3.5">
          <Diagnostic title={problem.title} detail={problem.detail} />
          <form action={seedLaunchRestaurants} className="card p-5">
            <h2 className="font-display text-[26px] font-black uppercase leading-none">
              Start with the launch two
            </h2>
            <p className="hint mb-3 mt-1">
              Adds KFC Novare and Domino&apos;s with their usual items at placeholder
              prices.
            </p>
            {/* An outline too. This card only appears while the shop has no
                menu at all, and the form at the bottom of the page is on
                screen with it: two red buttons and neither reads as the
                answer. */}
            <SaveButton look="btn-admin" className="w-full">
              Add KFC and Domino&apos;s
            </SaveButton>
          </form>
        </div>
      )}

      {gaps.length > 0 && (
        <Panel
          title="Gaps in the menu"
          detail={`Of ${onSale.length} items on sale. A photo sells food better than anything else on the page.`}
          className="mb-[18px]"
        >
          <div className="grid items-center gap-[18px] lg:grid-cols-[1fr_auto]">
            <div className="grid gap-3.5 sm:grid-cols-2">
              {gaps.map((gap) => {
                // Worst first, because the list is a work order rather than a
                // tally: the one with sixty missing photographs is the
                // afternoon's job, and it is also where the button goes.
                const byKitchen = [
                  ...new Set(gap.items.map((item) => item.restaurant_id)),
                ]
                  .map((id) => ({
                    id,
                    count: gap.items.filter((item) => item.restaurant_id === id).length,
                  }))
                  .sort((a, b) => b.count - a.count);
                return (
                  <div key={gap.key} className="soft px-3.5 py-3">
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`font-display text-[34px] font-black leading-none ${gap.number}`}
                      >
                        {gap.count}
                      </span>
                      <strong className="text-sm">{gap.said}</strong>
                    </div>
                    <div className="mb-[9px] mt-2 h-[9px] rounded-full bg-rule">
                      <div
                        className={`h-full rounded-full ${gap.bar}`}
                        style={{
                          width: `${
                            onSale.length === 0
                              ? 0
                              : Math.min(
                                  100,
                                  Math.round((gap.count / onSale.length) * 100)
                                )
                          }%`,
                        }}
                      />
                    </div>
                    <p className="hint">
                      {byKitchen.map((one, index) => (
                        <span key={one.id}>
                          <Link
                            href={`/admin/menu/${one.id}`}
                            className="font-semibold text-brand-dark"
                          >
                            {nameOf(one.id)}
                          </Link>{" "}
                          {one.count}
                          {index < byKitchen.length - 1 ? " · " : ""}
                        </span>
                      ))}
                    </p>
                    {/* The board draws an action in the tile. It goes to the
                        kitchen with the most of them missing, which is where
                        anybody doing this work would start. */}
                    {byKitchen[0] && (
                      <Link
                        href={`/admin/menu/${byKitchen[0].id}`}
                        className="btn-admin btn-admin-sm mt-2.5"
                      >
                        {gap.fix}
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
            {/* The brand's stripes, which the design system asks a page to
                carry somewhere. Decorative only, so it is hidden from a
                screen reader and dropped on a phone, where the width is
                worth more than the mark. */}
            <div
              aria-hidden
              className="hidden h-[150px] w-[112px] rounded-xl border-2 border-ink bg-[repeating-linear-gradient(-60deg,theme(colors.brand.DEFAULT)_0_7px,transparent_7px_16px)] lg:block"
            />
          </div>
        </Panel>
      )}

      <p className="hint mb-2.5">
        Up and down to reorder. This is the order a customer sees on the home page.
      </p>

      <ul className="mb-[18px] grid gap-3 lg:grid-cols-2">
        {list.map((restaurant, index) => (
          <li
            key={restaurant.id}
            className="card flex items-center gap-3 px-[15px] py-[13px]"
          >
            <Link
              href={`/admin/menu/${restaurant.id}`}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <span className="size-[46px] shrink-0 overflow-hidden rounded-[10px] border-[1.5px] border-line">
                <Thumb
                  src={restaurant.logo_url}
                  name={restaurant.name}
                  rounded="rounded-none"
                />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-base font-bold">
                  {restaurant.name}
                </span>
                <span className="hint block">
                  {countFor(restaurant.id)} item
                  {countFor(restaurant.id) === 1 ? "" : "s"} · closes{" "}
                  {restaurant.closes_at.slice(0, 5)}
                </span>
              </span>
            </Link>
            {/* The word as well as the colour. Green on its own is unreadable
                in sunlight, which is where this page gets opened. */}
            <span
              className={`tag shrink-0 ${
                restaurant.active ? "bg-mint-tint text-mint" : "bg-wash text-ink"
              }`}
            >
              {restaurant.active ? "on the site" : "off"}
            </span>
            <Reorder
              action={moveRestaurant}
              field="restaurant_id"
              id={restaurant.id}
              first={index === 0}
              last={index === list.length - 1}
              label={restaurant.name}
            />
          </li>
        ))}
      </ul>

      <form id="add" action={addRestaurant} className="card p-5">
        <h2 className="font-display text-[26px] font-black uppercase leading-none">
          Add a restaurant
        </h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="grow">
            <label className="label" htmlFor="new_name">Name</label>
            <input
              id="new_name"
              name="name"
              required
              placeholder="Chicken Republic"
              className="field"
            />
          </div>
          <div className="w-32">
            <label className="label" htmlFor="new_closes">Closes</label>
            <input
              id="new_closes"
              name="closes_at"
              type="time"
              defaultValue="21:00"
              className="field"
            />
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="new_address">Address</label>
            <input
              id="new_address"
              name="address"
              placeholder="Novare Mall, Sangotedo"
              className="field"
            />
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
            <p className="hint mt-1">
              {areas.length === 0
                ? "Add areas under Settings to put a restaurant further out."
                : "Decides what delivery costs from here, and whether a car of its own can go at all."}
            </p>
          </div>
        </div>
        <div className="mt-3.5">
          <SaveButton look="btn-admin-go">Add restaurant</SaveButton>
        </div>
      </form>
    </div>
  );
}
