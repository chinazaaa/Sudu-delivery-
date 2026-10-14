import { NextResponse } from "next/server";

import { menuView, menuViewFor } from "@/lib/menu";
import type { ItemView } from "@/lib/view";
import { find, namedIn, wantsAPerson, howMany } from "@/lib/bot-match";

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
    const sellable: ItemView[] = [];
    for (const shop of shops) {
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

    const found = find(
      said,
      sellable.map((item) => ({
        id: item.id,
        name: item.name,
        also: [
          item.description ?? "",
          // The counter it comes from, so "kfc" finds everything at KFC and
          // "kfc wings" finds the wings there rather than the ones next door.
          whose.get(item.id)?.name ?? "",
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
    if (named.length > 0 && (found.how === "lost" || (found.hits[0]?.score ?? 0) < 0.55)) {
      return NextResponse.json({
        how: "kitchens",
        qty: 1,
        person: false,
        hits: [],
        instead: [],
        shops: named,
      });
    }

    const byId = new Map(sellable.map((item) => [item.id, item]));

    return NextResponse.json({
      how: found.how,
      qty: howMany(said),
      person: false,
      hits: found.hits.map((hit) => {
        const item = byId.get(hit.id);
        return {
          id: hit.id,
          name: hit.name,
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
          ? sellable.slice(0, 8).map((item) => ({
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
