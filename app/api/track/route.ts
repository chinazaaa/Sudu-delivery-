import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** Nothing here is worth a slow page, let alone a failed one. */
const ok = () => new NextResponse(null, { status: 204 });

/**
 * One page view, recorded and forgotten.
 *
 * It answers 204 whatever happens: a missing table, a full disk, somebody
 * posting nonsense. A shop that cannot sell because its counter broke is a
 * worse shop than one that does not know how many people walked past.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      path?: unknown;
      visitor?: unknown;
      referrer?: unknown;
    };

    const path = String(body.path ?? "").slice(0, 200);
    const visitor = String(body.visitor ?? "").slice(0, 64);
    const referrer = String(body.referrer ?? "").slice(0, 200);

    // Admin and the promoter portal are us, not customers.
    if (!path.startsWith("/") || path.startsWith("/admin") || path.startsWith("/promoter")) {
      return ok();
    }
    if (visitor.length < 8) return ok();

    await db().from("page_views").insert({ path, visitor, referrer });
  } catch {
    /* Counting is the least important thing this server does. */
  }
  return ok();
}
