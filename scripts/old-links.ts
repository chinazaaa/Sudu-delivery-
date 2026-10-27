/**
 * Write the map of old uuid addresses to the names they answer to now.
 *
 * Run before every build, so `lib/old-links.ts` arrives filled in and
 * `middleware.ts` can forward an old link without asking the database
 * anything at request time.
 *
 * It is generated rather than committed because a hundred and twenty
 * kilobytes of uuids is not something anybody should have to read in a diff,
 * and because the shop is the only thing that actually knows the answer.
 *
 * Never fatal. A build that cannot reach the database writes nothing and
 * leaves the committed empty map in place: no forwarding, the pages behave
 * exactly as they did, and the canonical tags go on consolidating by
 * themselves. A shop that will not deploy is a worse outcome than one whose
 * old links are a little slower to settle.
 *
 *   npx tsx scripts/old-links.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { createClient } from "@supabase/supabase-js";

const OUT = join(process.cwd(), "lib", "old-links.ts");

/** The most rows one request comes back with, whatever it was asked for. */
const PAGE = 1000;

const HEAD = `/**
 * The addresses that were sent before the names existed. GENERATED FILE.
 *
 * Written by scripts/old-links.ts before each build and read by
 * middleware.ts, which forwards an old uuid to the name its page answers to
 * now. Do not edit by hand: the next build will write over it.
 *
 * Empty means the build could not reach the shop, which is a safe way to be
 * wrong: nothing is forwarded and every page behaves exactly as it would
 * have anyway.
 */

`;

function write(items: Record<string, string>, places: Record<string, string>): void {
  const say = (rows: Record<string, string>) =>
    Object.entries(rows)
      .map(([from, to]) => `  ${JSON.stringify(from)}: ${JSON.stringify(to)},`)
      .join("\n");

  writeFileSync(
    OUT,
    `${HEAD}/** A dish's old uuid to the name its page answers to now. */
export const OLD_ITEM_LINKS: Record<string, string> = {
${say(items)}
};

/** The same for the counters. */
export const OLD_PLACE_LINKS: Record<string, string> = {
${say(places)}
};
`,
    "utf8"
  );
}

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) {
    console.log("old-links: no database to ask, leaving the map as it is.");
    return;
  }

  const db = createClient(url, key, { auth: { persistSession: false } });

  // Every row, rather than the first thousand. The menu is past that, and a
  // map that stops in the middle of the alphabet forwards half the links
  // and silently drops the rest.
  const items: Record<string, string> = {};
  for (let at = 0; ; at += PAGE) {
    const { data, error } = await db
      .from("menu_items")
      .select("id, slug")
      .not("slug", "is", null)
      .order("id")
      .range(at, at + PAGE - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as { id: string; slug: string }[];
    for (const one of batch) items[one.id] = one.slug;
    if (batch.length < PAGE) break;
  }

  const places: Record<string, string> = {};
  {
    const { data, error } = await db
      .from("restaurants")
      .select("id, slug")
      .not("slug", "is", null);
    if (error) throw new Error(error.message);
    for (const one of (data ?? []) as { id: string; slug: string }[]) {
      places[one.id] = one.slug;
    }
  }

  write(items, places);
  console.log(
    `old-links: ${Object.keys(items).length} dishes, ${Object.keys(places).length} counters.`
  );
}

main().catch((reason: unknown) => {
  // Said out loud and then let go. See the note at the top: the committed
  // empty map is the fallback, and it is a working one.
  console.log(`old-links: could not build the map, leaving it empty. ${String(reason)}`);
});
