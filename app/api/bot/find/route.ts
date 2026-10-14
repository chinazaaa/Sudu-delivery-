import { NextResponse } from "next/server";

import { menuViewFor } from "@/lib/menu";
import type { ItemView } from "@/lib/view";
import { find, wantsAPerson, howMany } from "@/lib/bot-match";

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
    if (kitchen === "" || said.trim() === "") {
      return NextResponse.json({ how: "lost", hits: [], qty: 1, person: false });
    }

    if (wantsAPerson(said)) {
      return NextResponse.json({ how: "person", hits: [], qty: 1, person: true });
    }

    const shop = await menuViewFor(kitchen);
    if (!shop) return NextResponse.json({ how: "lost", hits: [], qty: 1, person: false });

    const sellable: ItemView[] = shop.items.filter((item) => item.available);
    const found = find(
      said,
      sellable.map((item) => ({
        id: item.id,
        name: item.name,
        also: [
          item.description ?? "",
          // The names of its own choices, so a flavour that only exists as
          // an option is still something somebody can ask for by name.
          ...item.groups.flatMap((group) =>
            group.options.filter((one) => one.available).map((one) => one.name)
          ),
        ],
      }))
    );

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
          ? sellable.slice(0, 8).map((item) => ({ id: item.id, name: item.name }))
          : [],
    });
  } catch {
    return NextResponse.json({ how: "lost", hits: [], qty: 1, person: false, instead: [] });
  }
}
