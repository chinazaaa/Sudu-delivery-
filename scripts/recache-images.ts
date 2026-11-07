/**
 * Tell the CDN to keep the menu's photographs for a year, not an hour.
 *
 * Every picture in the shop is served straight from Supabase Storage to
 * every visitor's browser, and almost all of them go out with
 * `cache-control: max-age=3600`. An hour. So the same student opening the
 * shop twice in an afternoon downloads the same four hundred kilobytes of
 * photographs twice, and so does every edge of the CDN, and the bill is
 * three hundred and sixty megabytes of distinct images served out thirty
 * times over. That is what put this project past its egress allowance and
 * took the whole shop down with a 402.
 *
 * Uploads have set a year since the fault was found, so anything added
 * since is fine. Everything older is not, and the backfill that was
 * supposed to fix it was done in SQL: `storage.objects.metadata` was
 * updated to say a year, which changes what the database reports and
 * nothing about what Supabase actually serves. The header is set when the
 * object is written, so the only way to change it is to write the object
 * again.
 *
 * That is all this does: for each picture whose served header is still an
 * hour, fetch it and put it back at the same path with a year on it. The
 * bytes do not change and neither does the address, so nothing on the site
 * moves.
 *
 *   npx tsx scripts/recache-images.ts                 # say what it would do
 *   npx tsx scripts/recache-images.ts --go            # actually do it
 *   npx tsx scripts/recache-images.ts --go --limit 50 # a few first
 *   npx tsx scripts/recache-images.ts --bucket menu
 *
 * It is safe to stop and safe to run again. Each picture is checked before
 * it is touched, so a second run skips everything the first one finished
 * and costs one cheap request each for the rest. An interrupted run leaves
 * finished pictures finished and the others exactly as they were.
 *
 * Needs the same two variables the site needs, which .env.local already has:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

/** A year, which is what an upload has set since the fault was found. */
const A_YEAR = "31536000";

/** How many at once. Enough to get through four thousand pictures in a few
 *  minutes, few enough not to be the reason storage has a bad afternoon. */
const AT_ONCE = 6;

/** Supabase lists a page at a time, and this bucket holds thousands. */
const PAGE = 100;

function env(): { url: string; key: string } {
  for (const file of [".env.local", ".env"]) {
    try {
      for (const line of readFileSync(file, "utf8").split("\n")) {
        const found = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (found && !process.env[found[1]]) {
          process.env[found[1]] = found[2].replace(/^["']|["']$/g, "");
        }
      }
    } catch {
      // Not there, which is fine if the variables are already in the shell.
    }
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) {
    console.error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or run this\n" +
        "from the project root where .env.local has them."
    );
    process.exit(1);
  }
  return { url: url.replace(/\/+$/, ""), key };
}

const args = process.argv.slice(2);
const has = (flag: string) => args.includes(flag);
const valueOf = (flag: string) => {
  const at = args.indexOf(flag);
  return at === -1 ? "" : (args[at + 1] ?? "");
};

const GO = has("--go");
const BUCKET = valueOf("--bucket") || "menu";
const LIMIT = Number(valueOf("--limit") || 0);

const { url, key } = env();
const db = createClient(url, key, { auth: { persistSession: false } });

/** Every object in the bucket, walking the folders it has. */
async function everyPath(prefix = ""): Promise<string[]> {
  const out: string[] = [];
  for (let page = 0; ; page++) {
    const { data, error } = await db.storage
      .from(BUCKET)
      .list(prefix, { limit: PAGE, offset: page * PAGE });
    if (error) throw new Error(`Could not list ${prefix || "/"}: ${error.message}`);

    const rows = data ?? [];
    for (const row of rows) {
      const path = prefix ? `${prefix}/${row.name}` : row.name;
      // A folder comes back with no id. Anything else is a file.
      if (row.id === null || row.id === undefined) out.push(...(await everyPath(path)));
      else out.push(path);
    }
    if (rows.length < PAGE) break;
  }
  return out;
}

const publicUrl = (path: string) =>
  `${url}/storage/v1/object/public/${BUCKET}/${encodeURI(path)}`;

/**
 * What the CDN is telling browsers about this picture today.
 *
 * Asked with a one byte range so the check costs a request rather than a
 * download: four thousand full fetches to find out which ones need fixing
 * would be the same egress problem again, in a script written to fix it.
 */
async function servedYear(path: string): Promise<boolean> {
  try {
    const answer = await fetch(publicUrl(path), { headers: { Range: "bytes=0-0" } });
    const said = answer.headers.get("cache-control") ?? "";
    return said.includes(A_YEAR);
  } catch {
    // Cannot tell, so treat it as needing the fix: writing a good header
    // over a good header costs one upload and changes nothing.
    return false;
  }
}

/** Put the picture back where it is, with a year on it. */
async function keepForAYear(path: string): Promise<void> {
  const got = await fetch(publicUrl(path));
  if (!got.ok) throw new Error(`fetch ${got.status}`);

  const body = Buffer.from(await got.arrayBuffer());
  if (body.length === 0) throw new Error("empty");

  const { error } = await db.storage.from(BUCKET).upload(path, body, {
    contentType: got.headers.get("content-type") || "application/octet-stream",
    cacheControl: A_YEAR,
    // The same path on purpose: the address is in thousands of menu rows
    // and must not move.
    upsert: true,
  });
  if (error) throw new Error(error.message);
}

async function main(): Promise<void> {
  console.log(`Reading ${BUCKET}…`);
  const paths = await everyPath();
  console.log(`${paths.length} files.`);

  console.log("Checking which are still on an hour…");
  const stale: string[] = [];
  for (let at = 0; at < paths.length; at += AT_ONCE) {
    const batch = paths.slice(at, at + AT_ONCE);
    const answers = await Promise.all(batch.map(servedYear));
    batch.forEach((path, index) => {
      if (!answers[index]) stale.push(path);
    });
    if (at % 600 === 0 && at > 0) console.log(`  ${at} of ${paths.length}…`);
  }

  const todo = LIMIT > 0 ? stale.slice(0, LIMIT) : stale;
  console.log(
    `${stale.length} of ${paths.length} are still on a short cache` +
      (LIMIT > 0 ? `, doing ${todo.length}` : "")
  );

  if (!GO) {
    console.log("\nNothing was changed. Run it again with --go to do it.");
    for (const path of todo.slice(0, 10)) console.log(`  would fix ${path}`);
    if (todo.length > 10) console.log(`  …and ${todo.length - 10} more`);
    return;
  }

  let done = 0;
  let failed = 0;
  for (let at = 0; at < todo.length; at += AT_ONCE) {
    const batch = todo.slice(at, at + AT_ONCE);
    await Promise.all(
      batch.map(async (path) => {
        try {
          await keepForAYear(path);
          done++;
        } catch (why) {
          failed++;
          console.error(`  ${path}: ${(why as Error).message}`);
        }
      })
    );
    console.log(`  ${done + failed} of ${todo.length}…`);
  }

  console.log(`\nDone. ${done} fixed, ${failed} failed.`);
  if (failed > 0) console.log("Run it again to retry the ones that failed.");
}

main().catch((why) => {
  console.error(why);
  process.exit(1);
});
