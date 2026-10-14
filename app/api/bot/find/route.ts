import { NextResponse } from "next/server";

import { menuView, menuViewFor } from "@/lib/menu";
import type { ItemView } from "@/lib/view";
import {
  countedInName,
  find,
  howMany,
  namedIn,
  nearlyNamed,
  wantsAPerson,
  without,
} from "@/lib/bot-match";

export const dynamic = "force-dynamic";

/**
 * What somebody meant, searched against one kitchen's menu.
 *
 * On the server because the menu is thousands of rows and because the
 * matching has to agree with what the till will charge. The browser sends
 * a sentence and gets back a few things to tap, which is all it needs to
 * know.
 *
 * Every dish carries its own choices as words to match on, so somebody who
 * types "extravaganza" finds the half and half that offers it as a half,
 * and somebody who types "large" is not sent to a pizza called Large.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { kitchen?: unknown; said?: unknown };
    const kitchen = String(body.kitchen ?? "");
    const said = String(body.said ?? "").slice(0, 300);
    if (said.trim() === "") {
      return NextResponse.json({ how: "lost", hits: [], qty: 1, person: false, instead: [] });
    }

    if (wantsAPerson(said)) {
      return NextResponse.json({ how: "person", hits: [], qty: 1, person: true, instead: [] });
    }

    /*
     * Across every counter unless somebody has already named one.
     *
     * Asking "which kitchen" first is a wall of fourteen buttons, and
     * fourteen becomes twenty. It is also the wrong question: nobody
     * arrives wanting a restaurant, they arrive wanting wings, and the
     * kitchen is the answer rather than the question. So the search runs
     * over the lot and the chips say "Chicken wings · KFC", which settles
     * both in one tap.
     */
    const shops = kitchen === ""
      ? await menuView()
      : await menuViewFor(kitchen).then((one) => (one ? [one] : []));
    if (shops.length === 0) {
      return NextResponse.json({ how: "lost", hits: [], qty: 1, person: false, instead: [] });
    }

    const whose = new Map<string, { id: string; name: string }>();
    /** Every shelf on every counter in play, for a word like "pizza". */
    const shelves: { id: string; name: string; shop: string }[] = [];
    const sellable: ItemView[] = [];
    for (const shop of shops) {
      for (const shelf of shop.categories) {
        shelves.push({ id: shelf.id, name: shelf.name, shop: shop.restaurant.id });
      }
      for (const item of shop.items) {
        if (!item.available) continue;
        sellable.push(item);
        whose.set(item.id, { id: shop.restaurant.id, name: shop.restaurant.name });
      }
    }
    /*
     * "Domino's and KFC" is a sentence about where, not about what. Asked
     * for two counters and no food, the honest answer is to take them one
     * at a time rather than to search a menu for the word Domino.
     */
    const named = namedIn(
      said,
      shops.map((shop) => ({ id: shop.restaurant.id, name: shop.restaurant.name }))
    );

    /*
     * A counter named alongside the food scopes the search to it.
     *
     * "Domino's half and half bbq chicken" names a counter and a dish, and
     * searched across every menu it found a half chicken at Jay's Diner
     * and a half and half at Dodo and not the one actually asked for. The
     * counter is the most certain thing in that sentence, so it is used
     * as what it is: a filter, not another word to score.
     */
    const only = kitchen === "" && named.length > 0 ? new Set(named.map((one) => one.id)) : null;
    const looking = only
      ? sellable.filter((item) => only.has(whose.get(item.id)?.id ?? ""))
      : sellable;

    const found = find(
      only ? without(said, named) : said,
      looking.map((item) => ({
        id: item.id,
        name: item.name,
        also: [
          item.description ?? "",
          // The counter it comes from, so "kfc" on its own finds what KFC
          // has. Left out once the counter is already doing the filtering,
          // where it would only flatter every dish on that menu equally.
          only ? "" : (whose.get(item.id)?.name ?? ""),
          // The names of its own choices, so a flavour that only exists as
          // an option is still something somebody can ask for by name.
          ...item.groups.flatMap((group) =>
            group.options.filter((one) => one.available).map((one) => one.name)
          ),
        ],
      }))
    );

    // Only where nothing on any menu answers it better. "KFC wings" is a
    // dish and should stay one; "KFC and Domino's" is a pair of counters.
    if (named.length > 0 && found.how === "lost") {
      return NextResponse.json({
        how: "kitchens",
        qty: 1,
        person: false,
        hits: [],
        instead: [],
        shops: named,
      });
    }

    /*
     * Nearly a counter, which is a question rather than a failure.
     *
     * "Chiken Republik" is not a counter by the strict reading and is
     * obviously one to a person. Asking beats shrugging, and it is a tap.
     */
    if (found.how === "lost") {
      const nearly = nearlyNamed(
        said,
        shops.map((shop) => ({ id: shop.restaurant.id, name: shop.restaurant.name }))
      );
      if (nearly.length > 0) {
        return NextResponse.json({
          how: "maybe-kitchens",
          qty: 1,
          person: false,
          hits: [],
          instead: [],
          shops: nearly.slice(0, 4),
        });
      }
    }

    /*
     * A shelf that answers it, worked out before anything is decided.
     *
     * "Small chops" is four dishes at one counter and the name of a whole
     * shelf at another. Deciding on the dishes alone sends everybody to
     * the first counter; deciding on the shelf alone hides the second. So
     * both are known before either is used.
     */
    const shelfMine = only ? shelves.filter((one) => only.has(one.shop)) : shelves;
    const shelfHit = find(only ? without(said, named) : said, shelfMine, 1).hits[0] ?? null;
    const shelfShop = shelfHit
      ? (shelfMine.find((one) => one.id === shelfHit.id)?.shop ?? "")
      : "";
    const onShelf =
      shelfHit && shelfHit.score >= 0.5
        ? looking.filter((item) => item.categoryId === shelfHit.id)
        : [];

    /*
     * The same thing on four counters.
     *
     * Nearly everybody sells chicken. Asked for one across the whole
     * shop, the honest first question is where from, because the answer
     * changes the price, the menu and what the choices will be. Asked at
     * one counter, it is not a question at all.
     */
    /*
     * A counter that is a shelf.
     *
     * Uncle Stan's whole business is small chops: they have a shelf
     * called exactly that and fifteen things on it. Burger King has four
     * dishes with the words in their names, filed under Sides. Asking
     * "where from" there is asking somebody to choose between the shop
     * that does the thing and a shop that also does it, which is a
     * question with an obvious answer and no reason to have been put.
     *
     * So a shelf named exactly what was asked for wins outright. Nothing
     * here knows what small chops are: it knows that one counter has
     * filed a shelf under those words, and that is the strongest thing
     * anybody has said on the subject.
     */
    const exactShelf =
      shelfHit && shelfHit.score >= 0.97 && onShelf.length > 1
        ? shops.find((one) => one.restaurant.id === shelfShop)?.restaurant ?? null
        : null;

    if (!only && !exactShelf && found.how !== "sure") {
      const where: { id: string; name: string }[] = [];
      const add = (shop: { id: string; name: string } | undefined) => {
        if (shop && !where.some((one) => one.id === shop.id)) where.push(shop);
      };
      for (const hit of found.hits) add(whose.get(hit.id));
      // A counter whose whole shelf is called this is as much an answer as
      // a counter with four dishes called it.
      if (onShelf.length > 1 && shelfShop !== "") {
        add(shops.find((one) => one.restaurant.id === shelfShop)?.restaurant);
      }
      if (where.length > 1) {
        return NextResponse.json({
          how: "where",
          qty: howMany(said),
          person: false,
          hits: [],
          instead: [],
          shops: where.slice(0, 6),
        });
      }
    }

    /*
     * A word that is a shelf rather than a dish.
     *
     * "2 medium pizza from Domino's" is not a dish on any menu, and
     * matched as one it finds a Pizza Sauce Calzone and a plate of rice,
     * because those are the only names with the word in them. It is a
     * kind of thing, and the shop already files its menu by kind, so the
     * honest answer is the question: which pizza?
     *
     * Only where nothing was a better answer, so "pepperoni pizza" still
     * goes straight to the pepperoni.
     */
    if (found.how !== "sure" && shelfHit) {
      {
        const on = onShelf;
        if (on.length > 1) {
          return NextResponse.json({
            how: "shelf",
            shelf: shelfHit.name,
            qty: howMany(said),
            person: false,
            hits: [],
            instead: on.slice(0, 12).map((item) => ({
              id: item.id,
              name: item.name,
              shop: whose.get(item.id)?.name ?? "",
            })),
            shops: [],
          });
        }
      }
    }

    const byId = new Map(sellable.map((item) => [item.id, item]));

    return NextResponse.json({
      how: found.how,
      // Per hit, because a number that is part of a dish's own name is the
      // dish rather than the quantity.
      qty: howMany(said),
      person: false,
      hits: found.hits.map((hit) => {
        const item = byId.get(hit.id);
        const asked = howMany(said);
        return {
          id: hit.id,
          name: hit.name,
          qty: countedInName(hit.name, asked) ? 1 : asked,
          shop: whose.get(hit.id) ?? { id: "", name: "" },
          price: item?.price ?? 0,
          score: Math.round(hit.score * 100) / 100,
          // What it will ask before it can be priced, in the order the menu
          // asks it. The chat walks these one at a time.
          groups: (item?.groups ?? [])
            .filter((group) => group.options.some((one) => one.available))
            .map((group) => ({
              id: group.id,
              name: group.name,
              required: group.required,
              dearest: group.dearest === true,
              options: group.options
                .filter((one) => one.available)
                .map((one) => ({ id: one.id, name: one.name })),
            })),
        };
      }),
      // When nothing matched, the kitchen's own list beats the door marked
      // WhatsApp: being unable to read one sentence is not a reason to
      // throw somebody out of the shop.
      instead:
        found.how === "lost"
          ? (only ? looking : sellable).slice(0, 8).map((item) => ({
              id: item.id,
              name: item.name,
              shop: whose.get(item.id)?.name ?? "",
            }))
          : [],
    });
  } catch {
    return NextResponse.json({ how: "lost", hits: [], qty: 1, person: false, instead: [] });
  }
}
