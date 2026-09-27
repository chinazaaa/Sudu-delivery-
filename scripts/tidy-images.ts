/**
 * Delete the pictures nothing points at any more.
 *
 * Shrinking left every original where it was, on purpose: until somebody
 * has looked at the site, the old file is the way back. Once they have,
 * those originals are dead weight, along with whatever earlier rounds of
 * re-photographing left behind.
 *
 *   npx tsx scripts/tidy-images.ts              # say what it would delete
 *   npx tsx scripts/tidy-images.ts --go         # delete it
 *   npx tsx scripts/tidy-images.ts --go --all   # other folders too
 *
 * This is the one script here that destroys something, so it is built to
 * refuse rather than to guess.
 *
 * A picture counts as used if ANY row anywhere points at it, not only a
 * menu item. The bucket also holds counter logos, home page banners and
 * parcel photographs, and a tidy-up that only knew about menu items would
 * have taken every logo in the shop with it. Every column that can name a
 * file is read, and if any of those reads fails the whole run stops: a
 * reference list that came back short is indistinguishable from a file
 * nothing points at, and one of those two readings deletes the shop's
 * pictures.
 *
 * Only `items/` unless asked, because that is where the shrinking happened
 * and the rest is a handful of files somebody placed deliberately.
 *
 * Nothing newer than a day, so a file still being uploaded by another run
 * is never mistaken for one nobody wanted.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const BUCKET = "menu";

/** Every column anywhere that can name a file in this bucket. Miss one and
 *  this deletes pictures that are on the site right now. */
const POINTERS: { table: string; column: string }[] = [
  { table: "menu_items", column: "image_url" },
  { table: "boxes", column: "image_url" },
  { table: "occasions", column: "image_url" },
  { table: "slides", column: "image_url" },
  { table: "parcel_photos", column: "url" },
  { table: "restaurants", column: "logo_url" },
  { table: "restaurants", column: "banner_url" },
];

/** Left alone unless --all: this is where the shrinking happened. */
const FOLDER = "items/";

/** A file this new may be half way through being written by another run. */
const SETTLED_HOURS = 24;

/** If more than this share of the bucket looks unused, something is wrong
 *  with the reading rather than with the bucket. */
const TOO_MUCH = 0.6;

const DELETE_AT_ONCE = 100;

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
  return { url, key };
}

const args = process.argv.slice(2);
const go = args.includes("--go");
const everywhere = args.includes("--all");

const { url, key } = env();
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const said = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)}MB`
    : `${Math.round(bytes / 1024)}kB`;

const mark = `/object/public/${BUCKET}/`;

function pathOf(at: unknown): string {
  const said = typeof at === "string" ? at : "";
  const found = said.indexOf(mark);
  return found === -1 ? "" : decodeURIComponent(said.slice(found + mark.length));
}

/**
 * Every file any row points at.
 *
 * A failure here throws rather than returning what it managed to read. A
 * short list and a genuinely unused file look exactly alike from here, and
 * only one of those two readings is recoverable.
 */
async function used(): Promise<Set<string>> {
  const out = new Set<string>();

  for (const { table, column } of POINTERS) {
    const PAGE = 1000;
    let seen = 0;

    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db
        .from(table)
        .select(column)
        .range(from, from + PAGE - 1);
      if (error) {
        throw new Error(
          `Could not read ${table}.${column}: ${error.message}\n` +
            "Nothing has been deleted. Every one of these has to be readable " +
            "before anything can be called unused."
        );
      }

      const rows = (data ?? []) as unknown as Record<string, unknown>[];
      for (const row of rows) {
        const path = pathOf(row[column]);
        if (path !== "") out.add(path);
      }
      seen += rows.length;
      if (rows.length < PAGE) break;
    }
    console.log(`  read ${String(seen).padStart(5)} rows of ${table}.${column}`);
  }

  return out;
}

/** Everything in the bucket, walked folder by folder. */
async function inBucket(): Promise<{ path: string; size: number; at: string }[]> {
  const folders = everywhere ? ["items", "banners", "logos", "parcels"] : ["items"];
  const out: { path: string; size: number; at: string }[] = [];
  const PAGE = 1000;

  for (const folder of folders) {
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db.storage
        .from(BUCKET)
        .list(folder, { limit: PAGE, offset: from });
      if (error) throw new Error(`Could not list ${folder}: ${error.message}`);

      const files = data ?? [];
      for (const one of files) {
        const meta = (one.metadata ?? {}) as { size?: number };
        out.push({
          path: `${folder}/${one.name}`,
          size: Number(meta.size ?? 0),
          at: one.created_at ?? "",
        });
      }
      if (files.length < PAGE) break;
    }
  }
  return out;
}

async function main() {
  console.log("Reading what every table points at:");
  const keep = await used();
  console.log(`\n${keep.size} file${keep.size === 1 ? "" : "s"} are pointed at by something.`);

  if (keep.size === 0) {
    console.error(
      "\nNothing anywhere points at a single file in this bucket, which cannot\n" +
        "be true of a shop with pictures on it. Stopping rather than treating\n" +
        "every file in the bucket as rubbish."
    );
    process.exit(1);
  }

  const files = await inBucket();
  const settled = Date.now() - SETTLED_HOURS * 60 * 60 * 1000;

  const spare = files.filter((one) => {
    if (keep.has(one.path)) return false;
    if (!everywhere && !one.path.startsWith(FOLDER)) return false;
    const born = new Date(one.at).getTime();
    // No timestamp is not a reason to delete something.
    return Number.isFinite(born) ? born < settled : false;
  });

  const weight = spare.reduce((total, one) => total + one.size, 0);
  const young = files.filter((one) => {
    const born = new Date(one.at).getTime();
    return !keep.has(one.path) && (!Number.isFinite(born) || born >= settled);
  }).length;

  console.log(
    `${files.length} file${files.length === 1 ? "" : "s"} in ${
      everywhere ? "the bucket" : FOLDER
    }, of which ${spare.length} are pointed at by nothing: ${said(weight)}.`
  );
  if (young > 0) {
    console.log(
      `${young} more look unused but are less than ${SETTLED_HOURS}h old, so they are left ` +
        "in case something is still writing them."
    );
  }

  if (spare.length === 0) return;

  // The last guard. If most of the bucket looks unused, the likelier story
  // is that this script read the tables wrongly than that the shop is made
  // of rubbish, and deleting on that reading cannot be undone.
  if (spare.length > files.length * TOO_MUCH) {
    console.error(
      `\n${Math.round((spare.length / files.length) * 100)}% of the files here look unused.\n` +
        "That is more likely to be this script reading the tables wrongly than\n" +
        "the shop being mostly rubbish, so nothing has been deleted. Check what\n" +
        "points at these pictures before forcing it."
    );
    process.exit(1);
  }

  console.log("\nA few of them:");
  for (const one of [...spare].sort((a, b) => b.size - a.size).slice(0, 8)) {
    console.log(`  ${said(one.size).padStart(7)}  ${one.path}`);
  }

  if (!go) {
    console.log("\nThis was a dry run. Nothing was deleted.");
    console.log("Run it again with --go to delete them. That cannot be undone.");
    return;
  }

  console.log("");
  let gone = 0;
  for (let at = 0; at < spare.length; at += DELETE_AT_ONCE) {
    const batch = spare.slice(at, at + DELETE_AT_ONCE);
    const { error } = await db.storage.from(BUCKET).remove(batch.map((one) => one.path));
    if (error) {
      console.error(`  FAIL on a batch of ${batch.length}: ${error.message}`);
      continue;
    }
    gone += batch.length;
    console.log(`  … ${Math.min(at + DELETE_AT_ONCE, spare.length)}/${spare.length}`);
  }

  console.log(`\nDone. ${gone} file${gone === 1 ? "" : "s"} deleted, ${said(weight)} freed.`);
}

main().catch((problem) => {
  console.error(`\n${problem instanceof Error ? problem.message : problem}`);
  process.exit(1);
});
