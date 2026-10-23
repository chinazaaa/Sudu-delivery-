import { NextResponse } from "next/server";

import { menuView } from "@/lib/menu";

export const dynamic = "force-dynamic";

/**
 * One dish's choices: its sizes, its flavours, its extras.
 *
 * Asked for when somebody taps the dish rather than sent with the page.
 * The front page carries a thousand dishes so its search box can read
 * them, and the choices under those dishes are nearly four thousand rows
 * more: the larger half of a megabyte that every visitor downloaded and
 * almost none of them opened. One dish's worth is a few hundred bytes and
 * it is fetched in the time the sheet takes to slide up.
 *
 * Off the same cached menu every other page reads, so a choice added in
 * admin appears here exactly when it appears everywhere else.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;

  const menu = await menuView();
  for (const place of menu) {
    const item = place.items.find((one) => one.id === itemId);
    // An empty list is the honest answer for a dish with no choices, and
    // the same answer for a dish that is no longer on the menu: either way
    // there is nothing to pick.
    if (item) return NextResponse.json({ groups: item.groups });
  }

  return NextResponse.json({ groups: [] });
}
