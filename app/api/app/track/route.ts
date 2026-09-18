import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const ok = () => new NextResponse(null, { status: 204 });

/**
 * One screen in the app, counted the same way a page on the website is.
 *
 * It writes to the same table, so the pages list in analytics is the whole
 * shop rather than the half of it that happens to be a browser. What keeps
 * them apart is the source: the app names itself there, so the sources card
 * answers "how much of this is the app" without a column being added to a
 * live database to ask it.
 *
 * The app does not get to choose that label. It says which platform it is and
 * the server writes the wording, so an old build on somebody's phone cannot
 * put a stray string into the one card that has to be readable.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      path?: unknown;
      visitor?: unknown;
      platform?: unknown;
    };

    const path = String(body.path ?? "").slice(0, 200);
    const visitor = String(body.visitor ?? "").slice(0, 64);
    const platform = String(body.platform ?? "").toLowerCase();

    if (!path.startsWith("/")) return ok();
    if (visitor.length < 8) return ok();

    await db().from("page_views").insert({
      path,
      visitor,
      referrer:
        platform === "ios"
          ? "Sudu app, iPhone"
          : platform === "android"
            ? "Sudu app, Android"
            : "Sudu app",
    });
  } catch {
    /* Counting is the least important thing this server does. */
  }
  return ok();
}
