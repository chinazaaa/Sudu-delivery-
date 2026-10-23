import { NextResponse } from "next/server";

import { isSignedIn } from "@/lib/admin-auth";
import { catalogueSearch } from "@/lib/box-admin";

export const dynamic = "force-dynamic";

/**
 * The few dishes somebody is typing at, for the picker on an order.
 *
 * The order page used to be handed the whole shop so this box could be
 * searched in the browser: two thousand dishes, ten paged round trips for
 * their choices, and all of it serialised into a page somebody opened to
 * read a phone number. Opening an order felt like nothing had happened,
 * and the picker it paid for is used on perhaps one order in twenty.
 *
 * So the cost is paid by whoever actually typed something. The same
 * matching rule, kept on the server where the rows are.
 */
export async function GET(request: Request): Promise<NextResponse> {
  if (!(await isSignedIn())) {
    return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  }

  const asked = new URL(request.url).searchParams;
  const query = (asked.get("q") ?? "").slice(0, 120);
  if (query.trim().length < 2) return NextResponse.json({ found: [] });

  try {
    return NextResponse.json({ found: await catalogueSearch(query, 8) });
  } catch {
    // An empty picker is a picker that found nothing, which is what the
    // browser already knows how to show.
    return NextResponse.json({ found: [] });
  }
}
