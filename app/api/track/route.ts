import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { tidyChannel } from "@/lib/came-from";

export const dynamic = "force-dynamic";

/** Nothing here is worth a slow page, let alone a failed one. */
const ok = () => new NextResponse(null, { status: 204 });

/**
 * Something walking the site rather than shopping on it.
 *
 * Search engines run JavaScript now, so a crawler fires this the same as a
 * person does, with a clean browser every time: one view, one brand new id,
 * counted as one more person who looked. Four thousand of those in a week
 * against eight orders is not a shop with a conversion problem, it is a
 * shop counting robots.
 *
 * Only the ones that say what they are. Anything pretending to be a phone
 * is indistinguishable from a phone, and guessing harder would start
 * throwing away students.
 */
const ROBOTS =
  /bot|crawler|crawling|spider|slurp|headless|phantom|puppeteer|playwright|lighthouse|pagespeed|monitor|uptime|preview|facebookexternalhit|embedly|quora link preview|whatsapp|telegram|curl|wget|python-requests|httpx|axios|node-fetch|go-http-client|java\/|okhttp|scrapy|ahrefs|semrush|dataforseo|mj12|dotbot|petal|yandex|bytespider|gptbot|claudebot|ccbot|perplexity|applebot/i;

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
      cameFrom?: unknown;
    };

    const path = String(body.path ?? "").slice(0, 200);
    const visitor = String(body.visitor ?? "").slice(0, 64);
    const referrer = String(body.referrer ?? "").slice(0, 200);
    // Tidied here as well as in the browser, because the browser is not the
    // one that has to live with the column afterwards.
    const cameFrom = tidyChannel(String(body.cameFrom ?? ""));

    // Admin and the promoter portal are us, not customers.
    if (!path.startsWith("/") || path.startsWith("/admin") || path.startsWith("/promoter")) {
      return ok();
    }

    const agent = request.headers.get("user-agent") ?? "";
    if (agent === "" || ROBOTS.test(agent)) return ok();
    if (visitor.length < 8) return ok();

    const { error } = await db()
      .from("page_views")
      .insert({ path, visitor, referrer, came_from: cameFrom });
    // A shop that has not run the migration yet still counts its visits.
    if (error) await db().from("page_views").insert({ path, visitor, referrer });
  } catch {
    /* Counting is the least important thing this server does. */
  }
  return ok();
}
